// =============================================================================
// КОНЦЕПТ АНАЛИТИКИ ДОХОДА КУРЬЕРА (v13.12.1) — ЛОГИКА И СОСТОЯНИЕ (script.js)
// Оптимизированная и модульная версия с гранулярным рендерингом и кэшированием
// =============================================================================

'use strict';

// -----------------------------------------------------------------------------
// 1. ХЕЛПЕРЫ И ДОСТУП К DOM
// -----------------------------------------------------------------------------

const $ = id => document.getElementById(id);

/**
 * Кэш часто используемых статических элементов DOM для минимизации layout thrashing
 */
const dom = {
  allTimeHourlyProfit:      $('allTimeHourlyProfit'),
  goalsStatusLabel:         $('goalsStatusLabel'),
  switchGrossNet:           $('switchGrossNet'),
  switchSumHourly:          $('switchSumHourly'),
  switchChartTable:         $('switchChartTable'),
  lblGross:                 $('lblGross'),
  lblNet:                   $('lblNet'),
  lblSum:                   $('lblSum'),
  lblHourly:                $('lblHourly'),
  lblChart:                 $('lblChart'),
  lblTable:                 $('lblTable'),
  block1Title:              $('block1Title'),
  chartViewContainer:       $('chartViewContainer'),
  tableViewContainer:       $('tableViewContainer'),
  barChartCanvas:           $('barChartCanvas'),
  selectedBarDetails:       $('selectedBarDetails'),
  detailedTableHead:        $('detailedTableHead'),
  detailedTableBody:        $('detailedTableBody'),
  detailedTableFoot:        $('detailedTableFoot'),
  legendGoalsItem:          $('legendGoalsItem'),
  legendGrossBg:            $('legendGrossBg'),
  legValOrders:             $('legValOrders'),
  legValSurge:              $('legValSurge'),
  legValRating:             $('legValRating'),
  legValBonuses:            $('legValBonuses'),
  legValGoals:              $('legValGoals'),
  legValTips:               $('legValTips'),
  btnWeather:               $('btnWeather'),
  heatUnitSwitchContainer:  $('heatUnitSwitchContainer'),
  btnDistrictSeasonContainer: $('btnDistrictSeasonContainer'),
  lblUnitPct:               $('lblUnitPct'),
  lblUnitRub:               $('lblUnitRub'),
  block2Title:              $('block2Title'),
  currentDistrictSeasonSub: $('currentDistrictSeasonSub'),
  heatmapTableBody:         $('heatmapTableBody'),
  selectedSlotsCounter:     $('selectedSlotsCounter'),
  btnClearSlots:            $('btnClearSlots'),
  plannedProfitEstimate:    $('plannedProfitEstimate'),
  planningActionContainer:  $('planningActionContainer'),
  districtListUnitHint:     $('districtListUnitHint'),
  districtListContainer:    $('districtListContainer'),
  compareTableHead:         $('compareTableHead'),
  compareTableBody:         $('compareTableBody'),
  compareTableFoot:         $('compareTableFoot'),
  chkIncludeGoals:          $('chkIncludeGoals'),
  totalWeeklyExpenseBadge:  $('totalWeeklyExpenseBadge'),
  expenseSlidersContainer:  $('expenseSlidersContainer'),
  addExpenseForm:           $('addExpenseForm'),
  newExpenseNameInput:      $('newExpenseNameInput'),
  reorderableColumnsList:   $('reorderableColumnsList'),
  realMapModal:             $('realMapModal'),
  mapSelectedDistrictName:  $('mapSelectedDistrictName'),
  planSlotsModal:           $('planSlotsModal'),
  planModalTransport:       $('planModalTransport'),
  planModalDistrict:        $('planModalDistrict'),
  planModalTotal:           $('planModalTotal'),
  planModalAvg:             $('planModalAvg'),
  planModalSlotsList:       $('planModalSlotsList'),
  forecastInfoModal:        $('forecastInfoModal'),
  toastBox:                 $('toastBox'),
  toastText:                $('toastText'),
  btnColorTheme:            $('btnColorTheme'),
  btnLayoutMode:            $('btnLayoutMode'),
  lblLayoutMode:            $('lblLayoutMode'),
  lblLayoutIcon:            $('lblLayoutIcon'),
  userDataFileInput:        $('userDataFileInput'),
  btnImportData:            $('btnImportData'),
  btnResetData:             $('btnResetData'),
  dataStatusBadge:          $('dataStatusBadge'),
  topBannerContainer:       $('topBannerContainer'),
  layoutContainer:          $('layoutContainer'),
  screenMain:               $('screenMain'),
  screenMiddleSpec:         $('screenMiddleSpec'),
  screenSettings:           $('screenSettings')
};

/**
 * Защита от XSS при вставке пользовательских строк (напр. названий расходов)
 */
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Форматирование чисел с разделением тысяч пробелом (15 240)
 */
function formatNum(n) {
  return Math.round(Number(n || 0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Компактный формат для диаграмм (14.2к / 500 / -12.5к)
 */
function formatCompact(n) {
  const num = Number(n || 0);
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  if (abs >= 10000) {
    return sign + (abs / 1000).toFixed(1) + 'к';
  }
  return sign + formatNum(abs);
}

// -----------------------------------------------------------------------------
// 2. ДАННЫЕ И КОНФИГУРАЦИЯ
// -----------------------------------------------------------------------------

const defaultTransportExpenses = {
  walk: [
    { id: 'rent', name: 'Аренда', value: 0, max: 25000 },
    { id: 'food', name: 'Еда', value: 0, max: 25000 }
  ],
  bike: [
    { id: 'rent', name: 'Аренда', value: 0, max: 25000 },
    { id: 'food', name: 'Еда', value: 0, max: 25000 }
  ],
  ebike: [
    { id: 'rent', name: 'Аренда', value: 0, max: 25000 },
    { id: 'food', name: 'Еда', value: 0, max: 25000 }
  ],
  car: [
    { id: 'rent', name: 'Аренда', value: 7800, max: 25000 },
    { id: 'food', name: 'Еда', value: 1800, max: 25000 }
  ]
};

const cloneExpenses = () => (typeof structuredClone === 'function'
  ? structuredClone(defaultTransportExpenses)
  : JSON.parse(JSON.stringify(defaultTransportExpenses)));

const transportMeta = {
  walk:  { label: 'Пеший',       icon: '🚶', baseHourlyRub: 310, cityAvgGrossHr: 540 },
  bike:  { label: 'Вело',        icon: '🚲', baseHourlyRub: 390, cityAvgGrossHr: 680 },
  ebike: { label: 'Электровело', icon: '⚡', baseHourlyRub: 455, cityAvgGrossHr: 820 },
  car:   { label: 'Авто',        icon: '🚗', baseHourlyRub: 540, cityAvgGrossHr: 980 }
};

const rawDatasets = {
  days: [
    { date: '19.10', dayOfWeek: 'Пн', slotHours: 8,  ordersCount: 16, transport: 'Электровело', transportKey: 'ebike', ordersCost: 2450, surgePct: 32, surgeRub: 1120, ratingPct: 15, ratingRub: 520, bonuses: 420, goals: 500, tips: 280, adjustments: 0 },
    { date: '20.10', dayOfWeek: 'Вт', slotHours: 7,  ordersCount: 14, transport: 'Электровело', transportKey: 'ebike', ordersCost: 2180, surgePct: 28, surgeRub: 940,  ratingPct: 15, ratingRub: 460, bonuses: 350, goals: 450, tips: 240, adjustments: 0 },
    {
      date: '21.10',
      dayOfWeek: 'Ср',
      slotHours: 8,
      ordersCount: 17,
      transport: 'Электровело + Пеший',
      transportKey: 'ebike',
      distinctTransports: ['Электровело', 'Пеший'],
      transportSummary: 'Электровело + Пеший',
      ordersCost: 2600,
      surgePct: 35,
      surgeRub: 1250,
      ratingPct: 15,
      ratingRub: 560,
      bonuses: 480,
      goals: 550,
      tips: 320,
      adjustments: -100,
      subRows: [
        {
          date: '21.10',
          fullDisplayDate: '21.10.2026',
          dayOfWeek: 'Ср',
          slotHours: 6.5,
          ordersCount: 14,
          transport: 'Электровело',
          transportKey: 'ebike',
          ordersCost: 2150,
          surgePct: 35,
          surgeRub: 1050,
          ratingPct: 15,
          ratingRub: 470,
          bonuses: 400,
          goals: 460,
          tips: 270,
          adjustments: -80
        },
        {
          date: '21.10',
          fullDisplayDate: '21.10.2026',
          dayOfWeek: 'Ср',
          slotHours: 1.5,
          ordersCount: 3,
          transport: 'Пеший',
          transportKey: 'walk',
          ordersCost: 450,
          surgePct: 35,
          surgeRub: 200,
          ratingPct: 15,
          ratingRub: 90,
          bonuses: 80,
          goals: 90,
          tips: 50,
          adjustments: -20
        }
      ]
    },
    { date: '22.10', dayOfWeek: 'Чт', slotHours: 8,  ordersCount: 18, transport: 'Электровело', transportKey: 'ebike', ordersCost: 2720, surgePct: 38, surgeRub: 1380, ratingPct: 15, ratingRub: 590, bonuses: 510, goals: 600, tips: 360, adjustments: 0 },
    { date: '23.10', dayOfWeek: 'Пт', slotHours: 10, ordersCount: 24, transport: 'Электровело', transportKey: 'ebike', ordersCost: 3580, surgePct: 54, surgeRub: 2140, ratingPct: 15, ratingRub: 780, bonuses: 740, goals: 850, tips: 520, adjustments: -150 },
    { date: '24.10', dayOfWeek: 'Сб', slotHours: 9,  ordersCount: 22, transport: 'Электровело', transportKey: 'ebike', ordersCost: 3320, surgePct: 58, surgeRub: 2050, ratingPct: 15, ratingRub: 720, bonuses: 690, goals: 800, tips: 490, adjustments: 0 }
  ],
  weeks: [
    { date: 'Нед 39', dayOfWeek: 'Пн–Вс', slotHours: 40, ordersCount: 82, transport: 'Электровело', transportKey: 'ebike', ordersCost: 13200, surgePct: 36, surgeRub: 6400, ratingPct: 15, ratingRub: 2750, bonuses: 2400, goals: 2900, tips: 1650, adjustments: -150 },
    { date: 'Нед 40', dayOfWeek: 'Пн–Вс', slotHours: 44, ordersCount: 91, transport: 'Электровело', transportKey: 'ebike', ordersCost: 14800, surgePct: 41, surgeRub: 7350, ratingPct: 15, ratingRub: 3100, bonuses: 2850, goals: 3300, tips: 1920, adjustments: 0 },
    { date: 'Нед 41', dayOfWeek: 'Пн–Вс', slotHours: 42, ordersCount: 86, transport: 'Электровело', transportKey: 'ebike', ordersCost: 14100, surgePct: 39, surgeRub: 6920, ratingPct: 15, ratingRub: 2950, bonuses: 2600, goals: 3100, tips: 1780, adjustments: -200 },
    { date: 'Нед 42', dayOfWeek: 'Пн–Вс', slotHours: 50, ordersCount: 111, transport: 'Электровело', transportKey: 'ebike', ordersCost: 16850, surgePct: 44, surgeRub: 8880, ratingPct: 15, ratingRub: 3630, bonuses: 3190, goals: 3750, tips: 2210, adjustments: -100 }
  ],
  months: [
    { date: 'Июнь',     dayOfWeek: 'Месяц', slotHours: 168, ordersCount: 345, transport: 'Вело/Электро', transportKey: 'ebike', ordersCost: 56200, surgePct: 34, surgeRub: 25400, ratingPct: 10, ratingRub: 9800,  bonuses: 9400,  goals: 11200, tips: 6800, adjustments: -300 },
    { date: 'Июль',     dayOfWeek: 'Месяц', slotHours: 176, ordersCount: 362, transport: 'Электровело',  transportKey: 'ebike', ordersCost: 59400, surgePct: 37, surgeRub: 27800, ratingPct: 15, ratingRub: 11900, bonuses: 10200, goals: 12400, tips: 7300, adjustments: 0 },
    { date: 'Август',   dayOfWeek: 'Месяц', slotHours: 182, ordersCount: 380, transport: 'Электровело',  transportKey: 'ebike', ordersCost: 62800, surgePct: 40, surgeRub: 30100, ratingPct: 15, ratingRub: 12600, bonuses: 11400, goals: 13500, tips: 7900, adjustments: -250 },
    { date: 'Сентябрь', dayOfWeek: 'Месяц', slotHours: 174, ordersCount: 368, transport: 'Электровело',  transportKey: 'ebike', ordersCost: 60900, surgePct: 42, surgeRub: 29600, ratingPct: 15, ratingRub: 12300, bonuses: 11100, goals: 13100, tips: 7600, adjustments: -150 },
    { date: 'Октябрь',  dayOfWeek: 'Месяц', slotHours: 188, ordersCount: 404, transport: 'Электровело',  transportKey: 'ebike', ordersCost: 66200, surgePct: 45, surgeRub: 33400, ratingPct: 15, ratingRub: 13800, bonuses: 12500, goals: 14800, tips: 8400, adjustments: -200 }
  ]
};

const districtsData = [
  {
    id: 'center_south',
    name: 'Центр-Юг (Хамовники / Якиманка)',
    shortName: 'Центр-Юг',
    avgPct: 42,
    peakPct: 68,
    color: '#FCE000',
    polygon: [
      [55.752, 37.555], [55.752, 37.645], [55.730, 37.650],
      [55.708, 37.620], [55.708, 37.575], [55.722, 37.545]
    ]
  },
  {
    id: 'north_city',
    name: 'Север-Сити (Пресня / Сокол)',
    shortName: 'Север-Сити',
    avgPct: 46,
    peakPct: 74,
    color: '#38BDF8',
    polygon: [
      [55.808, 37.495], [55.805, 37.585], [55.768, 37.605],
      [55.752, 37.600], [55.752, 37.555], [55.760, 37.505]
    ]
  },
  {
    id: 'east_izh',
    name: 'Восток (Сокольники / Перово)',
    shortName: 'Восток',
    avgPct: 33,
    peakPct: 54,
    color: '#A855F7',
    polygon: [
      [55.798, 37.650], [55.802, 37.755], [55.765, 37.785],
      [55.735, 37.760], [55.730, 37.650], [55.752, 37.645]
    ]
  },
  {
    id: 'south_west',
    name: 'Юго-Запад (Раменки / Черемушки)',
    shortName: 'Юго-Запад',
    avgPct: 39,
    peakPct: 63,
    color: '#10B981',
    polygon: [
      [55.722, 37.545], [55.708, 37.575], [55.662, 37.585],
      [55.655, 37.510], [55.675, 37.465], [55.710, 37.485]
    ]
  }
];

const seasonMultipliers = {
  auto:   { label: 'Авто (4 нед.)', mult: 1.00 },
  summer: { label: 'Лето',          mult: 0.88 },
  autumn: { label: 'Осень',         mult: 1.06 },
  winter: { label: 'Зима',          mult: 1.22 },
  spring: { label: 'Весна',         mult: 0.96 }
};

const baseHeatmapMatrix = [
  { hours: '02:00–06:00', values: [14, 13, 14, 16, 20, 22, 18] },
  { hours: '06:00–10:00', values: [24, 26, 27, 29, 32, 28, 25] },
  { hours: '10:00–14:00', values: [36, 38, 40, 42, 48, 46, 43] },
  { hours: '14:00–18:00', values: [29, 31, 33, 35, 41, 44, 40] },
  { hours: '18:00–22:00', values: [46, 48, 51, 55, 66, 70, 63] },
  { hours: '22:00–02:00', values: [33, 34, 37, 41, 54, 58, 45] }
];

const shortDayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const fullDayNames = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

const shortMonthNamesMap = {
  'январь': 'Янв',
  'февраль': 'Фев',
  'март': 'Мар',
  'апрель': 'Апр',
  'май': 'Май',
  'июнь': 'Июн',
  'июль': 'Июл',
  'август': 'Авг',
  'сентябрь': 'Сен',
  'октябрь': 'Окт',
  'ноябрь': 'Ноя',
  'декабрь': 'Дек'
};

const comparisonDatasets = {
  transport: {
    columns: [
      { key: 'walk',  title: 'Пеший',          forecast: false },
      { key: 'bike',  title: 'Вело',           forecast: false },
      { key: 'ebike', title: 'Электровело',    forecast: false },
      { key: 'car',   title: 'Авто (прогноз)', forecast: true }
    ],
    rowsPerOrder: [
      { label: 'Расстояние заказа',         vals: ['1.3 км', '2.1 км', '2.8 км', '4.3 км'] },
      { label: 'Продолжительность заказа',  vals: ['29 мин', '24 мин', '19 мин', '22 мин'] },
      { label: 'Вес заказа',                vals: ['2.4 кг', '3.6 кг', '4.8 кг', '7.5 кг'] },
      { label: 'Оплата за км заказа',       vals: ['185 ₽/км', '142 ₽/км', '134 ₽/км', '108 ₽/км'] },
      { label: 'Оплата за кг заказа',       vals: ['100 ₽/кг', '83 ₽/кг',  '78 ₽/кг',  '62 ₽/кг']  },
      { label: 'Доля заказов с ожиданием',  vals: ['24%',    '26%',    '28%',    '31%']    },
      { label: 'Ожидание заказа',           vals: ['6.2 мин','6.5 мин','6.8 мин','7.4 мин']}
    ],
    rowsTotal: [
      { label: 'Заказов в час',             vals: ['1.55',   '1.85',   '2.20',   '2.35']   },
      { label: 'Прибыль в час',             vals: ['WALK_DYN', 'BIKE_DYN', 'EBIKE_DYN', 'CAR_FORECAST_DYN'] }
    ]
  },
  slot: {
    columns: ['Плановый', 'Свободный'],
    rowsPerOrder: [
      { label: 'Расстояние заказа',         vals: ['2.7 км', '3.1 км'] },
      { label: 'Продолжительность заказа',  vals: ['19 мин', '23 мин'] },
      { label: 'Вес заказа',                vals: ['4.9 кг', '4.4 кг'] },
      { label: 'Оплата за км заказа',       vals: ['140 ₽/км', '112 ₽/км'] },
      { label: 'Оплата за кг заказа',       vals: ['77 ₽/кг',  '68 ₽/кг']  },
      { label: 'Доля заказов с ожиданием',  vals: ['27%',    '25%']    },
      { label: 'Ожидание заказа',           vals: ['6.5 мин','6.4 мин']}
    ],
    rowsTotal: [
      { label: 'Заказов в час',             vals: ['2.25',   '1.75']   },
      { label: 'Прибыль в час',             vals: ['DYNAMIC', 'FREE_SLOT_DEMO_DYN']}
    ]
  },
  total: {
    columns: ['Вы (все время)', 'DYNAMIC_PERIOD_COL', 'AVG_DIST_COL', 'TOP_DIST_COL', 'AVG_CITY_COL', 'TOP_CITY_COL'],
    rowsPerOrder: [
      { label: 'Расстояние заказа',         vals: ['2.7 км', '2.8 км', '3.0 км', '2.5 км', '3.2 км', '2.6 км'] },
      { label: 'Продолжительность заказа',  vals: ['20 мин', '19 мин', '22 мин', '17 мин', '24 мин', '18 мин'] },
      { label: 'Вес заказа',                vals: ['4.6 кг', '4.8 кг', '4.5 кг', '4.9 кг', '4.4 кг', '4.8 кг'] },
      { label: 'Оплата за км заказа',       vals: ['131 ₽/км', '134 ₽/км', '120 ₽/км', '156 ₽/км', '114 ₽/км', '148 ₽/км'] },
      { label: 'Оплата за кг заказа',       vals: ['76 ₽/кг',  '78 ₽/кг',  '71 ₽/кг',  '88 ₽/кг',  '68 ₽/кг',  '84 ₽/кг']  },
      { label: 'Доля заказов с ожиданием',  vals: ['29%',    '28%',    '33%',    '21%',    '35%',    '23%']    },
      { label: 'Ожидание заказа',           vals: ['7.0 мин','6.8 мин','8.1 мин','5.4 мин','8.5 мин','5.8 мин']}
    ],
    rowsTotal: [
      { label: 'Заказов в час',             vals: ['2.15',   'DYNAMIC_ORD_HR', '1.95',   '2.45',   '1.85',   '2.35']   },
      { label: 'Прибыль в час',             vals: ['ALLTIME', 'DYNAMIC', '625 ₽/ч', '810 ₽/ч', '580 ₽/ч', '765 ₽/ч']}
    ]
  }
};

// -----------------------------------------------------------------------------
// 3. РЕАКТИВНОЕ СОСТОЯНИЕ И КЭШ
// -----------------------------------------------------------------------------

const state = {
  lightMode: true,
  currentScreen: 'main',

  isNet: true,
  isHourly: false,
  viewMode: 'chart',
  period: 'days',
  selectedBarIndex: 5,

  accountTransport: 'ebike',
  includeGoals: false,
  weekStartDay: 0, // 0=Пн .. 6=Вс
  selectedPreset: 'ebike',
  collapsedDateKeys: new Set(),
  expensesByTransport: cloneExpenses(),
  get expenses() {
    return this.expensesByTransport[this.selectedPreset] || [];
  },

  tableColumns: [
    { key: 'date',               label: 'Дата',                 enabled: true },
    { key: 'dayOfWeek',          label: 'День недели',          enabled: true },
    { key: 'slotHours',          label: 'Длит. слота (ч)',      enabled: true },
    { key: 'ordersCount',        label: 'Кол-во заказов',       enabled: true },
    { key: 'ordersPerHr',        label: 'Заказов в час',        enabled: true },
    { key: 'transport',          label: 'Транспорт',            enabled: true },
    { key: 'grossTotal',         label: 'Начислено (до расх.)', enabled: true },
    { key: 'ordersCost',         label: 'Стоимость заказов',    enabled: true },
    { key: 'surgePct',           label: 'Доплата (спрос; %)',   enabled: true },
    { key: 'surgeRub',           label: 'Доплата (спрос)',      enabled: true },
    { key: 'ratingPct',          label: 'Доплата (рейтинг; %)', enabled: true },
    { key: 'ratingRub',          label: 'Доплата (рейтинг)',    enabled: true },
    { key: 'bonuses',            label: 'Бонусы',               enabled: true },
    { key: 'tax',                label: 'Налог',                enabled: true },
    { key: 'netProfit',          label: 'Прибыль (на руки)',    enabled: true },
    { key: 'profitPerHrNoBonus', label: 'Прибыль/час (без д/б)', enabled: true },
    { key: 'profitPerHr',        label: 'Прибыль в час',        enabled: true },
    { key: 'goals',              label: 'Цели',                 enabled: false },
    { key: 'tips',               label: 'Чаевые',               enabled: false },
    { key: 'adjustments',        label: 'Корректировки',        enabled: false },
    { key: 'expenses',           label: 'Расходы',              enabled: false }
  ],

  weatherBoost: false,
  heatUnitRub: false,
  season: 'auto',
  districtId: 'center_south',
  selectedSlotCells: ['4-4', '4-5', '4-6', '2-4', '2-5'],
  compareMode: 'transport',

  layoutMode: 'phone', // 'phone' | 'pc'
  usingUserData: false,
  userDataFileName: '',
  userDataOrders: [],
  userDatasets: null
};

/**
 * Кэш обогащенных датасетов для исключения избыточных вычислений
 */
const dataCache = {
  enriched: new Map(),
  allTimeProfit: null,
  invalidate() {
    this.enriched.clear();
    this.allTimeProfit = null;
  }
};

// -----------------------------------------------------------------------------
// 3.1. ПАРСИНГ И ОБРАБОТКА ПОЛЬЗОВАТЕЛЬСКИХ ДАННЫХ (EXCEL / CSV)
// -----------------------------------------------------------------------------

/**
 * Парсер времени из любого формата (HH:MM:SS, HH:MM, числовая доля дня Excel, Date)
 * Возвращает секунды от начала суток (0..86399)
 */
function parseTimeSecs(val) {
  if (val == null || val === '') return 0;
  if (val instanceof Date) {
    return val.getHours() * 3600 + val.getMinutes() * 60 + val.getSeconds();
  }
  if (typeof val === 'number') {
    return Math.round(val * 86400) % 86400;
  }
  const str = String(val).trim();
  const parts = str.split(':').map(p => parseInt(p, 10) || 0);
  if (parts.length >= 2) {
    return parts[0] * 3600 + parts[1] * 60 + (parts[2] || 0);
  }
  return 0;
}

/**
 * Парсер даты (YYYY-MM-DD, DD.MM.YYYY, DD.MM.YY, Excel serial date, Date)
 */
function parseDateInfo(val) {
  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  let d = null;

  if (val instanceof Date && !isNaN(val.getTime())) {
    // SheetJS парсит Excel serial dates в UTC (часто 21:00Z предыдущего дня).
    // Сдвиг на полдня (+12ч) гарантирует точное попадание в нужную календарную дату во всех часовых поясах.
    d = new Date(val.getTime() + 12 * 3600 * 1000);
  } else if (typeof val === 'number') {
    // Excel serial number (origin: 1899-12-30) + 12 часов
    d = new Date(Math.round((val - 25569) * 86400 * 1000) + 12 * 3600 * 1000);
  } else if (typeof val === 'string') {
    const s = val.trim();
    const dotMatch = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
    const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (dotMatch) {
      const day = parseInt(dotMatch[1], 10);
      const month = parseInt(dotMatch[2], 10) - 1;
      let year = parseInt(dotMatch[3], 10);
      if (year < 100) year += 2000;
      d = new Date(year, month, day, 12, 0, 0);
    } else if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10) - 1;
      const day = parseInt(isoMatch[3], 10);
      d = new Date(year, month, day, 12, 0, 0);
    } else {
      const parsed = new Date(s);
      if (!isNaN(parsed.getTime())) {
        d = new Date(parsed.getTime() + 12 * 3600 * 1000);
      }
    }
  }

  if (!d || isNaN(d.getTime())) {
    d = new Date();
  }

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const isoDate = `${y}-${m}-${day}`;
  const displayDate = `${day}.${m}`;
  const fullDisplayDate = `${day}.${m}.${y}`;
  const jsDay = d.getDay();
  const dowIdx = jsDay === 0 ? 6 : jsDay - 1; // 0=Пн .. 6=Вс
  const dayOfWeek = shortDayNames[dowIdx] || 'Пн';
  const monthKey = monthNames[d.getMonth()] || 'Месяц';

  const monthIdx = d.getMonth();
  let seasonKey = 'autumn';
  if (monthIdx === 11 || monthIdx === 0 || monthIdx === 1) seasonKey = 'winter';
  else if (monthIdx >= 2 && monthIdx <= 4) seasonKey = 'spring';
  else if (monthIdx >= 5 && monthIdx <= 7) seasonKey = 'summer';
  else if (monthIdx >= 8 && monthIdx <= 10) seasonKey = 'autumn';

  // Расчет номера недели ISO
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNum = 1 + Math.ceil((firstThursday - target) / 604800000);
  const weekKey = `Нед ${weekNum}`;

  return { isoDate, displayDate, fullDisplayDate, dayOfWeek, dowIdx, monthKey, weekKey, year: y, seasonKey, dateObj: d };
}

const monthDaysLookup = {
  'январь': 31, 'февраль': 28, 'март': 31, 'апрель': 30, 'май': 31, 'июнь': 30,
  'июль': 31, 'август': 31, 'сентябрь': 30, 'октябрь': 31, 'ноябрь': 30, 'декабрь': 31
};

function getDaysInMonthFromRow(rawRow) {
  if (!rawRow) return 30;
  const year = rawRow.year || (rawRow.fullDisplayDate && parseInt(String(rawRow.fullDisplayDate).match(/\d{4}/)?.[0], 10)) || 2026;
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);

  const str = String(rawRow.date || rawRow.monthKey || '').toLowerCase().trim();
  for (const [mName, days] of Object.entries(monthDaysLookup)) {
    if (str.includes(mName)) {
      if (mName === 'февраль') return isLeapYear ? 29 : 28;
      return days;
    }
  }
  if (rawRow.fullDate) {
    const d = new Date(rawRow.fullDate);
    if (!isNaN(d.getTime())) {
      return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    }
  }
  return 30;
}

function getDayDateObj(r) {
  if (!r) return new Date();
  if (r.fullDate) {
    const p = parseDateInfo(r.fullDate);
    return p.dateObj;
  }
  if (r.date && typeof r.date === 'string' && r.date.includes('.')) {
    const parts = r.date.split('.');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = r.year || 2026;
    return new Date(year, month, day, 12, 0, 0);
  }
  return new Date();
}

function getWeekCycleInfo(dateInput, weekStartDay = 0) {
  const d = dateInput instanceof Date ? new Date(dateInput.getTime()) : new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  const jsDay = d.getDay();
  const dowIdx = jsDay === 0 ? 6 : jsDay - 1; // 0=Пн .. 6=Вс
  const offset = (dowIdx - weekStartDay + 7) % 7;
  const cycleStart = new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset, 12, 0, 0);
  const cycleEnd = new Date(cycleStart.getFullYear(), cycleStart.getMonth(), cycleStart.getDate() + 6, 12, 0, 0);

  const pad = n => String(n).padStart(2, '0');
  const cycleKey = `${cycleStart.getFullYear()}-${pad(cycleStart.getMonth() + 1)}-${pad(cycleStart.getDate())}`;
  const startDisp = `${pad(cycleStart.getDate())}.${pad(cycleStart.getMonth() + 1)}`;
  const endDisp = `${pad(cycleEnd.getDate())}.${pad(cycleEnd.getMonth() + 1)}`;
  const startDayName = shortDayNames[weekStartDay] || 'Пн';
  const endDayName = shortDayNames[(weekStartDay + 6) % 7] || 'Вс';

  return {
    cycleStart,
    cycleEnd,
    cycleKey,
    startDisp,
    endDisp,
    label: `${startDisp}–${endDisp}`,
    fullLabel: `${startDisp}–${endDisp} (${cycleStart.getFullYear()})`,
    dayRangeLabel: `${startDayName}–${endDayName}`,
    offset,
    dowIdx
  };
}

/**
 * Парсер процентов (поддерживает 1.05 для 105%, 0.7 для 70%, 35 для 35%, 105% для 105%)
 */
function parsePercentage(val) {
  if (val == null || val === '') return 0;
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.').replace('%', '').trim());
  if (isNaN(num)) return 0;
  return num > 5 ? num : num * 100;
}

/**
 * Парсер денежных / числовых значений
 */
function parseNum(val) {
  if (val == null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const clean = String(val).replace(/\s/g, '').replace(',', '.');
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
}

/**
 * Парсер CSV-текста с автоопределением разделителя и кавычек
 */
function parseCSVText(text) {
  const firstLine = text.split(/\r\n|\n|\r/)[0] || '';
  let delimiter = ';';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  if (semiCount >= commaCount && semiCount >= tabCount) delimiter = ';';
  else if (commaCount > semiCount && commaCount >= tabCount) delimiter = ',';
  else if (tabCount > semiCount && tabCount > commaCount) delimiter = '\t';

  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentField.trim());
      if (currentRow.some(f => f !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }
  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(f => f !== '')) {
      rows.push(currentRow);
    }
  }
  return rows;
}

/**
 * Извлечение заказов из массива строк (Excel или CSV)
 * Поддерживает как адаптивное сопоставление по именам колонок, так и фиксированный порядок
 */
function parseOrdersFromRows(rawRows) {
  if (!rawRows || rawRows.length < 2) return [];

  const headerRow = (rawRows[0] || []).map(h => String(h || '').toLowerCase().trim());
  const dataRows = rawRows.slice(1);

  // Динамический поиск индексов колонок по ключевым словам
  const findCol = (keywords, defaultIdx) => {
    const idx = headerRow.findIndex(h => keywords.some(k => h.includes(k)));
    return idx >= 0 ? idx : defaultIdx;
  };

  const colDate      = findCol(['дата', 'date', 'число'], 0);
  const colStart     = findCol(['начало', 'старт', 'start'], 1);
  const colEnd       = findCol(['конец', 'окончание', 'end', 'финиш'], 2);
  const colDist      = findCol(['дистанц', 'расстояни', 'дист', 'км', 'dist'], 3);
  const colWeight    = findCol(['вес', 'weight', 'кг'], 4);
  const colCost      = findCol(['стоимост', 'оплата за заказ', 'тариф', 'cost'], 5);
  const colWait      = findCol(['ожидан', 'wait'], 6);
  const colSurge     = findCol(['спрос', 'surge'], 7);
  const colRating    = findCol(['рейтинг', 'rating'], 8);
  const colBonus     = findCol(['бонус', 'bonus'], 9);
  const colExpense   = findCol(['расход', 'траты', 'expense'], 10);
  const colTransport = findCol(['транспорт', 'тип авто', 'способ', 'transport'], 11);
  const colSlotType  = findCol(['тип слот', 'плановый', 'свободный', 'тип смен'], 12);
  const colSlotNum   = findCol(['номер слот', 'номер смен', 'slot'], 13);
  const colGoal      = findCol(['цель', 'цели', 'goal'], 14);

  const orders = [];

  dataRows.forEach(r => {
    if (!r || r.length < 4) return;
    if (r[colDate] == null && r[colStart] == null && r[colCost] == null) return;

    const dateInfo = parseDateInfo(r[colDate]);
    const startSecs = parseTimeSecs(r[colStart]);
    const endSecs = parseTimeSecs(r[colEnd]);

    let durationMins = 0;
    if (endSecs >= startSecs) {
      durationMins = (endSecs - startSecs) / 60;
    } else {
      durationMins = (endSecs + 86400 - startSecs) / 60;
    }
    if (durationMins <= 0) durationMins = 20;

    const distance = parseNum(r[colDist]);
    const weight = parseNum(r[colWeight]);
    const orderCost = parseNum(r[colCost]);
    const wait = parseNum(r[colWait]);
    const surgePct = parsePercentage(r[colSurge]);
    const ratingPct = parsePercentage(r[colRating]);
    const bonus = parseNum(r[colBonus]);
    const expense = parseNum(r[colExpense]);

    const transportRaw = String(r[colTransport] || 'Пешком').trim();
    let transportKey = 'walk';
    let transportLabel = 'Пеший';
    const tLower = transportRaw.toLowerCase();
    if (tLower.includes('электро')) {
      transportKey = 'ebike';
      transportLabel = 'Электровело';
    } else if (tLower.includes('вело')) {
      transportKey = 'bike';
      transportLabel = 'Вело';
    } else if (tLower.includes('авто') || tLower.includes('машин')) {
      transportKey = 'car';
      transportLabel = 'Авто';
    } else if (tLower.includes('пеш')) {
      transportKey = 'walk';
      transportLabel = 'Пеший';
    }

    const slotType = String(r[colSlotType] || 'Плановый').trim();
    const slotNumber = String(r[colSlotNum] || '1').trim();
    const goal = parseNum(r[colGoal]);

    const baseCost = orderCost + wait;
    const surgeRub = baseCost * (surgePct / 100);
    const ratingRub = baseCost * (ratingPct / 100);

    orders.push({
      dateInfo,
      date: dateInfo.isoDate,
      displayDate: dateInfo.displayDate,
      dayOfWeek: dateInfo.dayOfWeek,
      dowIdx: dateInfo.dowIdx,
      monthKey: dateInfo.monthKey,
      weekKey: dateInfo.weekKey,
      startSecs,
      endSecs,
      durationMins,
      distance,
      weight,
      orderCost,
      wait,
      baseCost,
      surgePct,
      surgeRub,
      ratingPct,
      ratingRub,
      bonus,
      expense,
      transportRaw,
      transportKey,
      transportLabel,
      slotType,
      slotNumber,
      goal
    });
  });

  return orders;
}

/**
 * Расчет агрегированных метрик по группе заказов (средняя дистанция, длительность, вес, оплата за км/кг, ожидание)
 */
function computeGroupOrderMetrics(groupOrders) {
  if (!groupOrders || groupOrders.length === 0) {
    return {
      avgDist: '—',
      avgDur: '—',
      avgWeight: '—',
      payPerKm: '—',
      payPerKg: '—',
      waitPct: '—',
      avgWaitMin: '—'
    };
  }
  const cnt = groupOrders.length;
  const sumDist = groupOrders.reduce((a, o) => a + Number(o.distance || 0), 0);
  const sumDur = groupOrders.reduce((a, o) => a + Number(o.durationMins || 0), 0);
  const sumWeight = groupOrders.reduce((a, o) => a + Number(o.weight || 0), 0);
  const sumCost = groupOrders.reduce((a, o) => a + Number(o.orderCost || o.baseCost || 0), 0);
  const waitsList = groupOrders.filter(o => (o.wait || 0) > 0);

  const avgDist = sumDist > 0 ? (sumDist / cnt).toFixed(1) + ' км' : '0.0 км';
  const avgDur = sumDur > 0 ? Math.round(sumDur / cnt) + ' мин' : '0 мин';
  const avgWeight = sumWeight > 0 ? (sumWeight / cnt).toFixed(1) + ' кг' : '0.0 кг';
  const payPerKm = sumDist > 0 ? Math.round(sumCost / sumDist) + ' ₽/км' : '—';
  const payPerKg = sumWeight > 0 ? Math.round(sumCost / sumWeight) + ' ₽/кг' : '—';
  const waitPct = Math.round((waitsList.length / cnt) * 100) + '%';
  const avgWaitMin = waitsList.length > 0
    ? (waitsList.reduce((a, o) => a + (o.wait > 0 ? Math.max(2, o.wait / 3) : 0), 0) / waitsList.length).toFixed(1) + ' мин'
    : '—';

  return {
    avgDist,
    avgDur,
    avgWeight,
    payPerKm,
    payPerKg,
    waitPct,
    avgWaitMin
  };
}

/**
 * Точный расчет статистики по видам транспорта с учетом расходов и целей
 */
function calculateTransportStats(orders) {
  if (!orders || orders.length === 0) {
    return {
      byTransport: {},
      totalProfitPerHr: 0,
      totalOrdersPerHr: '0.00',
      totalHrs: 0,
      totalNet: 0,
      totalSettingsExp: 0
    };
  }

  // Группировка сегментов по (дата, номер слота, транспорт)
  const segmentMap = new Map();
  orders.forEach(o => {
    const key = `${o.date}__${o.slotNumber}__${o.transportKey}`;
    if (!segmentMap.has(key)) {
      segmentMap.set(key, {
        date: o.date,
        slotNumber: o.slotNumber,
        transportKey: o.transportKey,
        transportLabel: o.transportLabel,
        orders: []
      });
    }
    segmentMap.get(key).orders.push(o);
  });

  const byTransport = {};
  let totalGross = 0;
  let totalFileExp = 0;
  let totalSettingsExp = 0;
  let totalHrs = 0;
  let totalOrdersCount = 0;

  // Отслеживаем активные даты для каждого транспорта
  const transDates = {};
  segmentMap.forEach(seg => {
    const tKey = seg.transportKey;
    if (!transDates[tKey]) transDates[tKey] = new Set();
    transDates[tKey].add(seg.date);
  });

  const usedKeys = Object.keys(transDates);

  usedKeys.forEach(tKey => {
    const segs = Array.from(segmentMap.values()).filter(s => s.transportKey === tKey);
    let durHr = 0;
    let gross = 0;
    let fileExp = 0;
    let ordersCount = 0;

    segs.forEach(seg => {
      const oList = seg.orders;
      const startS = Math.min(...oList.map(o => o.startSecs));
      const maxEnd = Math.max(...oList.map(o => o.endSecs));
      let segDur = (maxEnd >= startS ? maxEnd - startS : maxEnd + 86400 - startS) / 3600;
      segDur = Math.max(0.3, segDur);
      durHr += segDur;
      ordersCount += oList.length;

      const exps = oList.map(o => o.expense).filter(e => e > 0);
      if (exps.length > 0) {
        fileExp += exps.every(e => Math.abs(e - exps[0]) < 0.01) ? exps[0] : exps.reduce((a, b) => a + b, 0);
      }

      oList.forEach(o => {
        const goalVal = state.includeGoals ? (o.goal || 0) : 0;
        gross += o.orderCost + (o.wait || 0) + o.surgeRub + o.ratingRub + o.bonus + goalVal;
      });
    });

    durHr = Math.round(durHr * 10) / 10;
    const weeklyExp = getWeeklyExpenseForTransport(tKey);
    const activeDaysCount = transDates[tKey] ? transDates[tKey].size : 0;
    const settingsExp = activeDaysCount * (weeklyExp / 7.0);

    const tax = Math.round(gross * 0.06);
    const net = state.isNet ? (gross - tax - fileExp - settingsExp) : gross;
    const profitPerHr = durHr > 0 ? Math.round(net / durHr) : 0;
    const ordersPerHr = durHr > 0 ? (ordersCount / durHr).toFixed(2) : '0.00';

    byTransport[tKey] = {
      hrs: durHr,
      gross,
      tax,
      fileExp,
      settingsExp,
      net,
      profitPerHr,
      ordersCount,
      ordersPerHr
    };

    totalGross += gross;
    totalFileExp += fileExp;
    totalSettingsExp += settingsExp;
    totalHrs += durHr;
    totalOrdersCount += ordersCount;
  });

  const totalTax = Math.round(totalGross * 0.06);
  const totalNet = state.isNet ? (totalGross - totalTax - totalFileExp - totalSettingsExp) : totalGross;
  const totalProfitPerHr = totalHrs > 0 ? Math.round(totalNet / totalHrs) : 0;
  const totalOrdersPerHr = totalHrs > 0 ? (totalOrdersCount / totalHrs).toFixed(2) : '0.00';

  return {
    byTransport,
    totalGross,
    totalTax,
    totalFileExp,
    totalSettingsExp,
    totalNet,
    totalHrs,
    totalProfitPerHr,
    totalOrdersCount,
    totalOrdersPerHr
  };
}

/**
 * Точный расчет слотовой статистики для плановых и свободных слотов
 */
function calculateSlotStats(orders) {
  if (!orders || orders.length === 0) {
    return {
      planHrs: 0, planNet: 0, planProfitPerHr: 0, planOrdHr: '0.00',
      freeHrs: 0, freeNet: 0, freeProfitPerHr: 0, freeOrdHr: '0.00',
      totalHrs: 0, totalNet: 0, totalProfitPerHr: 0, totalOrdHr: '0.00'
    };
  }

  const slotMap = new Map();
  orders.forEach(o => {
    const key = `${o.date}__${o.slotNumber}__${o.slotType}`;
    if (!slotMap.has(key)) {
      slotMap.set(key, {
        orders: [],
        slotType: o.slotType,
        transportKey: o.transportKey,
        date: o.date
      });
    }
    slotMap.get(key).orders.push(o);
  });

  let planHrs = 0;
  let planGross = 0;
  let planFileExp = 0;
  let planOrdersCount = 0;

  let freeHrs = 0;
  let freeGross = 0;
  let freeFileExp = 0;
  let freeOrdersCount = 0;

  slotMap.forEach(slot => {
    const oList = slot.orders;
    const startS = Math.min(...oList.map(o => o.startSecs));
    const maxEnd = Math.max(...oList.map(o => o.endSecs));
    let durHr = (maxEnd >= startS ? maxEnd - startS : maxEnd + 86400 - startS) / 3600;
    durHr = Math.max(0.3, durHr);

    let sGross = 0;
    const exps = oList.map(o => o.expense).filter(e => e > 0);
    const sExp = exps.length > 0 ? (exps.every(e => Math.abs(e - exps[0]) < 0.01) ? exps[0] : exps.reduce((a, b) => a + b, 0)) : 0;

    oList.forEach(o => {
      const goalVal = state.includeGoals ? (o.goal || 0) : 0;
      sGross += o.orderCost + (o.wait || 0) + o.surgeRub + o.ratingRub + o.bonus + goalVal;
    });

    const isPlan = slot.slotType.toLowerCase().includes('план');
    if (isPlan) {
      planHrs += durHr;
      planGross += sGross;
      planFileExp += sExp;
      planOrdersCount += oList.length;
    } else {
      freeHrs += durHr;
      freeGross += sGross;
      freeFileExp += sExp;
      freeOrdersCount += oList.length;
    }
  });

  planHrs = Math.round(planHrs * 10) / 10;
  freeHrs = Math.round(freeHrs * 10) / 10;
  const totalHrs = planHrs + freeHrs;

  const tStats = calculateTransportStats(orders);
  const totalSettingsExp = tStats.totalSettingsExp;
  const planSettingsExp = totalHrs > 0 ? (planHrs / totalHrs) * totalSettingsExp : 0;
  const freeSettingsExp = totalHrs > 0 ? (freeHrs / totalHrs) * totalSettingsExp : 0;

  const planTax = Math.round(planGross * 0.06);
  const planNet = state.isNet ? (planGross - planTax - planFileExp - planSettingsExp) : planGross;
  const planProfitPerHr = planHrs > 0 ? Math.round(planNet / planHrs) : 0;
  const planOrdHr = planHrs > 0 ? (planOrdersCount / planHrs).toFixed(2) : '0.00';

  const freeTax = Math.round(freeGross * 0.06);
  const freeNet = state.isNet ? (freeGross - freeTax - freeFileExp - freeSettingsExp) : freeGross;
  const freeProfitPerHr = freeHrs > 0 ? Math.round(freeNet / freeHrs) : 0;
  const freeOrdHr = freeHrs > 0 ? (freeOrdersCount / freeHrs).toFixed(2) : '0.00';

  const totalNet = planNet + freeNet;
  const totalProfitPerHr = totalHrs > 0 ? Math.round(totalNet / totalHrs) : 0;
  const totalOrdHr = totalHrs > 0 ? ((planOrdersCount + freeOrdersCount) / totalHrs).toFixed(2) : '0.00';

  return {
    planHrs, planNet, planProfitPerHr, planOrdHr,
    freeHrs, freeNet, freeProfitPerHr, freeOrdHr,
    totalHrs, totalNet, totalProfitPerHr, totalOrdHr
  };
}

/**
 * Построение сравнительных показателей (Блок 3) на основе загруженных заказов
 */
function buildComparisonDatasets(orders, days) {
  // 1. Транспорт: берем ТОЛЬКО те типы транспорта, которые реально есть в файле пользователя
  const usedTransportKeys = Array.from(new Set(orders.map(o => o.transportKey)));
  const transportCols = [];
  const transMetrics = [];

  usedTransportKeys.forEach(tKey => {
    const tOrders = orders.filter(o => o.transportKey === tKey);
    const m = computeGroupOrderMetrics(tOrders);
    if (m) {
      transportCols.push({
        key: tKey,
        title: (transportMeta[tKey] && transportMeta[tKey].label) || tKey,
        forecast: false
      });
      transMetrics.push(m);
    }
  });

  const transport = {
    columns: transportCols,
    rowsPerOrder: [
      { label: 'Расстояние заказа',        vals: transMetrics.map(m => m.avgDist) },
      { label: 'Продолжительность заказа', vals: transMetrics.map(m => m.avgDur) },
      { label: 'Вес заказа',               vals: transMetrics.map(m => m.avgWeight) },
      { label: 'Оплата за км заказа',      vals: transMetrics.map(m => m.payPerKm) },
      { label: 'Оплата за кг заказа',      vals: transMetrics.map(m => m.payPerKg) },
      { label: 'Доля заказов с ожиданием', vals: transMetrics.map(m => m.waitPct) },
      { label: 'Ожидание заказа',          vals: transMetrics.map(m => m.avgWaitMin) }
    ],
    rowsTotal: [
      { label: 'Заказов в час',            vals: transportCols.map(c => `TRANSPORT_${c.key.toUpperCase()}_ORD_HR_DYN`) },
      { label: 'Прибыль в час',            vals: transportCols.map(c => `TRANSPORT_${c.key.toUpperCase()}_PROFIT_DYN`) }
    ]
  };

  // 2. Тип слота: Плановый, Свободный
  const planOrders = orders.filter(o => o.slotType.toLowerCase().includes('план'));
  const planM = computeGroupOrderMetrics(planOrders);

  const freeOrders = orders.filter(o => o.slotType.toLowerCase().includes('свобод'));
  const freeM = computeGroupOrderMetrics(freeOrders);

  const slot = {
    columns: ['Плановый', 'Свободный'],
    rowsPerOrder: [
      { label: 'Расстояние заказа',        vals: [planM.avgDist, freeM.avgDist] },
      { label: 'Продолжительность заказа', vals: [planM.avgDur, freeM.avgDur] },
      { label: 'Вес заказа',               vals: [planM.avgWeight, freeM.avgWeight] },
      { label: 'Оплата за км заказа',      vals: [planM.payPerKm, freeM.payPerKm] },
      { label: 'Оплата за кг заказа',      vals: [planM.payPerKg, freeM.payPerKg] },
      { label: 'Доля заказов с ожиданием', vals: [planM.waitPct, freeM.waitPct] },
      { label: 'Ожидание заказа',          vals: [planM.avgWaitMin, freeM.avgWaitMin] }
    ],
    rowsTotal: [
      { label: 'Заказов в час',            vals: ['SLOT_PLAN_ORD_HR_DYN', 'SLOT_FREE_ORD_HR_DYN'] },
      { label: 'Прибыль в час',            vals: ['PLAN_SLOT_DYN', 'FREE_SLOT_DYN'] }
    ]
  };

  // 3. Тотал: ТОЛЬКО данные пользователя (Вы все время / Вы выбранный период) без бенчмарков района и города
  const allM = computeGroupOrderMetrics(orders);
  const total = {
    columns: ['Вы (все время)', 'DYNAMIC_PERIOD_COL'],
    rowsPerOrder: [
      { label: 'Расстояние заказа',        vals: [allM.avgDist, 'DYNAMIC_DIST'] },
      { label: 'Продолжительность заказа', vals: [allM.avgDur, 'DYNAMIC_DUR'] },
      { label: 'Вес заказа',               vals: [allM.avgWeight, 'DYNAMIC_WEIGHT'] },
      { label: 'Оплата за км заказа',      vals: [allM.payPerKm, 'DYNAMIC_PAY_KM'] },
      { label: 'Оплата за кг заказа',      vals: [allM.payPerKg, 'DYNAMIC_PAY_KG'] },
      { label: 'Доля заказов с ожиданием', vals: [allM.waitPct, 'DYNAMIC_WAIT_PCT'] },
      { label: 'Ожидание заказа',          vals: [allM.avgWaitMin, 'DYNAMIC_WAIT_MIN'] }
    ],
    rowsTotal: [
      { label: 'Заказов в час',            vals: ['TOTAL_ORD_HR_DYN', 'DYNAMIC_ORD_HR'] },
      { label: 'Прибыль в час',            vals: ['ALLTIME', 'DYNAMIC'] }
    ]
  };

  return { transport, slot, total };
}

/**
 * Агрегация заказов по дням, неделям, месяцам, тепловой карте и сравнению
 */
function buildDatasetsFromOrders(orders) {
  const daysMap = new Map();
  orders.forEach(o => {
    if (!daysMap.has(o.date)) {
      daysMap.set(o.date, {
        dateInfo: o.dateInfo,
        orders: [],
        slotsMap: new Map()
      });
    }
    const dayObj = daysMap.get(o.date);
    dayObj.orders.push(o);

    const sNum = o.slotNumber;
    if (!dayObj.slotsMap.has(sNum)) {
      dayObj.slotsMap.set(sNum, []);
    }
    dayObj.slotsMap.get(sNum).push(o);
  });

  const sortedDates = Array.from(daysMap.keys()).sort();
  const days = [];
  const transportUsage = {};

  sortedDates.forEach(dateKey => {
    const dayObj = daysMap.get(dateKey);
    const dayOrders = dayObj.orders;
    const dateInfo = dayObj.dateInfo;

    let totalSlotHours = 0;
    let daySlotExpenses = 0;

    dayObj.slotsMap.forEach(slotOrders => {
      const minStart = Math.min(...slotOrders.map(o => o.startSecs));
      const maxEnd = Math.max(...slotOrders.map(o => o.endSecs));
      let durHr = 0;
      if (maxEnd >= minStart) {
        durHr = (maxEnd - minStart) / 3600;
      } else {
        durHr = (maxEnd + 86400 - minStart) / 3600;
      }
      durHr = Math.max(0.3, durHr);
      totalSlotHours += durHr;

      const exps = slotOrders.map(o => o.expense).filter(e => e > 0);
      if (exps.length > 0) {
        const allSame = exps.every(e => Math.abs(e - exps[0]) < 0.01);
        if (allSame) {
          daySlotExpenses += exps[0];
        } else {
          daySlotExpenses += exps.reduce((a, b) => a + b, 0);
        }
      }
    });

    totalSlotHours = Math.round(totalSlotHours * 10) / 10;
    if (totalSlotHours <= 0) totalSlotHours = 1;

    const ordersCost = Math.round(dayOrders.reduce((a, o) => a + o.orderCost + (o.wait || 0), 0));
    const surgeRub = Math.round(dayOrders.reduce((a, o) => a + o.surgeRub, 0));
    const surgePct = ordersCost > 0 ? Math.round((surgeRub / ordersCost) * 100) : 0;
    const ratingRub = Math.round(dayOrders.reduce((a, o) => a + o.ratingRub, 0));
    const ratingPct = ordersCost > 0 ? Math.round((ratingRub / ordersCost) * 100) : 0;
    const bonuses = Math.round(dayOrders.reduce((a, o) => a + o.bonus, 0));
    const goals = Math.round(dayOrders.reduce((a, o) => a + o.goal, 0));

    // Расходы слотов добавляем в userSlotExpenses (не в корректировки)
    const userSlotExpenses = Math.round(daySlotExpenses);
    const adjustments = 0;

    // Сбор уникальных видов транспорта за день
    const distinctTransports = Array.from(new Set(dayOrders.map(o => o.transportLabel)));
    const transportSummary = distinctTransports.join(' + ');

    const tCounts = {};
    dayOrders.forEach(o => {
      tCounts[o.transportKey] = (tCounts[o.transportKey] || 0) + 1;
      transportUsage[o.transportKey] = (transportUsage[o.transportKey] || 0) + 1;
    });
    let domTKey = 'walk';
    let maxCnt = 0;
    Object.keys(tCounts).forEach(k => {
      if (tCounts[k] > maxCnt) {
        maxCnt = tCounts[k];
        domTKey = k;
      }
    });
    const domTLabel = (transportMeta[domTKey] && transportMeta[domTKey].label) || 'Пеший';

    const subRows = [];
    if (distinctTransports.length > 1) {
      distinctTransports.forEach(tLabel => {
        const tOrders = dayOrders.filter(o => o.transportLabel === tLabel);
        if (tOrders.length === 0) return;
        const tKey = tOrders[0].transportKey || 'walk';

        const tSlotsMap = new Map();
        tOrders.forEach(o => {
          if (!tSlotsMap.has(o.slotNumber)) tSlotsMap.set(o.slotNumber, []);
          tSlotsMap.get(o.slotNumber).push(o);
        });

        let tSlotHours = 0;
        let tSlotExpenses = 0;
        tSlotsMap.forEach(slotOrders => {
          const minStart = Math.min(...slotOrders.map(o => o.startSecs));
          const maxEnd = Math.max(...slotOrders.map(o => o.endSecs));
          let durHr = 0;
          if (maxEnd >= minStart) {
            durHr = (maxEnd - minStart) / 3600;
          } else {
            durHr = (maxEnd + 86400 - minStart) / 3600;
          }
          durHr = Math.max(0.3, durHr);
          tSlotHours += durHr;

          const exps = slotOrders.map(o => o.expense).filter(e => e > 0);
          if (exps.length > 0) {
            const allSame = exps.every(e => Math.abs(e - exps[0]) < 0.01);
            if (allSame) {
              tSlotExpenses += exps[0];
            } else {
              tSlotExpenses += exps.reduce((a, b) => a + b, 0);
            }
          }
        });

        tSlotHours = Math.round(tSlotHours * 10) / 10;
        if (tSlotHours <= 0) tSlotHours = 0.5;

        const tOrdersCost = Math.round(tOrders.reduce((a, o) => a + o.orderCost + (o.wait || 0), 0));
        const tSurgeRub = Math.round(tOrders.reduce((a, o) => a + o.surgeRub, 0));
        const tSurgePct = tOrdersCost > 0 ? Math.round((tSurgeRub / tOrdersCost) * 100) : 0;
        const tRatingRub = Math.round(tOrders.reduce((a, o) => a + o.ratingRub, 0));
        const tRatingPct = tOrdersCost > 0 ? Math.round((tRatingRub / tOrdersCost) * 100) : 0;
        const tBonuses = Math.round(tOrders.reduce((a, o) => a + o.bonus, 0));
        const tGoals = Math.round(tOrders.reduce((a, o) => a + o.goal, 0));

        subRows.push({
          date: dateInfo.displayDate,
          fullDisplayDate: dateInfo.fullDisplayDate,
          fullDate: dateKey,
          dayOfWeek: dateInfo.dayOfWeek,
          slotHours: tSlotHours,
          ordersCount: tOrders.length,
          transport: tLabel,
          transportKey: tKey,
          ordersCost: tOrdersCost,
          surgePct: tSurgePct,
          surgeRub: tSurgeRub,
          ratingPct: tRatingPct,
          ratingRub: tRatingRub,
          bonuses: tBonuses,
          goals: tGoals,
          tips: 0,
          userSlotExpenses: Math.round(tSlotExpenses),
          adjustments: 0,
          year: dateInfo.year
        });
      });
    }

    days.push({
      date: dateInfo.displayDate,
      fullDisplayDate: dateInfo.fullDisplayDate,
      fullDate: dateKey,
      dayOfWeek: dateInfo.dayOfWeek,
      slotHours: totalSlotHours,
      ordersCount: dayOrders.length,
      transport: domTLabel,
      transportKey: domTKey,
      distinctTransports,
      transportSummary,
      ordersCost,
      surgePct,
      surgeRub,
      ratingPct,
      ratingRub,
      bonuses,
      goals,
      tips: 0,
      userSlotExpenses,
      adjustments,
      subRows: subRows.length > 0 ? subRows : null,
      weekKey: dateInfo.weekKey,
      monthKey: dateInfo.monthKey,
      year: dateInfo.year,
      seasonKey: dateInfo.seasonKey
    });
  });

  let dominantTransportKey = 'walk';
  let maxTU = 0;
  Object.keys(transportUsage).forEach(k => {
    if (transportUsage[k] > maxTU) {
      maxTU = transportUsage[k];
      dominantTransportKey = k;
    }
  });

  // Сезоны, реально представленные в данных пользователя
  const availableSeasons = Array.from(new Set(days.map(d => d.seasonKey)));

  // Группировка по неделям с учетом выбранного дня старта недели
  const weeksMap = new Map();
  days.forEach(d => {
    const cycle = getWeekCycleInfo(getDayDateObj(d), state.weekStartDay);
    const wkKey = cycle ? cycle.cycleKey : d.weekKey;
    if (!weeksMap.has(wkKey)) {
      weeksMap.set(wkKey, { cycle, days: [] });
    }
    weeksMap.get(wkKey).days.push(d);
  });

  const weeks = [];
  weeksMap.forEach(({ cycle, days: wDays }, wkKey) => {
    const slotHours = Math.round(wDays.reduce((a, d) => a + d.slotHours, 0) * 10) / 10;
    const ordersCount = wDays.reduce((a, d) => a + d.ordersCount, 0);
    const ordersCost = wDays.reduce((a, d) => a + d.ordersCost, 0);
    const surgeRub = wDays.reduce((a, d) => a + d.surgeRub, 0);
    const surgePct = ordersCost > 0 ? Math.round((surgeRub / ordersCost) * 100) : 0;
    const ratingRub = wDays.reduce((a, d) => a + d.ratingRub, 0);
    const ratingPct = ordersCost > 0 ? Math.round((ratingRub / ordersCost) * 100) : 0;
    const bonuses = wDays.reduce((a, d) => a + d.bonuses, 0);
    const goals = wDays.reduce((a, d) => a + d.goals, 0);
    const userSlotExpenses = wDays.reduce((a, d) => a + d.userSlotExpenses, 0);
    const adjustments = 0;

    const distinctTransports = Array.from(new Set(wDays.flatMap(d => d.distinctTransports)));
    const transportSummary = distinctTransports.join(' + ');
    const wkDisplay = cycle ? cycle.label : (wDays[0].weekKey || 'Неделя');
    const dowDisplay = cycle ? cycle.dayRangeLabel : 'Пн–Вс';

    weeks.push({
      date: wkDisplay,
      weekCycleKey: wkKey,
      fullDisplayDate: `${wkDisplay} (${wDays[0].year || 2026})`,
      dayOfWeek: dowDisplay,
      slotHours,
      ordersCount,
      transport: wDays[0].transport,
      transportKey: wDays[0].transportKey,
      distinctTransports,
      transportSummary,
      ordersCost,
      surgePct,
      surgeRub,
      ratingPct,
      ratingRub,
      bonuses,
      goals,
      tips: 0,
      userSlotExpenses,
      adjustments,
      year: wDays[0].year || 2026
    });
  });

  // Группировка по месяцам
  const monthsMap = new Map();
  days.forEach(d => {
    const mk = d.monthKey;
    if (!monthsMap.has(mk)) monthsMap.set(mk, []);
    monthsMap.get(mk).push(d);
  });

  const months = [];
  monthsMap.forEach((mDays, mk) => {
    const slotHours = Math.round(mDays.reduce((a, d) => a + d.slotHours, 0) * 10) / 10;
    const ordersCount = mDays.reduce((a, d) => a + d.ordersCount, 0);
    const ordersCost = mDays.reduce((a, d) => a + d.ordersCost, 0);
    const surgeRub = mDays.reduce((a, d) => a + d.surgeRub, 0);
    const surgePct = ordersCost > 0 ? Math.round((surgeRub / ordersCost) * 100) : 0;
    const ratingRub = mDays.reduce((a, d) => a + d.ratingRub, 0);
    const ratingPct = ordersCost > 0 ? Math.round((ratingRub / ordersCost) * 100) : 0;
    const bonuses = mDays.reduce((a, d) => a + d.bonuses, 0);
    const goals = mDays.reduce((a, d) => a + d.goals, 0);
    const userSlotExpenses = mDays.reduce((a, d) => a + d.userSlotExpenses, 0);
    const adjustments = 0;

    const distinctTransports = Array.from(new Set(mDays.flatMap(d => d.distinctTransports)));
    const transportSummary = distinctTransports.join(' + ');

    months.push({
      date: mk,
      monthKey: mk,
      fullDisplayDate: `${mk} ${mDays[0].year || 2026}`,
      dayOfWeek: 'Месяц',
      slotHours,
      ordersCount,
      transport: mDays[0].transport,
      transportKey: mDays[0].transportKey,
      distinctTransports,
      transportSummary,
      ordersCost,
      surgePct,
      surgeRub,
      ratingPct,
      ratingRub,
      bonuses,
      goals,
      tips: 0,
      userSlotExpenses,
      adjustments,
      year: mDays[0].year || 2026,
      daysCount: mDays.length
    });
  });

  // Тепловая карта спроса: ячейки БЕЗ данных отмечаются null (в UI выводятся прочерком)
  const heatmapMatrix = [
    { hours: '02:00–06:00', values: [null, null, null, null, null, null, null] },
    { hours: '06:00–10:00', values: [null, null, null, null, null, null, null] },
    { hours: '10:00–14:00', values: [null, null, null, null, null, null, null] },
    { hours: '14:00–18:00', values: [null, null, null, null, null, null, null] },
    { hours: '18:00–22:00', values: [null, null, null, null, null, null, null] },
    { hours: '22:00–02:00', values: [null, null, null, null, null, null, null] }
  ];

  const timeBuckets = [
    { r: 0, start: 2 * 3600,  end: 6 * 3600 },
    { r: 1, start: 6 * 3600,  end: 10 * 3600 },
    { r: 2, start: 10 * 3600, end: 14 * 3600 },
    { r: 3, start: 14 * 3600, end: 18 * 3600 },
    { r: 4, start: 18 * 3600, end: 22 * 3600 },
    { r: 5, start: 22 * 3600, end: 2 * 3600 }
  ];

  const cellOrderBuckets = Array.from({ length: 6 }, () => Array.from({ length: 7 }, () => []));

  orders.forEach(o => {
    const s = o.startSecs;
    const c = o.dowIdx;
    let matchedR = -1;
    for (let i = 0; i < timeBuckets.length; i++) {
      const b = timeBuckets[i];
      if (b.r === 5) {
        if (s >= 22 * 3600 || s < 2 * 3600) {
          matchedR = 5;
          break;
        }
      } else {
        if (s >= b.start && s < b.end) {
          matchedR = b.r;
          break;
        }
      }
    }
    if (matchedR >= 0 && c >= 0 && c <= 6) {
      cellOrderBuckets[matchedR][c].push(o);
    }
  });

  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 7; c++) {
      const list = cellOrderBuckets[r][c];
      if (list.length > 0) {
        const avgSurge = Math.round(list.reduce((a, o) => a + o.surgePct, 0) / list.length);
        const sumCost = list.reduce((a, o) => a + o.baseCost + o.surgeRub + o.ratingRub + o.bonus, 0);

        // Расчет фактически отработанного времени курьера на слотах внутри этого временного окна
        // Группируем заказы ячейки по дням и слотам, определяя полный интервал смены (maxEnd - minStart)
        const daySlotGroups = new Map();
        list.forEach(o => {
          const k = `${o.dateKey || o.date}_${o.slotNumber || 1}`;
          if (!daySlotGroups.has(k)) daySlotGroups.set(k, []);
          daySlotGroups.get(k).push(o);
        });

        let totalWorkingSecs = 0;
        daySlotGroups.forEach(slotOrders => {
          const minStart = Math.min(...slotOrders.map(o => o.startSecs));
          const maxEnd = Math.max(...slotOrders.map(o => o.endSecs));
          let spanSecs = maxEnd >= minStart ? (maxEnd - minStart) : (maxEnd + 86400 - minStart);
          const sumOrderDur = slotOrders.reduce((a, o) => a + ((o.durationMins || 20) * 60), 0);
          spanSecs = Math.max(spanSecs, sumOrderDur);
          totalWorkingSecs += spanSecs;
        });

        const cellHrs = Math.max(0.4, totalWorkingSecs / 3600);
        const avgRubHr = Math.round(sumCost / cellHrs);
        heatmapMatrix[r].values[c] = { pct: avgSurge, rubHr: avgRubHr };
      } else {
        heatmapMatrix[r].values[c] = null;
      }
    }
  }

  const comparisonDatasets = buildComparisonDatasets(orders, days);
  const distinctTransports = Array.from(new Set(orders.map(o => o.transportLabel)));

  return {
    orders,
    days,
    weeks,
    months,
    heatmapMatrix,
    comparisonDatasets,
    dominantTransportKey,
    availableSeasons,
    distinctTransports
  };
}

/**
 * Обработка строк данных после чтения файла
 */
function processLoadedRows(rawRows, fileName) {
  if (!rawRows || rawRows.length < 2) {
    showToast('Файл пуст или содержит только строку заголовков');
    return;
  }

  const parsedOrders = parseOrdersFromRows(rawRows);
  if (parsedOrders.length === 0) {
    showToast('Не удалось распознать заказы в файле');
    return;
  }

  const userDatasets = buildDatasetsFromOrders(parsedOrders);

  state.usingUserData = true;
  state.userDataFileName = fileName;
  state.userDataOrders = parsedOrders;
  state.userDatasets = userDatasets;
  state.period = 'days';
  state.selectedBarIndex = userDatasets.days.length - 1;
  state.selectedSlotCells = [];

  if (userDatasets.dominantTransportKey) {
    state.accountTransport = userDatasets.dominantTransportKey;
    state.selectedPreset = userDatasets.dominantTransportKey;
  }

  if (dom.btnResetData) dom.btnResetData.classList.remove('hidden');
  if (dom.dataStatusBadge) {
    dom.dataStatusBadge.innerHTML = `Источник: <b class="text-emerald-400">Файл «${escapeHtml(fileName)}» (${parsedOrders.length} зак.)</b>`;
  }

  dataCache.invalidate();
  renderAll();
  showToast(`Загружено ${parsedOrders.length} заказов из «${fileName}»! Все расчеты обновлены.`);
}

/**
 * Инициация диалога выбора файла в Windows
 */
function triggerUserDataFileInput() {
  if (dom.userDataFileInput) {
    dom.userDataFileInput.value = '';
    dom.userDataFileInput.click();
  }
}

/**
 * Обработчик загрузки файла пользователем (Excel .xlsx/.xls или CSV/.txt)
 */
function handleUserDataFileUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const fileName = file.name;
  const lowerName = fileName.toLowerCase();
  const isExcel = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.ods');

  const reader = new FileReader();

  if (isExcel) {
    reader.onload = function(e) {
      try {
        if (typeof XLSX === 'undefined') {
          showToast('Библиотека Excel еще загружается, попробуйте снова через пару секунд');
          return;
        }
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
        processLoadedRows(rawRows, fileName);
      } catch (err) {
        console.error('Ошибка чтения Excel:', err);
        showToast('Ошибка при чтении Excel-файла: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  } else {
    reader.onload = function(e) {
      try {
        const text = e.target.result;
        const rawRows = parseCSVText(text);
        processLoadedRows(rawRows, fileName);
      } catch (err) {
        console.error('Ошибка чтения CSV:', err);
        showToast('Ошибка при чтении CSV-файла: ' + err.message);
      }
    };
    reader.readAsText(file, 'utf-8');
  }
}

/**
 * Сброс загруженных данных и возврат к демо-данным
 */
function resetToDemoData() {
  state.usingUserData = false;
  state.userDataFileName = '';
  state.userDataOrders = [];
  state.userDatasets = null;
  state.period = 'days';
  state.selectedBarIndex = rawDatasets.days.length - 1;
  state.selectedSlotCells = [];
  state.accountTransport = 'ebike';
  state.selectedPreset = 'ebike';

  if (dom.btnResetData) dom.btnResetData.classList.add('hidden');
  if (dom.dataStatusBadge) {
    dom.dataStatusBadge.innerHTML = 'Источник: <b class="text-amber-400">Демо-данные</b>';
  }

  dataCache.invalidate();
  renderAll();
  showToast('Возврат к демонстрационным данным');
}

/**
 * Переключение режима отображения: Телефон / ПК (на всю ширину)
 */
function toggleLayoutMode() {
  state.layoutMode = state.layoutMode === 'phone' ? 'pc' : 'phone';
  const isPc = state.layoutMode === 'pc';
  document.body.classList.toggle('desktop-mode', isPc);
  if (dom.lblLayoutMode) dom.lblLayoutMode.textContent = isPc ? 'ПК' : 'Телефон';
  if (dom.lblLayoutIcon) dom.lblLayoutIcon.textContent = isPc ? '💻' : '📱';
  if (dom.btnLayoutMode) {
    dom.btnLayoutMode.classList.toggle('bg-[#FCE000]', isPc);
    dom.btnLayoutMode.classList.toggle('text-[#141518]', isPc);
  }
  showToast(isPc ? 'Режим: ПК (на всю ширину браузера)' : 'Режим: Телефон (компактный)');
}

// -----------------------------------------------------------------------------
// 4. МАТЕМАТИКА И ВЫЧИСЛЕНИЯ
// -----------------------------------------------------------------------------

function getPeriodExpenseFactor(periodKey, rawRow = null) {
  if (periodKey === 'days') return 1 / 7;
  if (periodKey === 'months') {
    if (rawRow) {
      const days = getDaysInMonthFromRow(rawRow);
      return days / 7;
    }
    return 30.4167 / 7;
  }
  return 1;
}

function getWeeklyExpenseForTransport(transportKey) {
  const list = state.expensesByTransport[transportKey] || [];
  return list.reduce((acc, item) => acc + Number(item.value || 0), 0);
}

const getTotalWeeklyExpenses = () => getWeeklyExpenseForTransport(state.selectedPreset);

function enrichRow(rawRow, periodKey, dayMeta = null) {
  const goalsVal = state.includeGoals ? rawRow.goals : 0;
  const grossTotal = rawRow.ordersCost + rawRow.surgeRub + rawRow.ratingRub + rawRow.bonuses + goalsVal + rawRow.tips;
  const tax = Math.round(grossTotal * 0.06);

  const slotTransportKey = rawRow.transportKey || state.selectedPreset || 'ebike';
  const slotExpensesList = state.expensesByTransport[slotTransportKey] || [];

  let itemizedExpenses = [];
  if (periodKey === 'days') {
    // 7-дневный цикл списания: 1/7 в обычные дни и остаток на последний отработанный день недели
    itemizedExpenses = slotExpensesList.map(e => {
      const val = Number(e.value || 0);
      const baseDailyRate = Math.round(val / 7);
      let amount = baseDailyRate;
      if (dayMeta && dayMeta.isLastWorkedDay) {
        const priorDays = Math.max(0, (dayMeta.totalWorkedDaysInCycle || 1) - 1);
        amount = Math.max(0, val - priorDays * baseDailyRate);
      }
      return {
        name: e.name,
        amount
      };
    });
  } else if (periodKey === 'months') {
    // Плавающий коэффициент месяца: точное количество дней в месяце / 7
    const daysInMonth = getDaysInMonthFromRow(rawRow);
    const monthFactor = daysInMonth / 7;
    itemizedExpenses = slotExpensesList.map(e => ({
      name: e.name,
      amount: Math.round(Number(e.value || 0) * monthFactor)
    }));
  } else {
    // Недели: недельный расход в полном объеме (коэффициент 1.0)
    itemizedExpenses = slotExpensesList.map(e => ({
      name: e.name,
      amount: Math.round(Number(e.value || 0))
    }));
  }

  const baseExpense = itemizedExpenses.reduce((a, b) => a + b.amount, 0);
  const userExpense = Math.round(Number(rawRow.userSlotExpenses || 0));
  if (userExpense > 0) {
    itemizedExpenses.push({
      name: 'Расход (по слотам)',
      amount: userExpense
    });
  }
  const rowExpense = baseExpense + userExpense;

  const penaltyAdjustments = -Math.abs(Number(rawRow.adjustments || 0));
  const netProfit = grossTotal - tax - rowExpense + penaltyAdjustments;
  const ordersPerHr = rawRow.slotHours > 0 ? (rawRow.ordersCount / rawRow.slotHours).toFixed(2) : '0.00';
  const profitPerHr = rawRow.slotHours > 0 ? Math.round(netProfit / rawRow.slotHours) : 0;
  const grossPerHr = rawRow.slotHours > 0 ? Math.round(grossTotal / rawRow.slotHours) : 0;

  // Чистая прибыль и ставка в час без доплат и бонусов
  const surchargesAndBonuses = (rawRow.surgeRub || 0) + (rawRow.ratingRub || 0) + (rawRow.bonuses || 0) + goalsVal;
  const netProfitNoBonus = netProfit - surchargesAndBonuses;
  const profitPerHrNoBonus = rawRow.slotHours > 0 ? Math.round(netProfitNoBonus / rawRow.slotHours) : 0;

  let dayOfWeek = rawRow.dayOfWeek;
  if (periodKey === 'weeks') {
    const sName = shortDayNames[state.weekStartDay] || 'Пн';
    const eName = shortDayNames[(state.weekStartDay + 6) % 7] || 'Вс';
    dayOfWeek = `${sName}–${eName}`;
  }

  return {
    ...rawRow,
    dayOfWeek,
    adjustments: penaltyAdjustments,
    goals: goalsVal,
    grossTotal,
    grossPerHr,
    tax,
    expenses: rowExpense,
    itemizedExpenses,
    netProfit,
    netProfitNoBonus,
    ordersPerHr,
    profitPerHr,
    profitPerHrNoBonus
  };
}

function enrichDailyDataset(dayRows) {
  if (!dayRows || dayRows.length === 0) return [];

  // Группировка дней по 7-дневным недельным циклам от выбранного state.weekStartDay
  const cycleMap = new Map();
  dayRows.forEach((row, idx) => {
    const dObj = row.dateObj || getDayDateObj(row);
    const cycle = getWeekCycleInfo(dObj, state.weekStartDay);
    const key = cycle ? cycle.cycleKey : 'default';
    if (!cycleMap.has(key)) {
      cycleMap.set(key, []);
    }
    cycleMap.get(key).push({ row, idx, dateMs: dObj.getTime() });
  });

  const metaByIndex = new Map();
  cycleMap.forEach((items) => {
    items.sort((a, b) => a.dateMs - b.dateMs);
    const totalDaysInCycle = items.length;
    items.forEach((item, pos) => {
      const isLastWorkedDay = (pos === totalDaysInCycle - 1);
      metaByIndex.set(item.idx, {
        isLastWorkedDay,
        dayPosition: pos + 1,
        totalWorkedDaysInCycle: totalDaysInCycle
      });
    });
  });

  return dayRows.map((rawRow, idx) => {
    const meta = metaByIndex.get(idx) || { isLastWorkedDay: true, dayPosition: 1, totalWorkedDaysInCycle: 1 };
    const enriched = enrichRow(rawRow, 'days', meta);
    if (Array.isArray(rawRow.subRows) && rawRow.subRows.length > 0) {
      enriched.subRows = rawRow.subRows.map(sr => enrichRow(sr, 'days', meta));
    }
    return enriched;
  });
}

/**
 * Вспомогательная функция для агрегации подстрок по видам транспорта в неделях и месяцах
 */
function buildSubRowsFromEnrichedItems(items, dateDisplay, fullDisplayDate, dowDisplay, year) {
  const allTransports = Array.from(new Set(items.flatMap(d => {
    if (Array.isArray(d.subRows) && d.subRows.length > 0) {
      return d.subRows.map(sr => sr.transport);
    }
    return [d.transport || 'Курьер'];
  })));

  if (allTransports.length <= 1) return null;

  const subRows = [];
  allTransports.forEach(tName => {
    const matching = [];
    items.forEach(d => {
      if (Array.isArray(d.subRows) && d.subRows.length > 0) {
        d.subRows.forEach(sr => {
          if (sr.transport === tName) matching.push(sr);
        });
      } else if (d.transport === tName) {
        matching.push(d);
      }
    });

    if (matching.length === 0) return;

    const sHours = Math.round(matching.reduce((a, x) => a + Number(x.slotHours || 0), 0) * 10) / 10;
    const sOrders = matching.reduce((a, x) => a + Number(x.ordersCount || 0), 0);
    const sCost = matching.reduce((a, x) => a + Number(x.ordersCost || 0), 0);
    const sSurge = matching.reduce((a, x) => a + Number(x.surgeRub || 0), 0);
    const sRating = matching.reduce((a, x) => a + Number(x.ratingRub || 0), 0);
    const sBonus = matching.reduce((a, x) => a + Number(x.bonuses || 0), 0);
    const sGoals = matching.reduce((a, x) => a + Number(x.goals || 0), 0);
    const sTips = matching.reduce((a, x) => a + Number(x.tips || 0), 0);
    const sGross = matching.reduce((a, x) => a + Number(x.grossTotal || 0), 0);
    const sTax = matching.reduce((a, x) => a + Number(x.tax || 0), 0);
    const sExp = matching.reduce((a, x) => a + Number(x.expenses || 0), 0);
    const sNet = matching.reduce((a, x) => a + Number(x.netProfit || 0), 0);
    const sNetNoBonus = matching.reduce((a, x) => a + Number(x.netProfitNoBonus != null ? x.netProfitNoBonus : (x.netProfit - x.surgeRub - x.ratingRub - x.bonuses)), 0);

    subRows.push({
      date: dateDisplay,
      fullDisplayDate: fullDisplayDate,
      dayOfWeek: dowDisplay,
      slotHours: sHours,
      ordersCount: sOrders,
      ordersPerHr: sHours > 0 ? (sOrders / sHours).toFixed(2) : '0.00',
      transport: tName,
      transportKey: matching[0].transportKey || 'walk',
      ordersCost: sCost,
      surgePct: sCost > 0 ? Math.round((sSurge / sCost) * 100) : 0,
      surgeRub: sSurge,
      ratingPct: sCost > 0 ? Math.round((sRating / sCost) * 100) : 0,
      ratingRub: sRating,
      bonuses: sBonus,
      goals: sGoals,
      tips: sTips,
      adjustments: 0,
      grossTotal: sGross,
      grossPerHr: sHours > 0 ? Math.round(sGross / sHours) : 0,
      tax: sTax,
      expenses: sExp,
      netProfit: sNet,
      netProfitNoBonus: sNetNoBonus,
      profitPerHr: sHours > 0 ? Math.round(sNet / sHours) : 0,
      profitPerHrNoBonus: sHours > 0 ? Math.round(sNetNoBonus / sHours) : 0,
      year: year || 2026
    });
  });

  return subRows.length > 1 ? subRows : null;
}

/**
 * Агрегация недель напрямую из обогащенных дней (Bottom-Up)
 * Гарантирует, что сумма чистой прибыли и расходов дней недели в точности равна показателям недели
 */
function buildEnrichedWeeksFromEnrichedDays(enrichedDays) {
  if (!enrichedDays || enrichedDays.length === 0) return [];

  const weeksMap = new Map();
  enrichedDays.forEach(d => {
    const cycle = getWeekCycleInfo(d.dateObj || getDayDateObj(d), state.weekStartDay);
    const wkKey = cycle ? cycle.cycleKey : (d.weekKey || d.date);
    if (!weeksMap.has(wkKey)) {
      weeksMap.set(wkKey, { cycle, days: [] });
    }
    weeksMap.get(wkKey).days.push(d);
  });

  const weeks = [];
  weeksMap.forEach(({ cycle, days: wDays }, wkKey) => {
    const slotHours = Math.round(wDays.reduce((a, d) => a + Number(d.slotHours || 0), 0) * 10) / 10;
    const ordersCount = wDays.reduce((a, d) => a + Number(d.ordersCount || 0), 0);
    const ordersCost = wDays.reduce((a, d) => a + Number(d.ordersCost || 0), 0);
    const surgeRub = wDays.reduce((a, d) => a + Number(d.surgeRub || 0), 0);
    const surgePct = ordersCost > 0 ? Math.round((surgeRub / ordersCost) * 100) : 0;
    const ratingRub = wDays.reduce((a, d) => a + Number(d.ratingRub || 0), 0);
    const ratingPct = ordersCost > 0 ? Math.round((ratingRub / ordersCost) * 100) : 0;
    const bonuses = wDays.reduce((a, d) => a + Number(d.bonuses || 0), 0);
    const goals = wDays.reduce((a, d) => a + Number(d.goals || 0), 0);
    const tips = wDays.reduce((a, d) => a + Number(d.tips || 0), 0);
    const adjustments = wDays.reduce((a, d) => a + Number(d.adjustments || 0), 0);
    const grossTotal = wDays.reduce((a, d) => a + Number(d.grossTotal || 0), 0);
    const tax = wDays.reduce((a, d) => a + Number(d.tax || 0), 0);
    const expenses = wDays.reduce((a, d) => a + Number(d.expenses || 0), 0);
    const userSlotExpenses = wDays.reduce((a, d) => a + Number(d.userSlotExpenses || 0), 0);
    const netProfit = wDays.reduce((a, d) => a + Number(d.netProfit || 0), 0);

    const expMap = new Map();
    wDays.forEach(d => {
      (d.itemizedExpenses || []).forEach(e => {
        expMap.set(e.name, (expMap.get(e.name) || 0) + Number(e.amount || 0));
      });
    });
    const itemizedExpenses = Array.from(expMap.entries()).map(([name, amount]) => ({ name, amount }));

    const distinctTransports = Array.from(new Set(wDays.flatMap(d => d.distinctTransports || [d.transport || 'Курьер'])));
    const transportSummary = distinctTransports.join(' + ');
    const wkDisplay = cycle ? cycle.label : (wDays[0].weekKey || 'Неделя');
    const dowDisplay = cycle ? cycle.dayRangeLabel : 'Пн–Вс';

    const ordersPerHr = slotHours > 0 ? (ordersCount / slotHours).toFixed(2) : '0.00';
    const profitPerHr = slotHours > 0 ? Math.round(netProfit / slotHours) : 0;
    const grossPerHr = slotHours > 0 ? Math.round(grossTotal / slotHours) : 0;

    const netProfitNoBonus = wDays.reduce((a, d) => a + Number(d.netProfitNoBonus != null ? d.netProfitNoBonus : (d.netProfit - d.surgeRub - d.ratingRub - d.bonuses)), 0);
    const profitPerHrNoBonus = slotHours > 0 ? Math.round(netProfitNoBonus / slotHours) : 0;
    const subRows = buildSubRowsFromEnrichedItems(wDays, wkDisplay, `${wkDisplay} (${wDays[0].year || 2026})`, dowDisplay, wDays[0].year || 2026);

    weeks.push({
      date: wkDisplay,
      weekCycleKey: wkKey,
      fullDisplayDate: `${wkDisplay} (${wDays[0].year || 2026})`,
      dayOfWeek: dowDisplay,
      slotHours,
      ordersCount,
      transport: wDays[0].transport || 'Курьер',
      transportKey: wDays[0].transportKey || 'walk',
      distinctTransports,
      transportSummary,
      ordersCost,
      surgePct,
      surgeRub,
      ratingPct,
      ratingRub,
      bonuses,
      goals,
      tips,
      adjustments,
      grossTotal,
      grossPerHr,
      tax,
      expenses,
      userSlotExpenses,
      itemizedExpenses,
      netProfit,
      netProfitNoBonus,
      ordersPerHr,
      profitPerHr,
      profitPerHrNoBonus,
      subRows,
      year: wDays[0].year || 2026
    });
  });

  return weeks;
}

/**
 * Агрегация месяцев напрямую из обогащенных дней (Bottom-Up)
 * Гарантирует, что сумма чистой прибыли и расходов дней месяца в точности равна показателям месяца
 */
function buildEnrichedMonthsFromEnrichedDays(enrichedDays) {
  if (!enrichedDays || enrichedDays.length === 0) return [];

  const monthsMap = new Map();
  enrichedDays.forEach(d => {
    const mk = d.monthKey || (d.dateObj ? d.dateObj.toLocaleString('ru-RU', { month: 'long' }) : 'Месяц');
    if (!monthsMap.has(mk)) {
      monthsMap.set(mk, []);
    }
    monthsMap.get(mk).push(d);
  });

  const months = [];
  monthsMap.forEach((mDays, mk) => {
    const slotHours = Math.round(mDays.reduce((a, d) => a + Number(d.slotHours || 0), 0) * 10) / 10;
    const ordersCount = mDays.reduce((a, d) => a + Number(d.ordersCount || 0), 0);
    const ordersCost = mDays.reduce((a, d) => a + Number(d.ordersCost || 0), 0);
    const surgeRub = mDays.reduce((a, d) => a + Number(d.surgeRub || 0), 0);
    const surgePct = ordersCost > 0 ? Math.round((surgeRub / ordersCost) * 100) : 0;
    const ratingRub = mDays.reduce((a, d) => a + Number(d.ratingRub || 0), 0);
    const ratingPct = ordersCost > 0 ? Math.round((ratingRub / ordersCost) * 100) : 0;
    const bonuses = mDays.reduce((a, d) => a + Number(d.bonuses || 0), 0);
    const goals = mDays.reduce((a, d) => a + Number(d.goals || 0), 0);
    const tips = mDays.reduce((a, d) => a + Number(d.tips || 0), 0);
    const adjustments = mDays.reduce((a, d) => a + Number(d.adjustments || 0), 0);
    const grossTotal = mDays.reduce((a, d) => a + Number(d.grossTotal || 0), 0);
    const tax = mDays.reduce((a, d) => a + Number(d.tax || 0), 0);
    const expenses = mDays.reduce((a, d) => a + Number(d.expenses || 0), 0);
    const userSlotExpenses = mDays.reduce((a, d) => a + Number(d.userSlotExpenses || 0), 0);
    const netProfit = mDays.reduce((a, d) => a + Number(d.netProfit || 0), 0);

    const expMap = new Map();
    mDays.forEach(d => {
      (d.itemizedExpenses || []).forEach(e => {
        expMap.set(e.name, (expMap.get(e.name) || 0) + Number(e.amount || 0));
      });
    });
    const itemizedExpenses = Array.from(expMap.entries()).map(([name, amount]) => ({ name, amount }));

    const distinctTransports = Array.from(new Set(mDays.flatMap(d => d.distinctTransports || [d.transport || 'Курьер'])));
    const transportSummary = distinctTransports.join(' + ');

    const ordersPerHr = slotHours > 0 ? (ordersCount / slotHours).toFixed(2) : '0.00';
    const profitPerHr = slotHours > 0 ? Math.round(netProfit / slotHours) : 0;
    const grossPerHr = slotHours > 0 ? Math.round(grossTotal / slotHours) : 0;

    const netProfitNoBonus = mDays.reduce((a, d) => a + Number(d.netProfitNoBonus != null ? d.netProfitNoBonus : (d.netProfit - d.surgeRub - d.ratingRub - d.bonuses)), 0);
    const profitPerHrNoBonus = slotHours > 0 ? Math.round(netProfitNoBonus / slotHours) : 0;
    const subRows = buildSubRowsFromEnrichedItems(mDays, mk, `${mk} ${mDays[0].year || 2026}`, 'Месяц', mDays[0].year || 2026);

    months.push({
      date: mk,
      monthKey: mk,
      fullDisplayDate: `${mk} ${mDays[0].year || 2026}`,
      dayOfWeek: 'Месяц',
      slotHours,
      ordersCount,
      transport: mDays[0].transport || 'Курьер',
      transportKey: mDays[0].transportKey || 'walk',
      distinctTransports,
      transportSummary,
      ordersCost,
      surgePct,
      surgeRub,
      ratingPct,
      ratingRub,
      bonuses,
      goals,
      tips,
      adjustments,
      grossTotal,
      grossPerHr,
      tax,
      expenses,
      userSlotExpenses,
      itemizedExpenses,
      netProfit,
      netProfitNoBonus,
      ordersPerHr,
      profitPerHr,
      profitPerHrNoBonus,
      subRows,
      year: mDays[0].year || 2026,
      daysCount: mDays.length
    });
  });

  return months;
}

function getCurrentDataset() {
  const cacheKey = `${state.period}_${state.includeGoals}_${state.usingUserData ? 'user' : 'demo'}_ws${state.weekStartDay}`;
  if (dataCache.enriched.has(cacheKey)) {
    return dataCache.enriched.get(cacheKey);
  }
  const sourceDatasets = (state.usingUserData && state.userDatasets) ? state.userDatasets : rawDatasets;
  let enriched = [];

  if (state.usingUserData && state.userDatasets) {
    const enrichedDays = enrichDailyDataset(state.userDatasets.days || []);
    if (state.period === 'days') {
      enriched = enrichedDays;
    } else if (state.period === 'weeks') {
      enriched = buildEnrichedWeeksFromEnrichedDays(enrichedDays);
    } else if (state.period === 'months') {
      enriched = buildEnrichedMonthsFromEnrichedDays(enrichedDays);
    }
  } else {
    const list = sourceDatasets[state.period] || sourceDatasets.days || [];
    if (state.period === 'days') {
      enriched = enrichDailyDataset(list);
    } else {
      enriched = list.map(r => enrichRow(r, state.period));
    }
  }

  dataCache.enriched.set(cacheKey, enriched);
  return enriched;
}

function getAllTimeHourlyProfit() {
  if (dataCache.allTimeProfit !== null) {
    return dataCache.allTimeProfit;
  }
  if (state.usingUserData && state.userDatasets && state.userDatasets.orders) {
    const tStats = calculateTransportStats(state.userDatasets.orders);
    dataCache.allTimeProfit = tStats.totalProfitPerHr;
    return dataCache.allTimeProfit;
  }
  const sourceDatasets = rawDatasets;
  const periodRows = enrichDailyDataset(sourceDatasets.days || []);
  const totalNet = periodRows.reduce((a, r) => a + r.netProfit, 0);
  const totalHrs = periodRows.reduce((a, r) => a + r.slotHours, 0);
  dataCache.allTimeProfit = totalHrs > 0 ? Math.round(totalNet / totalHrs) : 0;
  return dataCache.allTimeProfit;
}

function getCourierHourlyExpense() {
  const totalWeeklyExpense = getTotalWeeklyExpenses();
  if (totalWeeklyExpense <= 0) return 0;

  let weeklyHours = 40;
  if (state.usingUserData && state.userDatasets?.days?.length) {
    const totalSlotHours = state.userDatasets.days.reduce((a, d) => a + Number(d.slotHours || 0), 0);
    const weeksCount = Math.max(1, state.userDatasets.weeks?.length || 1);
    weeklyHours = Math.max(10, Math.round(totalSlotHours / weeksCount));
  }
  return Math.round(totalWeeklyExpense / weeklyHours);
}

function getCellComputedValue(basePct) {
  if (basePct === null || basePct === undefined) {
    return null;
  }

  let pct = 0;
  let grossRubHr = 0;

  if (typeof basePct === 'object') {
    pct = Math.round(basePct.pct || 0);
    grossRubHr = Math.round(basePct.rubHr || 0);
  } else {
    const distObj = districtsData.find(d => d.id === state.districtId) || districtsData[0];
    const distFactor = distObj.avgPct / 42;
    const seasonFactor = seasonMultipliers[state.season]?.mult || 1;
    const weatherAdd = state.weatherBoost ? 16 : 0;
    const acctMeta = transportMeta[state.accountTransport] || transportMeta.ebike;

    pct = Math.round(basePct * distFactor * seasonFactor + weatherAdd);
    grossRubHr = Math.round(acctMeta.baseHourlyRub * (1 + pct / 100));
  }

  let finalRubHr = grossRubHr;
  if (state.isNet) {
    const tax = Math.round(grossRubHr * 0.06);
    const hourlyExp = getCourierHourlyExpense();
    finalRubHr = grossRubHr - tax - hourlyExp;
  }

  return { pct, rubHr: finalRubHr, grossRubHr };
}

function getSelectedSlotsSummary() {
  const count = state.selectedSlotCells.length;
  const totalHours = count * 4;
  let totalRubEst = 0;
  let totalPctSum = 0;
  let validCellCount = 0;
  const activeMatrix = (state.usingUserData && state.userDatasets && state.userDatasets.heatmapMatrix)
    ? state.userDatasets.heatmapMatrix
    : baseHeatmapMatrix;

  const items = [];
  state.selectedSlotCells.forEach(key => {
    const [r, c] = key.split('-').map(Number);
    const rowObj = activeMatrix[r] || baseHeatmapMatrix[r];
    const comp = getCellComputedValue(rowObj?.values[c]);
    if (comp) {
      totalRubEst += comp.rubHr * 4;
      totalPctSum += comp.pct;
      validCellCount++;
      items.push({ day: shortDayNames[c], hours: rowObj ? rowObj.hours : '', comp });
    }
  });

  return {
    count,
    totalHours,
    totalRubEst,
    avgHrEst: validCellCount > 0 ? Math.round(totalRubEst / (validCellCount * 4)) : 0,
    avgPctEst: validCellCount > 0 ? Math.round(totalPctSum / validCellCount) : 0,
    items
  };
}

function getDistrictStats(d) {
  const seasonFactor = seasonMultipliers[state.season].mult;
  const weatherAdd = state.weatherBoost ? 16 : 0;
  const acctMeta = transportMeta[state.accountTransport] || transportMeta.ebike;
  const avgPct  = Math.round(d.avgPct * seasonFactor + weatherAdd);
  const peakPct = Math.round(d.peakPct * seasonFactor + weatherAdd);
  const avgRub  = Math.round(acctMeta.baseHourlyRub * (1 + avgPct / 100));
  const peakRub = Math.round(acctMeta.baseHourlyRub * (1 + peakPct / 100));
  return {
    avgStr: state.heatUnitRub ? `${avgRub} ₽/ч` : `+${avgPct}%`,
    peakStr: state.heatUnitRub ? `${peakRub} ₽/ч` : `+${peakPct}%`
  };
}

function getTransportProfitPerHourForComparison(tKey, userHoursInPeriod, cachedDataset) {
  const allPeriodRows = cachedDataset || getCurrentDataset();
  const matchingRows = allPeriodRows.filter(r => r.transportKey === tKey);

  if (matchingRows.length > 0) {
    const sumVal = matchingRows.reduce((a, r) => a + (state.isNet ? r.netProfit : r.grossTotal), 0);
    const sumHrs = matchingRows.reduce((a, r) => a + r.slotHours, 0);
    return sumHrs > 0 ? Math.round(sumVal / sumHrs) : 0;
  }

  const cityAvgGrossHr = (transportMeta[tKey] && transportMeta[tKey].cityAvgGrossHr) || 980;
  const hrs = Math.max(1, userHoursInPeriod);
  const grossForUserHours = cityAvgGrossHr * hrs;
  const tax = Math.round(grossForUserHours * 0.06);
  const periodExpense = Math.round(getWeeklyExpenseForTransport(tKey) * getPeriodExpenseFactor(state.period));
  const netForecast = grossForUserHours - tax - periodExpense;
  const finalVal = state.isNet ? netForecast : grossForUserHours;
  return Math.round(finalVal / hrs);
}

// -----------------------------------------------------------------------------
// 5. РЕНДЕРИНГ КОМПОНЕНТОВ
// -----------------------------------------------------------------------------

/**
 * Быстрое обновление шапки и глобальных переключателей без трогания тяжелых блоков
 */
function renderHeader() {
  const allTimeProfitHr = getAllTimeHourlyProfit();
  if (allTimeProfitHr < 0) {
    dom.allTimeHourlyProfit.textContent = `-${formatNum(Math.abs(allTimeProfitHr))} ₽/ч`;
    dom.allTimeHourlyProfit.classList.add('text-rose-500');
  } else {
    dom.allTimeHourlyProfit.textContent = `${formatNum(allTimeProfitHr)} ₽/ч`;
    dom.allTimeHourlyProfit.classList.remove('text-rose-500');
  }
  dom.goalsStatusLabel.textContent = state.includeGoals ? '(с учетом целей)' : '(без учета целей)';

  dom.lblGross.classList.toggle('ya-switch-opt-active', !state.isNet);
  dom.lblNet.classList.toggle('ya-switch-opt-active', state.isNet);
  dom.lblSum.classList.toggle('ya-switch-opt-active', !state.isHourly);
  dom.lblHourly.classList.toggle('ya-switch-opt-active', state.isHourly);
  dom.lblChart.classList.toggle('ya-switch-opt-active', state.viewMode === 'chart');
  dom.lblTable.classList.toggle('ya-switch-opt-active', state.viewMode === 'table');

  if (dom.switchGrossNet) dom.switchGrossNet.setAttribute('aria-checked', state.isNet ? 'true' : 'false');
  if (dom.switchSumHourly) dom.switchSumHourly.setAttribute('aria-checked', state.isHourly ? 'true' : 'false');
  if (dom.switchChartTable) dom.switchChartTable.setAttribute('aria-checked', state.viewMode === 'table' ? 'true' : 'false');

  ['days', 'weeks', 'months'].forEach(p => {
    const btn = $(`btnPeriod-${p}`);
    if (btn) btn.classList.toggle('ya-seg-btn-active', state.period === p);
  });
}

/**
 * Полный рендеринг всего интерфейса
 */
function renderAll(skipSettingsSlidersRebuild = false) {
  renderHeader();
  renderBlock1();
  renderBlock2();
  renderBlock3();
  renderSettingsScreen(skipSettingsSlidersRebuild);
}

// Блок 1: Динамика дохода (Диаграмма / Таблица)
function renderBlock1() {
  const data = getCurrentDataset();
  if (state.selectedBarIndex >= data.length) {
    state.selectedBarIndex = data.length - 1;
  }

  dom.block1Title.textContent = state.viewMode === 'chart' ? 'Динамика дохода' : 'Таблица доходов и расходов';
  dom.chartViewContainer.classList.toggle('hidden', state.viewMode !== 'chart');
  dom.tableViewContainer.classList.toggle('hidden', state.viewMode !== 'table');

  dom.legendGoalsItem.classList.toggle('hidden', !state.includeGoals);
  dom.legendGrossBg.classList.toggle('hidden', !state.isNet);

  renderDetailedTable(data);
  if (state.viewMode === 'chart') {
    renderBarChart(data);
  }
}

function renderBarChart(data) {
  const canvas = dom.barChartCanvas;
  const maxGrossVal = Math.max(...data.map(d => state.isHourly ? d.grossPerHr : d.grossTotal)) * 1.15;

  const avgUserVal = Math.round(
    data.reduce((a, d) => a + (state.isHourly ? (state.isNet ? d.profitPerHr : d.grossPerHr) : (state.isNet ? d.netProfit : d.grossTotal)), 0) / data.length
  );
  const avgDistrictVal = Math.round(avgUserVal * 0.91);
  const avgCityVal = Math.round(avgUserVal * 0.83);

  const pctUser = Math.min(94, Math.max(12, Math.round((avgUserVal / maxGrossVal) * 100)));
  const pctDist = Math.min(94, Math.max(12, Math.round((avgDistrictVal / maxGrossVal) * 100)));
  const pctCity = Math.min(94, Math.max(12, Math.round((avgCityVal / maxGrossVal) * 100)));

  const unitSuffix = state.isHourly ? '₽/ч' : '₽';
  const yTop = Math.round(maxGrossVal);
  const yMid = Math.round(maxGrossVal / 2);

  const benchmarkLinesHtml = state.usingUserData ? '' : `
    <div class="absolute left-9 right-1 bottom-6 top-3 pointer-events-none">
      <div style="bottom: ${pctUser}%" class="absolute left-0 right-0 border-t border-dashed border-gray-300/75 z-20">
        <span class="absolute left-1 -top-3.5 text-[8.5px] font-semibold px-1 rounded bg-black/70 text-gray-100 whitespace-nowrap">
          Вы (${formatNum(avgUserVal)} ${unitSuffix})
        </span>
      </div>
      <div style="bottom: ${pctDist}%" class="absolute left-0 right-0 border-t border-dashed border-amber-300/70 z-20">
        <span class="absolute left-1 -top-3.5 text-[8.5px] font-semibold px-1 rounded bg-black/70 text-amber-300 whitespace-nowrap">
          Район (${formatNum(avgDistrictVal)} ${unitSuffix})
        </span>
      </div>
      <div style="bottom: ${pctCity}%" class="absolute left-0 right-0 border-t border-dashed border-gray-400/65 z-20">
        <span class="absolute left-1 -top-3.5 text-[8.5px] font-semibold px-1 rounded bg-black/70 text-gray-300 whitespace-nowrap">
          Город (${formatNum(avgCityVal)} ${unitSuffix})
        </span>
      </div>
    </div>
  `;

  const itemWidth = 44;

  let html = `
    <div class="absolute left-0 top-3 bottom-6 w-8 flex flex-col justify-between text-[9px] pr-1 text-right text-mut">
      <span>${formatCompact(yTop)}</span>
      <span>${formatCompact(yMid)}</span>
      <span>0</span>
    </div>

    ${benchmarkLinesHtml}

    <div id="barScrollContainer" class="w-full h-full overflow-x-auto overflow-y-hidden border-b border-l relative z-10 border-strong custom-scroll">
      <div class="chart-scroll-track ${data.length <= 7 ? 'justify-around' : 'justify-start'}" style="min-width: ${Math.max(100, data.length * itemWidth)}px;">
  `;

  data.forEach((d, idx) => {
    const grossMetric = state.isHourly ? d.grossPerHr : d.grossTotal;
    const netMetric   = state.isHourly ? d.profitPerHr : d.netProfit;
    const displayMetric = state.isNet ? netMetric : grossMetric;
    const isLoss = displayMetric < 0;

    const grossHeightPct = Math.max(6, Math.min(100, Math.round((grossMetric / maxGrossVal) * 100)));
    const netHeightPct   = isLoss ? 12 : Math.max(4, Math.min(100, Math.round((displayMetric / maxGrossVal) * 100)));

    const totalParts = d.grossTotal || 1;
    const p = key => ((d[key] / totalParts) * 100).toFixed(1);

    const isSelected = idx === state.selectedBarIndex;

    const valCompact = isLoss ? `-${formatCompact(Math.abs(displayMetric))}` : formatCompact(displayMetric);
    const valText = `${valCompact} ${unitSuffix}`;
    const valClass = isLoss
      ? 'text-rose-500 font-extrabold text-[8px] sm:text-[8.5px]'
      : (isSelected ? 'opacity-100 font-black text-main text-[8.5px] sm:text-[9px]' : 'opacity-75 font-semibold text-[8px] sm:text-[8.5px]');

    let barStackHtml = '';
    if (isLoss) {
      barStackHtml = `
        <div id="barStack-${idx}" style="height: ${netHeightPct}%"
             class="w-full relative z-10 rounded-t-lg overflow-hidden flex flex-col items-center justify-center bg-rose-500/25 border border-rose-500/70 shadow ${isSelected ? 'ring-2 ring-rose-400' : 'opacity-90 group-hover:opacity-100'}"
             title="Убыток: -${formatNum(Math.abs(displayMetric))} ${unitSuffix}">
          <span class="text-[8.5px] font-extrabold text-rose-500 leading-none">−</span>
        </div>
      `;
    } else {
      barStackHtml = `
        <div id="barStack-${idx}" style="height: ${netHeightPct}%"
             class="w-full relative z-10 rounded-t-lg overflow-hidden flex flex-col-reverse shadow ${isSelected ? 'ring-2 ring-[#FCE000]' : 'opacity-90 group-hover:opacity-100'}">
          <div style="height: ${p('ordersCost')}%" class="w-full bg-blue-500"></div>
          <div style="height: ${p('surgeRub')}%"   class="w-full bg-[#FCE000]"></div>
          <div style="height: ${p('ratingRub')}%"  class="w-full bg-orange-400"></div>
          <div style="height: ${p('bonuses')}%"    class="w-full bg-purple-500"></div>
          ${state.includeGoals ? `<div style="height: ${p('goals')}%" class="w-full bg-pink-500"></div>` : ''}
          <div style="height: ${p('tips')}%"       class="w-full bg-emerald-400"></div>
        </div>
      `;
    }

    let dateDisplayHtml = escapeHtml(d.date);
    if (state.period === 'weeks' && typeof d.date === 'string' && d.date.includes('–')) {
      const pts = d.date.split('–');
      dateDisplayHtml = `<span class="block leading-none text-[8px]">${escapeHtml(pts[0])}<br><span class="opacity-80">–${escapeHtml(pts[1])}</span></span>`;
    } else if (state.period === 'months' && typeof d.date === 'string') {
      const clean = d.date.toLowerCase().trim();
      const shortM = shortMonthNamesMap[clean] || (d.date.length > 4 ? d.date.substring(0, 3) : d.date);
      dateDisplayHtml = `<span class="text-[9px] font-bold">${escapeHtml(shortM)}</span>`;
    }

    html += `
      <div id="barCol-${idx}" onclick="selectBar(${idx})" class="chart-bar-item cursor-pointer group">
        <div id="barValue-${idx}" class="text-[9px] font-bold mb-0.5 whitespace-nowrap shrink-0 ${valClass}">
          ${valText}
        </div>

        <div class="flex-1 w-full max-w-[28px] min-h-0 flex items-end justify-center relative">
          ${state.isNet ? `
            <div style="height: ${grossHeightPct}%"
                 class="w-full bg-gray-500/35 border border-dashed border-gray-400/70 rounded-t-lg absolute bottom-0 left-0 right-0">
            </div>
          ` : ''}

          ${barStackHtml}
        </div>

        <div id="barDate-${idx}" class="text-[9px] font-semibold text-center mt-1 shrink-0 ${isSelected ? 'opacity-100 font-black text-main text-[10px]' : 'opacity-70'}">
          ${dateDisplayHtml}
        </div>
      </div>
    `;
  });

  html += `  </div>
    </div>`;
  canvas.innerHTML = html;

  const scrollContainer = document.getElementById('barScrollContainer');
  if (scrollContainer) {
    requestAnimationFrame(() => {
      if (dom.screenMain.classList.contains('hidden')) return;

      const activeBar = document.getElementById(`barCol-${state.selectedBarIndex}`);
      if (activeBar && scrollContainer.clientWidth > 0) {
        const leftOffset = activeBar.offsetLeft - (scrollContainer.clientWidth / 2) + (activeBar.clientWidth / 2);
        scrollContainer.scrollLeft = Math.max(0, leftOffset);
      } else {
        scrollContainer.scrollLeft = scrollContainer.scrollWidth;
      }
    });
  }

  renderSelectedBarDetails(data[state.selectedBarIndex]);
}

function renderSelectedBarDetails(sel) {
  if (!sel) return;

  // Динамические цифры в легенде диаграммы
  if (dom.legValOrders) dom.legValOrders.textContent = `${formatNum(sel.ordersCost)} ₽`;
  if (dom.legValSurge) dom.legValSurge.textContent = `+${formatNum(sel.surgeRub)} ₽`;
  if (dom.legValRating) dom.legValRating.textContent = `+${formatNum(sel.ratingRub)} ₽`;
  if (dom.legValBonuses) dom.legValBonuses.textContent = `+${formatNum(sel.bonuses)} ₽`;
  if (dom.legValGoals) dom.legValGoals.textContent = state.includeGoals && sel.goals > 0 ? `+${formatNum(sel.goals)} ₽` : '';
  if (dom.legValTips) dom.legValTips.textContent = sel.tips > 0 ? `+${formatNum(sel.tips)} ₽` : '';

  const deductionBadges = [];
  if (sel.tax > 0) {
    deductionBadges.push(`<span class="ya-badge ya-badge-red">Налог (6%): <b>-${formatNum(sel.tax)} ₽</b></span>`);
  }
  sel.itemizedExpenses.forEach(expItem => {
    if (expItem.amount > 0) {
      deductionBadges.push(`<span class="ya-badge ya-badge-red">${escapeHtml(expItem.name)}: <b>-${formatNum(expItem.amount)} ₽</b></span>`);
    }
  });
  if (sel.adjustments < 0) {
    deductionBadges.push(`<span class="ya-badge ya-badge-red">Корректировки: <b>-${formatNum(Math.abs(sel.adjustments))} ₽</b></span>`);
  }

  const transportText = sel.transportSummary || sel.transport || 'Курьер';
  const selHours = Math.round(Number(sel.slotHours || 0) * 10) / 10;

  const netBadgeHtml = sel.netProfit < 0
    ? `<span class="ya-badge ya-badge-red font-bold">Чистыми (убыток): <b>-${formatNum(Math.abs(sel.netProfit))} ₽ (-${formatNum(Math.abs(sel.profitPerHr))} ₽/ч)</b></span>`
    : `<span class="ya-badge ya-badge-green font-bold">Чистыми: <b>${formatNum(sel.netProfit)} ₽ (${formatNum(sel.profitPerHr)} ₽/ч)</b></span>`;

  dom.selectedBarDetails.innerHTML = `
    <div class="flex items-center justify-between">
      <div>
        <span class="font-extrabold">${escapeHtml(sel.date)} (${escapeHtml(sel.dayOfWeek)})</span>
        <span class="opacity-70 ml-1">• ${escapeHtml(transportText)} • ${selHours} ч • ${sel.ordersCount} зак.</span>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-1.5 text-[10px] pt-1 border-t border-subtle">
      <span class="ya-badge ya-badge-grey">Начислено: <b>${formatNum(sel.grossTotal)} ₽</b></span>
      ${deductionBadges.join('')}
      ${netBadgeHtml}
    </div>
  `;
}

const PROFIT_COLOR_SCALE_LIGHT = {
  min: [220, 38, 38],   // #DC2626 мягкий красный
  mid: [217, 119, 6],   // #D97706 теплый янтарь
  max: [22, 138, 56]    // #168A38 свежий зеленый
};

const PROFIT_COLOR_SCALE_DARK = {
  min: [251, 113, 133], // #FB7185 кораллово-розовый
  mid: [251, 191, 36],  // #FBBF24 золотисто-янтарный
  max: [74, 222, 128]   // #4ADE80 мягкий салатово-зеленый
};

/**
 * Непрерывное/плавное условное форматирование показателя «Прибыль в час» (3-Color Scale, как в Excel)
 * Light mode: min (красный #DC2626) -> mid (теплый янтарь #D97706) -> max (свежий зеленый #168A38)
 * Dark mode:  min (коралл #FB7185)  -> mid (золото #FBBF24)        -> max (мягкий зеленый #4ADE80)
 */
function getProfitPerHourColor(val, minVal, maxVal, isLightMode) {
  if (maxVal <= minVal || val == null || isNaN(val)) {
    return isLightMode ? '#18191C' : '#F5F6F8';
  }
  const t = Math.max(0, Math.min(1, (val - minVal) / (maxVal - minVal)));
  const c = isLightMode ? PROFIT_COLOR_SCALE_LIGHT : PROFIT_COLOR_SCALE_DARK;
  let r, g, b;

  if (t <= 0.5) {
    const p = t / 0.5;
    r = Math.round(c.min[0] + p * (c.mid[0] - c.min[0]));
    g = Math.round(c.min[1] + p * (c.mid[1] - c.min[1]));
    b = Math.round(c.min[2] + p * (c.mid[2] - c.min[2]));
  } else {
    const p = (t - 0.5) / 0.5;
    r = Math.round(c.mid[0] + p * (c.max[0] - c.mid[0]));
    g = Math.round(c.mid[1] + p * (c.max[1] - c.mid[1]));
    b = Math.round(c.mid[2] + p * (c.max[2] - c.mid[2]));
  }

  return `rgb(${r}, ${g}, ${b})`;
}

const tableHeaderLabels = {
  date: 'Дата',
  dayOfWeek: 'День<br>недели',
  slotHours: 'Длит.<br>слота',
  ordersCount: 'Кол-во<br>заказов',
  ordersPerHr: 'Заказов<br>в час',
  transport: 'Транспорт',
  grossTotal: 'Начислено<br>(до расх.)',
  ordersCost: 'Стоимость<br>заказов',
  surgePct: 'Спрос<br>(%)',
  surgeRub: 'Доплата<br>(спрос)',
  ratingPct: 'Рейтинг<br>(%)',
  ratingRub: 'Доплата<br>(рейтинг)',
  bonuses: 'Бонусы',
  tax: 'Налог',
  netProfit: 'Прибыль<br>(на руки)',
  profitPerHrNoBonus: 'Прибыль/ч<br>(без д/б)',
  profitPerHr: 'Прибыль<br>в час',
  goals: 'Цели',
  tips: 'Чаевые',
  adjustments: 'Коррект.',
  expenses: 'Расходы'
};

const getColWidthClass = (colKey, isFirst) => {
  if (isFirst) return 'table-col-sticky-first border-r min-w-[76px] max-w-[84px]';
  switch (colKey) {
    case 'dayOfWeek':          return 'min-w-[44px] max-w-[50px] text-center';
    case 'slotHours':          return 'min-w-[50px] max-w-[58px] text-center';
    case 'ordersCount':        return 'min-w-[48px] max-w-[56px] text-center';
    case 'ordersPerHr':        return 'min-w-[50px] max-w-[58px] text-center';
    case 'transport':          return 'min-w-[70px] max-w-[85px] text-left';
    case 'grossTotal':         return 'min-w-[68px] max-w-[78px] text-right';
    case 'ordersCost':         return 'min-w-[64px] max-w-[74px] text-right';
    case 'surgePct':           return 'min-w-[46px] max-w-[52px] text-center';
    case 'surgeRub':           return 'min-w-[60px] max-w-[70px] text-right';
    case 'ratingPct':          return 'min-w-[46px] max-w-[52px] text-center';
    case 'ratingRub':          return 'min-w-[60px] max-w-[70px] text-right';
    case 'bonuses':            return 'min-w-[54px] max-w-[62px] text-right';
    case 'tax':                return 'min-w-[52px] max-w-[60px] text-right';
    case 'netProfit':          return 'min-w-[72px] max-w-[82px] text-right';
    case 'profitPerHrNoBonus': return 'min-w-[74px] max-w-[84px] text-right';
    case 'profitPerHr':        return 'min-w-[72px] max-w-[82px] text-right';
    default:                   return 'min-w-[60px] max-w-[75px] text-right';
  }
};

function renderDetailedTable(data, preserveScroll = true) {
  const enabledCols = state.tableColumns.filter(c => c.enabled);
  const thead = dom.detailedTableHead;
  const tbody = dom.detailedTableBody;
  const tfoot = dom.detailedTableFoot;

  const scrollContainer = tbody?.closest('.table-scroll-container');
  const prevScrollTop = (preserveScroll && scrollContainer) ? scrollContainer.scrollTop : 0;

  const profitHrVals = data.map(r => Number(r.profitPerHr || 0));
  const minProfitHr = profitHrVals.length > 0 ? Math.min(...profitHrVals) : 0;
  const maxProfitHr = profitHrVals.length > 0 ? Math.max(...profitHrVals) : 0;

  const profitHrNoBonusVals = data.map(r => Number(r.profitPerHrNoBonus != null ? r.profitPerHrNoBonus : (r.profitPerHr || 0)));
  const minProfitHrNoBonus = profitHrNoBonusVals.length > 0 ? Math.min(...profitHrNoBonusVals) : 0;
  const maxProfitHrNoBonus = profitHrNoBonusVals.length > 0 ? Math.max(...profitHrNoBonusVals) : 0;

  const getColHighlightClass = (colKey) => {
    if (colKey === 'netProfit') return 'table-col-net';
    if (colKey === 'grossTotal') return 'table-col-gross';
    return '';
  };

  let headHtml = '<tr>';
  enabledCols.forEach((col, i) => {
    const widthCls = getColWidthClass(col.key, i === 0);
    const bgCls = i === 0 ? 'bg-elevated' : '';
    const highlightCls = getColHighlightClass(col.key);
    let labelHtml = tableHeaderLabels[col.key] || escapeHtml(col.label);
    if (col.key === 'date') {
      labelHtml = `
        <div class="flex items-center justify-between gap-1 w-full">
          <span>${tableHeaderLabels.date}</span>
          <div class="inline-flex items-center gap-0.5 font-normal">
            <button type="button" onclick="expandAllDateSubRows()" title="Развернуть все подстроки" class="w-3.5 h-3.5 rounded bg-black/10 dark:bg-white/10 hover:bg-[#FCE000] hover:text-black flex items-center justify-center text-[10px] font-extrabold leading-none active:scale-95">+</button>
            <button type="button" onclick="collapseAllDateSubRows()" title="Свернуть все подстроки" class="w-3.5 h-3.5 rounded bg-black/10 dark:bg-white/10 hover:bg-[#FCE000] hover:text-black flex items-center justify-center text-[10px] font-extrabold leading-none active:scale-95">−</button>
          </div>
        </div>
      `;
    }
    headHtml += `<th scope="col" class="py-1.5 px-1 font-bold text-[9.5px] leading-tight whitespace-normal align-middle ${widthCls} ${bgCls} ${highlightCls}">${labelHtml}</th>`;
  });
  headHtml += '</tr>';
  thead.innerHTML = headHtml;

  let bodyHtml = '';
  data.forEach(row => {
    const rowKey = row.fullDate || row.weekCycleKey || row.monthKey || row.date;
    const hasSubRows = Array.isArray(row.subRows) && row.subRows.length > 1;
    const isExpanded = hasSubRows ? !state.collapsedDateKeys.has(rowKey) : false;

    if (hasSubRows && isExpanded) {
      row.subRows.forEach((subRow, sIdx) => {
        bodyHtml += '<tr class="hover:opacity-90 transition table-subrow">';
        enabledCols.forEach((col, i) => {
          const widthCls = getColWidthClass(col.key, i === 0);
          const stickyCls = i === 0 ? 'table-col-sticky-first font-bold border-r bg-card border-strong' : '';
          const highlightCls = getColHighlightClass(col.key);
          let cellContent = '';
          if (col.key === 'date') {
            const dateStr = subRow.fullDisplayDate || (typeof subRow.date === 'string' && subRow.date.length === 5 ? `${subRow.date}.2026` : subRow.date);
            if (sIdx === 0) {
              cellContent = `
                <div class="flex items-center gap-1">
                  <button type="button" onclick="toggleRowExpansion('${escapeHtml(rowKey)}')" title="Свернуть подстроки" class="w-3.5 h-3.5 shrink-0 rounded border border-gray-400/40 bg-black/5 dark:bg-white/10 hover:bg-[#FCE000] hover:text-black hover:border-black font-extrabold text-[10px] flex items-center justify-center leading-none">−</button>
                  <span class="truncate">${escapeHtml(dateStr)}</span>
                </div>
              `;
            } else {
              cellContent = `
                <div class="flex items-center gap-1">
                  <span class="w-3.5 shrink-0 text-center text-sec text-[9px] font-bold">↳</span>
                  <span class="truncate opacity-75">${escapeHtml(dateStr)}</span>
                </div>
              `;
            }
          } else {
            cellContent = formatTableCellValue(subRow, col.key, minProfitHr, maxProfitHr, minProfitHrNoBonus, maxProfitHrNoBonus);
          }
          bodyHtml += `<td class="py-1.5 px-1 text-[10px] whitespace-nowrap ${widthCls} ${stickyCls} ${highlightCls}">${cellContent}</td>`;
        });
        bodyHtml += '</tr>';
      });
    } else {
      bodyHtml += '<tr class="hover:opacity-90 transition">';
      enabledCols.forEach((col, i) => {
        const widthCls = getColWidthClass(col.key, i === 0);
        const stickyCls = i === 0 ? 'table-col-sticky-first font-bold border-r bg-card border-strong' : '';
        const highlightCls = getColHighlightClass(col.key);
        let cellContent = '';
        if (col.key === 'date') {
          const dateStr = row.fullDisplayDate || (typeof row.date === 'string' && row.date.length === 5 ? `${row.date}.2026` : row.date);
          if (hasSubRows) {
            cellContent = `
              <div class="flex items-center gap-1">
                <button type="button" onclick="toggleRowExpansion('${escapeHtml(rowKey)}')" title="Развернуть по типам транспорта" class="w-3.5 h-3.5 shrink-0 rounded border border-gray-400/40 bg-black/5 dark:bg-white/10 hover:bg-[#FCE000] hover:text-black hover:border-black font-extrabold text-[10px] flex items-center justify-center leading-none">+</button>
                <span class="truncate">${escapeHtml(dateStr)}</span>
              </div>
            `;
          } else {
            cellContent = escapeHtml(dateStr);
          }
        } else {
          cellContent = formatTableCellValue(row, col.key, minProfitHr, maxProfitHr, minProfitHrNoBonus, maxProfitHrNoBonus);
        }
        bodyHtml += `<td class="py-1.5 px-1 text-[10px] whitespace-nowrap ${widthCls} ${stickyCls} ${highlightCls}">${cellContent}</td>`;
      });
      bodyHtml += '</tr>';
    }
  });
  tbody.innerHTML = bodyHtml;

  let footHtml = '<tr>';
  enabledCols.forEach((col, i) => {
    const widthCls = getColWidthClass(col.key, i === 0);
    const stickyCls = i === 0 ? 'table-col-sticky-first border-r bg-elevated border-strong' : '';
    const highlightCls = getColHighlightClass(col.key);
    footHtml += `<td class="py-1.5 px-1 text-[10px] whitespace-nowrap ${widthCls} ${stickyCls} ${highlightCls}">${i === 0 ? 'ИТОГО / СР.' : formatTableFootValue(data, col.key)}</td>`;
  });
  footHtml += '</tr>';
  tfoot.innerHTML = footHtml;

  if (scrollContainer && preserveScroll) {
    scrollContainer.scrollTop = prevScrollTop;
  }
}

function formatTableCellValue(row, key, minProfitHr, maxProfitHr, minProfitHrNoBonus = 0, maxProfitHrNoBonus = 0) {
  switch (key) {
    case 'date': {
      if (row.fullDisplayDate) return escapeHtml(row.fullDisplayDate);
      if (typeof row.date === 'string' && row.date.length === 5) {
        return escapeHtml(`${row.date}.2026`);
      }
      return escapeHtml(row.date);
    }
    case 'dayOfWeek':   return `<span class="block text-center">${escapeHtml(row.dayOfWeek)}</span>`;
    case 'slotHours':   {
      const h = Math.round(Number(row.slotHours || 0) * 10) / 10;
      return `<span class="block text-center">${h} ч</span>`;
    }
    case 'ordersCount': return `<span class="block text-center">${row.ordersCount}</span>`;
    case 'ordersPerHr': return `<span class="block text-center">${row.ordersPerHr}</span>`;
    case 'transport': {
      if (Array.isArray(row.distinctTransports) && row.distinctTransports.length > 1) {
        return escapeHtml(row.transportSummary || row.distinctTransports.join(' + '));
      }
      return escapeHtml(row.transportSummary || row.transport || '—');
    }
    case 'grossTotal':  return `<span class="font-semibold">${formatNum(row.grossTotal)} ₽</span>`;
    case 'surgePct':
    case 'ratingPct':   return `<span class="block text-center">+${row[key]}%</span>`;
    case 'tax':
    case 'expenses':    return `<span class="text-rose-400">-${formatNum(row[key])} ₽</span>`;
    case 'adjustments': return row.adjustments === 0 ? '0 ₽' : `<span class="text-rose-400">-${formatNum(Math.abs(row.adjustments))} ₽</span>`;
    case 'netProfit': {
      if (row.netProfit < 0) {
        return `<span class="font-extrabold text-rose-500">-${formatNum(Math.abs(row.netProfit))} ₽</span>`;
      }
      return `<span class="font-extrabold text-[#18191C] dark:text-[#F5F6F8]">${formatNum(row.netProfit)} ₽</span>`;
    }
    case 'profitPerHrNoBonus': {
      const val = row.profitPerHrNoBonus != null ? row.profitPerHrNoBonus : (row.profitPerHr || 0);
      const colColor = getProfitPerHourColor(val, minProfitHrNoBonus, maxProfitHrNoBonus, state.lightMode);
      const txt = val < 0 ? `-${formatNum(Math.abs(val))}` : `${formatNum(val)}`;
      return `<span class="font-extrabold" style="color: ${colColor};">${txt} ₽/ч</span>`;
    }
    case 'profitPerHr': {
      const colColor = getProfitPerHourColor(row.profitPerHr, minProfitHr, maxProfitHr, state.lightMode);
      const txt = row.profitPerHr < 0 ? `-${formatNum(Math.abs(row.profitPerHr))}` : `${formatNum(row.profitPerHr)}`;
      return `<span class="font-extrabold" style="color: ${colColor};">${txt} ₽/ч</span>`;
    }
    case 'ordersCost':
    case 'surgeRub':
    case 'ratingRub':
    case 'bonuses':
    case 'goals':
    case 'tips':        return `${formatNum(row[key])} ₽`;
    default:            return '-';
  }
}

function formatTableFootValue(data, key) {
  const sum = k => data.reduce((a, r) => a + Number(r[k] || 0), 0);
  const avg = k => Math.round(sum(k) / data.length);
  switch (key) {
    case 'dayOfWeek':   return '—';
    case 'transport': {
      if (state.usingUserData) {
        const currentList = Array.from(new Set(data.flatMap(r => r.distinctTransports || (r.transport ? [r.transport] : []))));
        if (currentList.length) return escapeHtml(currentList.join(' + '));
        if (state.userDatasets?.distinctTransports?.length) {
          return escapeHtml(state.userDatasets.distinctTransports.join(' + '));
        }
      }
      return 'Электровело';
    }
    case 'slotHours':   {
      const totH = Math.round(sum('slotHours') * 10) / 10;
      return `${totH} ч`;
    }
    case 'ordersCount': return sum('ordersCount');
    case 'ordersPerHr': return (sum('ordersCount') / sum('slotHours')).toFixed(2);
    case 'surgePct':    return `+${avg('surgePct')}%`;
    case 'ratingPct':   return `+${avg('ratingPct')}%`;
    case 'profitPerHrNoBonus': {
      const totNetNoBonus = sum('netProfitNoBonus');
      const totHrs = sum('slotHours');
      const rate = totHrs > 0 ? Math.round(totNetNoBonus / totHrs) : 0;
      if (rate < 0) {
        return `<span class="font-extrabold text-rose-500">-${formatNum(Math.abs(rate))} ₽/ч</span>`;
      }
      return `${formatNum(rate)} ₽/ч`;
    }
    case 'profitPerHr': {
      const totNet = sum('netProfit');
      const totHrs = sum('slotHours');
      const rate = totHrs > 0 ? Math.round(totNet / totHrs) : 0;
      if (rate < 0) {
        return `<span class="font-extrabold text-rose-500">-${formatNum(Math.abs(rate))} ₽/ч</span>`;
      }
      return `${formatNum(rate)} ₽/ч`;
    }
    case 'netProfit': {
      const tot = sum('netProfit');
      if (tot < 0) {
        return `<span class="font-extrabold text-rose-500">-${formatNum(Math.abs(tot))} ₽</span>`;
      }
      return `<span class="font-extrabold text-[#18191C] dark:text-[#F5F6F8]">${formatNum(tot)} ₽</span>`;
    }
    case 'adjustments': return sum('adjustments') === 0 ? '0 ₽' : `<span class="text-rose-400">-${formatNum(Math.abs(sum('adjustments')))} ₽</span>`;
    case 'tax':
    case 'expenses':    return `<span class="text-rose-400">-${formatNum(sum(key))} ₽</span>`;
    default:            return `${formatNum(sum(key))} ₽`;
  }
}

// Блок 2: Матрица спроса и планирование слотов
function renderBlock2() {
  const btnWeather = dom.btnWeather;
  const heatUnitSwitch = dom.heatUnitSwitchContainer;
  const districtSeasonBtn = dom.btnDistrictSeasonContainer;

  if (state.usingUserData) {
    if (btnWeather) btnWeather.classList.add('hidden');
    if (heatUnitSwitch) {
      heatUnitSwitch.classList.remove('col-span-3');
      heatUnitSwitch.classList.add('col-span-4');
    }
    if (districtSeasonBtn) {
      districtSeasonBtn.classList.remove('col-span-6');
      districtSeasonBtn.classList.add('col-span-8');
    }
    const availableSeasons = state.userDatasets?.availableSeasons || ['autumn'];
    const seasonLabels = availableSeasons.map(s => seasonMultipliers[s]?.label || s).join(', ');
    dom.currentDistrictSeasonSub.textContent = `Локация пользователя • ${seasonLabels}`;
    if (dom.planningActionContainer) {
      dom.planningActionContainer.style.display = 'none';
    }
  } else {
    if (btnWeather) {
      btnWeather.classList.remove('hidden');
      btnWeather.style.backgroundColor = state.weatherBoost ? 'var(--ya-yellow)' : 'var(--bg-card)';
      btnWeather.style.color = state.weatherBoost ? 'var(--ya-yellow-text)' : 'var(--text-main)';
    }
    if (heatUnitSwitch) {
      heatUnitSwitch.classList.remove('col-span-4');
      heatUnitSwitch.classList.add('col-span-3');
    }
    if (districtSeasonBtn) {
      districtSeasonBtn.classList.remove('col-span-8');
      districtSeasonBtn.classList.add('col-span-6');
    }
    const distObj = districtsData.find(d => d.id === state.districtId) || districtsData[0];
    const seasonObj = seasonMultipliers[state.season] || seasonMultipliers.autumn;
    dom.currentDistrictSeasonSub.textContent = `${distObj.shortName} • ${seasonObj.label}`;
    if (dom.planningActionContainer) {
      dom.planningActionContainer.style.display = 'grid';
    }
  }

  dom.lblUnitPct.classList.toggle('ya-switch-opt-active', !state.heatUnitRub);
  dom.lblUnitRub.classList.toggle('ya-switch-opt-active', state.heatUnitRub);
  if (dom.lblUnitRub) {
    dom.lblUnitRub.textContent = state.isNet ? '₽/ч (чист.)' : '₽/ч (начисл.)';
  }
  if (heatUnitSwitch) {
    heatUnitSwitch.setAttribute('aria-checked', state.heatUnitRub ? 'true' : 'false');
  }

  const userSuffix = state.usingUserData ? ' (по данным пользователя)' : '';
  dom.block2Title.textContent = (state.heatUnitRub
    ? (state.isNet ? 'Чистый доход в час с учетом спроса и расходов' : 'Средний общий доход в час (начислено)')
    : 'Средняя доплата за спрос по часам') + userSuffix;

  const tbody = dom.heatmapTableBody;
  let html = '';
  const activeMatrix = (state.usingUserData && state.userDatasets && state.userDatasets.heatmapMatrix)
    ? state.userDatasets.heatmapMatrix
    : baseHeatmapMatrix;

  // Динамический сбор всех доступных значений матрицы для относительного цветового градиента
  const validCells = [];
  activeMatrix.forEach(row => {
    row.values.forEach(baseVal => {
      const comp = getCellComputedValue(baseVal);
      if (comp) validCells.push(comp);
    });
  });

  const activeVals = validCells.map(c => state.heatUnitRub ? c.rubHr : c.pct);
  const minVal = activeVals.length > 0 ? Math.min(...activeVals) : 0;
  const maxVal = activeVals.length > 0 ? Math.max(...activeVals) : 1;

  activeMatrix.forEach((row, rIdx) => {
    html += `<tr><td class="text-left font-medium py-1.5 pl-0.5 pr-1 whitespace-nowrap text-[9.5px] opacity-80">${row.hours}</td>`;
    row.values.forEach((baseVal, cIdx) => {
      const cellKey = `${rIdx}-${cIdx}`;
      const comp = getCellComputedValue(baseVal);

      if (!comp) {
        html += `
          <td>
            <div class="heat-cell rounded-lg py-1.5 px-0 text-[10px] font-medium bg-gray-500/10 text-mut opacity-40 cursor-default select-none">
              —
            </div>
          </td>
        `;
      } else {
        const isSelected = state.selectedSlotCells.includes(cellKey);
        const displayStr = state.heatUnitRub ? `${comp.rubHr} ₽` : `+${comp.pct}%`;
        const colorCls = getHeatCellColor(comp, minVal, maxVal);
        const cellAria = state.heatUnitRub
          ? `${row.hours}, ${shortDayNames[cIdx]}: ${comp.rubHr} ₽/ч`
          : `${row.hours}, ${shortDayNames[cIdx]}: +${comp.pct}% спроса`;

        html += `
          <td>
            <div data-cell-key="${cellKey}"
                 role="button"
                 tabindex="0"
                 aria-label="${cellAria}"
                 aria-pressed="${isSelected ? 'true' : 'false'}"
                 onclick="toggleHeatCell('${cellKey}')"
                 onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleHeatCell('${cellKey}');}"
                 class="heat-cell rounded-lg py-1.5 px-0 text-[9.5px] font-bold ${colorCls} ${isSelected ? 'heat-cell-selected' : ''}">
              ${displayStr}
            </div>
          </td>
        `;
      }
    });
    html += `</tr>`;
  });
  tbody.innerHTML = html;

  updateHeatmapSummary();
  renderDistrictSeasonScreen();
}

function updateHeatmapSummary() {
  const summary = getSelectedSlotsSummary();
  const avgMetricLabel = summary.count > 0
    ? (state.heatUnitRub ? ` • Ср. ${formatNum(summary.avgHrEst)} ₽/ч` : ` • Ср. +${summary.avgPctEst}%`)
    : '';

  dom.selectedSlotsCounter.textContent = `Выбрано: ${summary.count} сл. (${summary.totalHours}ч)${avgMetricLabel}`;
  dom.btnClearSlots.classList.toggle('opacity-40', summary.count === 0);

  dom.plannedProfitEstimate.textContent = summary.totalHours > 0
    ? `Расчет прибыли: ~${formatNum(summary.totalRubEst)} ₽ (${summary.avgHrEst} ₽/ч за ${summary.totalHours}ч)`
    : `Выберите слоты в таблице для расчета прибыли`;
}

function getHeatCellColor(comp, minVal, maxVal) {
  if (!comp) return 'bg-transparent text-mut/40';
  const val = state.heatUnitRub ? comp.rubHr : comp.pct;
  if (state.heatUnitRub && val < 0) {
    return 'bg-rose-500/25 text-rose-500 font-extrabold border border-rose-400/40';
  }
  if (maxVal <= minVal) {
    return val > 0 ? 'bg-[#FCE000] text-[#141518]' : 'bg-gray-500/20 text-sec';
  }
  const ratio = (val - minVal) / (maxVal - minVal);
  if (ratio >= 0.70) return 'bg-[#FCE000] text-[#141518] font-black shadow-sm';
  if (ratio >= 0.45) return 'bg-amber-400 text-[#141518] font-bold';
  if (ratio >= 0.20) return 'bg-amber-500/35 text-main font-semibold';
  return 'bg-gray-500/20 text-sec font-medium';
}

function renderDistrictSeasonScreen() {
  const availSeasons = (state.usingUserData && state.userDatasets?.availableSeasons)
    ? state.userDatasets.availableSeasons
    : ['summer', 'autumn', 'winter', 'spring'];

  ['auto', 'summer', 'autumn', 'winter', 'spring'].forEach(s => {
    const btn = $(`btnSeason-${s}`);
    if (btn) {
      btn.classList.toggle('ya-seg-btn-active', state.season === s);
      if (state.usingUserData && s !== 'auto') {
        const isAvail = availSeasons.includes(s);
        btn.classList.toggle('opacity-30', !isAvail);
        btn.classList.toggle('pointer-events-none', !isAvail);
      } else {
        btn.classList.remove('opacity-30', 'pointer-events-none');
      }
    }
  });

  const listContainer = dom.districtListContainer;
  if (state.usingUserData) {
    dom.districtListUnitHint.textContent = 'Локация пользователя';
    listContainer.innerHTML = `
      <div class="ya-subcard p-3 flex items-center justify-between ring-2 ring-[#FCE000]">
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="w-3 h-3 rounded-full shrink-0 bg-[#FCE000]"></span>
          <div class="truncate">
            <div class="text-xs font-bold truncate">Локация пользователя</div>
            <div class="text-[10px] text-sec">Спрос и коэффициенты рассчитаны по вашим данным</div>
          </div>
        </div>
        <div class="text-right text-xs shrink-0 ml-2 font-bold text-emerald-400">
          Активно
        </div>
      </div>
    `;
  } else {
    dom.districtListUnitHint.textContent = state.heatUnitRub ? 'Средняя / Пик (₽/ч)' : 'Средняя / Пик (% спроса)';
    listContainer.innerHTML = districtsData.map(d => {
      const isCurrent = d.id === state.districtId;
      const stats = getDistrictStats(d);

      return `
        <div onclick="selectDistrict('${d.id}')"
             class="ya-subcard p-3 cursor-pointer flex items-center justify-between transition ${
               isCurrent ? 'ring-2 ring-[#FCE000]' : 'hover:opacity-90'
             }">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="w-3 h-3 rounded-full shrink-0" style="background-color: ${d.color}"></span>
            <div class="truncate">
              <div class="text-xs font-bold truncate">${escapeHtml(d.name)}</div>
              <div class="text-[10px] text-sec">Сезон: ${seasonMultipliers[state.season]?.label || ''}</div>
            </div>
          </div>
          <div class="text-right text-xs shrink-0 ml-2">
            <div>Ср.: <b>${stats.avgStr}</b></div>
            <div class="text-[11px] font-bold text-amber-400">Пик: ${stats.peakStr}</div>
          </div>
        </div>
      `;
    }).join('');
  }
}

// Блок 3: Сравнение показателей
function renderBlock3(precomputedAllTimeProfitHr) {
  ['transport', 'slot', 'total'].forEach(m => {
    const btn = $(`btnComp-${m}`);
    if (btn) btn.classList.toggle('ya-seg-btn-active', state.compareMode === m);
  });

  const allTimeProfitHr = precomputedAllTimeProfitHr !== undefined ? precomputedAllTimeProfitHr : getAllTimeHourlyProfit();
  const currentData = getCurrentDataset();
  const selectedRow = currentData[state.selectedBarIndex] || currentData[currentData.length - 1];
  const userPeriodProfitHr = selectedRow
    ? selectedRow.profitPerHr
    : Math.round(currentData.reduce((a, r) => a + r.profitPerHr, 0) / currentData.length);
  const userPeriodOrdersHr = selectedRow ? selectedRow.ordersPerHr : '2.20';
  const userHoursInSelectedPeriod = selectedRow
    ? selectedRow.slotHours
    : Math.round(currentData.reduce((a, r) => a + r.slotHours, 0) / currentData.length);
  const periodTag = selectedRow ? selectedRow.date : 'период';

  // Извлекаем заказы выбранного периода для динамического расчета 2-й колонки (Тотал)
  let periodOrders = [];
  if (state.usingUserData && state.userDatasets?.orders?.length) {
    const allO = state.userDatasets.orders;
    if (state.period === 'days') {
      const selectedDate = selectedRow?.fullDate || (selectedRow?.date ? `2026-${selectedRow.date.split('.').reverse().join('-')}` : '');
      periodOrders = allO.filter(o => o.date === selectedDate || o.displayDate === selectedRow?.date);
    } else if (state.period === 'weeks') {
      periodOrders = allO.filter(o => o.dateInfo.weekKey === selectedRow?.date);
    } else if (state.period === 'months') {
      periodOrders = allO.filter(o => o.dateInfo.monthKey === selectedRow?.date);
    }
  }
  const periodM = periodOrders.length > 0 ? computeGroupOrderMetrics(periodOrders) : {
    avgDist: '2.8 км',
    avgDur: '19 мин',
    avgWeight: '4.8 кг',
    payPerKm: '134 ₽/км',
    payPerKg: '78 ₽/кг',
    waitPct: '28%',
    avgWaitMin: '6.8 мин'
  };

  const activeComparison = (state.usingUserData && state.userDatasets && state.userDatasets.comparisonDatasets)
    ? state.userDatasets.comparisonDatasets
    : comparisonDatasets;
  const ds = activeComparison[state.compareMode];
  const thead = dom.compareTableHead;
  const tbody = dom.compareTableBody;
  const tfoot = dom.compareTableFoot;

  const formatHeaderWithParens = (str) => {
    if (!str) return '';
    const idx = str.indexOf('(');
    if (idx > 0) {
      const mainPart = str.substring(0, idx).trim();
      const parenPart = str.substring(idx).trim();
      return `<span class="whitespace-nowrap">${escapeHtml(mainPart)}</span><br><span class="text-[9px] font-normal opacity-80 whitespace-nowrap">${escapeHtml(parenPart)}</span>`;
    }
    return escapeHtml(str);
  };

  let headHtml = `<tr><th scope="col" class="py-1.5 px-2.5 font-bold text-[10px] leading-snug whitespace-normal sticky left-0 z-10 border-r min-w-[105px] max-w-[125px] bg-elevated border-strong">Показатель</th>`;
  ds.columns.forEach(colItem => {
    if (typeof colItem === 'object') {
      if (colItem.forecast) {
        headHtml += `
          <th scope="col" class="py-1.5 px-2 font-bold text-[10px] leading-snug text-center whitespace-normal align-middle min-w-[65px] max-w-[95px]">
            <div class="inline-flex items-center justify-center gap-1 flex-wrap">
              <span>${formatHeaderWithParens(colItem.title)}</span>
              <button type="button" onclick="openForecastInfoModal()" title="Как рассчитывается прогноз" class="w-4 h-4 rounded-full bg-[#FCE000] text-[#141518] font-extrabold text-[9px] inline-flex items-center justify-center shadow hover:opacity-90 active:scale-95 transition">?</button>
            </div>
          </th>
        `;
      } else {
        headHtml += `<th scope="col" class="py-1.5 px-2 font-bold text-[10px] leading-snug text-center whitespace-normal align-middle min-w-[65px] max-w-[95px]">${formatHeaderWithParens(colItem.title)}</th>`;
      }
    } else {
      let resolvedColName = colItem;
      if (colItem === 'DYNAMIC_PERIOD_COL') resolvedColName = `Вы (${periodTag})`;
      if (colItem === 'AVG_DIST_COL')       resolvedColName = `Ср. район (${periodTag})`;
      if (colItem === 'TOP_DIST_COL')       resolvedColName = `Топ-20% района (${periodTag})`;
      if (colItem === 'AVG_CITY_COL')       resolvedColName = `Ср. город (${periodTag})`;
      if (colItem === 'TOP_CITY_COL')       resolvedColName = `Топ-20% города (${periodTag})`;
      headHtml += `<th scope="col" class="py-1.5 px-2 font-bold text-[10px] leading-snug text-center whitespace-normal align-middle min-w-[65px] max-w-[95px]">${formatHeaderWithParens(resolvedColName)}</th>`;
    }
  });
  headHtml += `</tr>`;
  thead.innerHTML = headHtml;

  let bodyHtml = '';
  ds.rowsPerOrder.forEach(row => {
    bodyHtml += `<tr class="hover:opacity-90">
      <td class="py-1.5 px-2.5 font-medium text-[10px] leading-snug whitespace-normal sticky left-0 z-10 border-r min-w-[105px] max-w-[125px] bg-card border-strong text-sec">${escapeHtml(row.label)}</td>`;
    row.vals.forEach(v => {
      let cellVal = v;
      if (cellVal === 'DYNAMIC_DIST') cellVal = periodM.avgDist;
      else if (cellVal === 'DYNAMIC_DUR') cellVal = periodM.avgDur;
      else if (cellVal === 'DYNAMIC_WEIGHT') cellVal = periodM.avgWeight;
      else if (cellVal === 'DYNAMIC_PAY_KM') cellVal = periodM.payPerKm;
      else if (cellVal === 'DYNAMIC_PAY_KG') cellVal = periodM.payPerKg;
      else if (cellVal === 'DYNAMIC_WAIT_PCT') cellVal = periodM.waitPct;
      else if (cellVal === 'DYNAMIC_WAIT_MIN') cellVal = periodM.avgWaitMin;
      bodyHtml += `<td class="py-1.5 px-2 text-[10px] text-center whitespace-nowrap min-w-[65px]">${escapeHtml(cellVal)}</td>`;
    });
    bodyHtml += `</tr>`;
  });
  tbody.innerHTML = bodyHtml;

  let cachedUserTransportStats = null;
  let cachedUserSlotStats = null;
  const getUserTransportStats = () => {
    if (!cachedUserTransportStats) {
      cachedUserTransportStats = calculateTransportStats(state.userDatasets ? state.userDatasets.orders : []);
    }
    return cachedUserTransportStats;
  };
  const getUserSlotStats = () => {
    if (!cachedUserSlotStats) {
      cachedUserSlotStats = calculateSlotStats(state.userDatasets ? state.userDatasets.orders : []);
    }
    return cachedUserSlotStats;
  };

  const formatCompRate = (val) => {
    if (val == null || isNaN(val)) return '—';
    if (val < 0) {
      return `<span class="text-rose-500 font-extrabold">-${formatNum(Math.abs(val))} ₽/ч</span>`;
    }
    return `<span class="font-extrabold">${formatNum(val)} ₽/ч</span>`;
  };

  let footHtml = '';
  ds.rowsTotal.forEach(row => {
    const isRateRow = row.label.includes('Прибыль') || row.label.includes('доход') || row.label.includes('Начислено');
    const displayRowLabel = isRateRow
      ? (state.isNet ? 'Прибыль в час' : 'Начислено в час')
      : row.label;

    footHtml += `<tr>
      <td class="py-1.5 px-2.5 font-extrabold text-[10px] leading-snug whitespace-normal sticky left-0 z-10 border-r min-w-[105px] max-w-[125px] bg-elevated border-strong">${escapeHtml(displayRowLabel)}</td>`;
    row.vals.forEach(v => {
      let cellVal = v.trim();
      if (cellVal === 'DYNAMIC') cellVal = formatCompRate(userPeriodProfitHr);
      else if (cellVal === 'DYNAMIC_ORD_HR') cellVal = `${userPeriodOrdersHr}`;
      else if (cellVal === 'ALLTIME') cellVal = formatCompRate(allTimeProfitHr);
      else if (cellVal === 'TOTAL_ORD_HR_DYN') {
        const stats = getUserTransportStats();
        cellVal = `${stats.totalOrdersPerHr}`;
      } else if (cellVal === 'SLOT_PLAN_ORD_HR_DYN') {
        const stats = getUserSlotStats();
        cellVal = `${stats.planOrdHr}`;
      } else if (cellVal === 'SLOT_FREE_ORD_HR_DYN') {
        const stats = getUserSlotStats();
        cellVal = `${stats.freeOrdHr}`;
      } else if (cellVal === 'PLAN_SLOT_DYN') {
        const stats = getUserSlotStats();
        cellVal = formatCompRate(stats.planProfitPerHr);
      } else if (cellVal === 'FREE_SLOT_DYN') {
        const stats = getUserSlotStats();
        cellVal = formatCompRate(stats.freeProfitPerHr);
      } else if (cellVal === 'FREE_SLOT_DEMO_DYN' || cellVal === '530 ₽/ч') {
        const freeGrossHr = 565;
        const freeTax = Math.round(freeGrossHr * 0.06);
        const hourlyExp = getCourierHourlyExpense();
        const val = state.isNet ? (freeGrossHr - freeTax - hourlyExp) : freeGrossHr;
        cellVal = formatCompRate(val);
      } else if (cellVal.startsWith('TRANSPORT_') && cellVal.endsWith('_PROFIT_DYN')) {
        const tKey = cellVal.replace('TRANSPORT_', '').replace('_PROFIT_DYN', '').toLowerCase();
        const tStats = getUserTransportStats();
        const item = tStats.byTransport[tKey];
        cellVal = item ? formatCompRate(item.profitPerHr) : '—';
      } else if (cellVal.startsWith('TRANSPORT_') && cellVal.endsWith('_ORD_HR_DYN')) {
        const tKey = cellVal.replace('TRANSPORT_', '').replace('_ORD_HR_DYN', '').toLowerCase();
        const tStats = getUserTransportStats();
        const item = tStats.byTransport[tKey];
        cellVal = item ? `${item.ordersPerHr}` : '—';
      } else if (cellVal === 'CAR_FORECAST_DYN') {
        const val = getTransportProfitPerHourForComparison('car', userHoursInSelectedPeriod, currentData);
        cellVal = formatCompRate(val);
      } else if (cellVal.endsWith('_DYN')) {
        const tKey = cellVal.replace('_DYN', '').toLowerCase();
        const val = getTransportProfitPerHourForComparison(tKey, userHoursInSelectedPeriod, currentData);
        cellVal = formatCompRate(val);
      } else if (isRateRow && !state.isNet) {
        if (cellVal === '625 ₽/ч') cellVal = '740 ₽/ч';
        else if (cellVal === '810 ₽/ч') cellVal = '960 ₽/ч';
        else if (cellVal === '580 ₽/ч') cellVal = '690 ₽/ч';
        else if (cellVal === '765 ₽/ч') cellVal = '910 ₽/ч';
      }
      footHtml += `<td class="py-1.5 px-2 text-[10px] text-center font-extrabold whitespace-nowrap min-w-[65px]">${cellVal}</td>`;
    });
    footHtml += `</tr>`;
  });
  tfoot.innerHTML = footHtml;
}

function updateWeekStartDayUI() {
  const curIdx = state.weekStartDay ?? 0;
  const lbl = $('lblCurrentWeekStart');
  if (lbl) {
    lbl.textContent = fullDayNames[curIdx] || 'Понедельник';
  }
  for (let i = 0; i < 7; i++) {
    const btn = $(`btnWeekStart-${i}`);
    if (btn) {
      if (i === curIdx) {
        btn.classList.add('ya-seg-btn-active');
      } else {
        btn.classList.remove('ya-seg-btn-active');
      }
    }
  }
}

function setWeekStartDay(dayIdx) {
  const parsed = parseInt(dayIdx, 10);
  if (isNaN(parsed) || parsed < 0 || parsed > 6) return;
  state.weekStartDay = parsed;
  try {
    localStorage.setItem('courier_week_start_day', String(parsed));
  } catch (e) {}

  if (state.usingUserData && state.userDataOrders) {
    state.userDatasets = buildDatasetsFromOrders(state.userDataOrders);
  }
  dataCache.invalidate();
  updateWeekStartDayUI();
  renderHeader();
  renderBlock1();
  renderBlock2();
  renderBlock3();
  renderSettingsScreen(false);
  const dayName = fullDayNames[parsed] || 'Понедельник';
  showToast(`Старт недели: ${dayName}`);
}

// Экран настроек
function renderSettingsScreen(skipSlidersRebuild = false) {
  dom.chkIncludeGoals.checked = state.includeGoals;
  updateWeekStartDayUI();

  ['walk', 'bike', 'ebike', 'car'].forEach(t => {
    const btn = $(`presetBtn-${t}`);
    if (btn) {
      const isSelected = state.selectedPreset === t;
      btn.style.backgroundColor = isSelected ? 'var(--ya-yellow)' : 'var(--bg-elevated)';
      btn.style.color = isSelected ? 'var(--ya-yellow-text)' : 'var(--text-main)';
    }

    const sumSpan = $(`presetSum-${t}`);
    if (sumSpan) sumSpan.textContent = `${formatNum(getWeeklyExpenseForTransport(t))} ₽`;
  });

  dom.totalWeeklyExpenseBadge.textContent = `${formatNum(getTotalWeeklyExpenses())} ₽/нед`;

  if (!skipSlidersRebuild) {
    const slidersEl = dom.expenseSlidersContainer;
    const expensesList = state.expenses;
    if (expensesList.length === 0) {
      slidersEl.innerHTML = `
        <div class="ya-subcard p-3 text-center text-[11px] text-sec">
          Все статьи расходов удалены (0 ₽/нед). Добавьте свою статью или нажмите «Сбросить по умолчанию».
        </div>
      `;
    } else {
      slidersEl.innerHTML = expensesList.map((item, idx) => `
        <div class="ya-subcard p-2.5 space-y-1.5">
          <div class="flex items-center justify-between text-xs gap-2">
            <span class="font-bold truncate">${escapeHtml(item.name)}</span>
            <div class="flex items-center gap-2 shrink-0">
              <span id="expenseValueLabel-${idx}" class="font-extrabold">${formatNum(item.value)} ₽/нед</span>
              <button type="button" onclick="deleteExpenseItem(${idx})" title="Удалить статью расхода" aria-label="Удалить статью расхода" class="w-5 h-5 rounded-md bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 flex items-center justify-center text-[10px] font-bold active:scale-95 transition">✕</button>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" onclick="stepExpense(${idx}, -100)" class="px-2.5 py-1 rounded-lg bg-black/20 hover:bg-black/30 border border-white/10 text-xs font-extrabold active:scale-95 transition shrink-0">-100</button>
            <input id="expenseRangeInput-${idx}" type="range" min="0" max="${item.max}" step="100" value="${item.value}"
                   aria-label="${escapeHtml(item.name)}"
                   oninput="updateExpenseSlider(${idx}, this.value)"
                   class="flex-1 h-6 cursor-pointer touch-pan-y" />
            <button type="button" onclick="stepExpense(${idx}, 100)" class="px-2.5 py-1 rounded-lg bg-black/20 hover:bg-black/30 border border-white/10 text-xs font-extrabold active:scale-95 transition shrink-0">+100</button>
          </div>
        </div>
      `).join('');
    }
  }

  renderReorderableColumnsList();
}

function renderReorderableColumnsList() {
  const listEl = dom.reorderableColumnsList;
  if (!listEl) return;

  const items = state.tableColumns.slice(1);
  listEl.innerHTML = items.map((c, idx) => {
    const realIdx = idx + 1;
    return `
      <div data-col-idx="${realIdx}"
           class="col-reorder-item ya-subcard py-2 px-2.5 flex items-center justify-between gap-2 transition cursor-grab active:cursor-grabbing">
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-xs opacity-50 font-bold select-none" title="Удерживайте для перетаскивания">☰</span>
          <span class="text-[11px] font-semibold truncate">${realIdx}. ${escapeHtml(c.label)}</span>
        </div>
        <input type="checkbox" ${c.enabled ? 'checked' : ''}
               aria-label="${escapeHtml(c.label)}"
               onchange="toggleTableColumn('${c.key}', this.checked)"
               class="w-4 h-4 accent-[#FCE000] cursor-pointer shrink-0" />
      </div>
    `;
  }).join('');
}

// -----------------------------------------------------------------------------
// 6. ОПТИМИЗИРОВАННЫЙ DRAG & DROP СТОЛБЦОВ
// -----------------------------------------------------------------------------

const dragColState = {
  timer: null,
  active: false,
  draggedIdx: null,
  activeRowEl: null
};

function setupColumnDragDelegation() {
  const container = dom.reorderableColumnsList;
  if (!container || container.dataset.dragInitialized) return;
  container.dataset.dragInitialized = 'true';

  container.addEventListener('pointerdown', (e) => {
    if (e.target && e.target.tagName === 'INPUT') return;
    const row = e.target.closest('.col-reorder-item');
    if (!row) return;

    const idx = Number(row.getAttribute('data-col-idx'));
    clearTimeout(dragColState.timer);

    dragColState.timer = setTimeout(() => {
      dragColState.active = true;
      dragColState.draggedIdx = idx;
      dragColState.activeRowEl = row;
      row.classList.add('col-drag-active');
      if (typeof row.setPointerCapture === 'function') {
        try { row.setPointerCapture(e.pointerId); } catch (_) {}
      }
      showToast('Перетащите столбец вверх или вниз');
    }, 240);
  });
}

window.addEventListener('pointermove', (e) => {
  if (!dragColState.active || dragColState.draggedIdx === null) return;
  e.preventDefault();

  const targetEl = document.elementFromPoint(e.clientX, e.clientY);
  const overRow = targetEl ? targetEl.closest('.col-reorder-item') : null;
  if (!overRow) return;

  const overIdx = Number(overRow.getAttribute('data-col-idx'));
  if (overIdx && overIdx !== dragColState.draggedIdx && overIdx > 0) {
    const moved = state.tableColumns.splice(dragColState.draggedIdx, 1)[0];
    state.tableColumns.splice(overIdx, 0, moved);
    dragColState.draggedIdx = overIdx;

    renderReorderableColumnsList();
    const activeRow = dom.reorderableColumnsList.querySelector(`.col-reorder-item[data-col-idx="${overIdx}"]`);
    if (activeRow) activeRow.classList.add('col-drag-active');

    if (state.viewMode === 'table') {
      renderBlock1();
    }
  }
}, { passive: false });

const endColumnDrag = () => {
  clearTimeout(dragColState.timer);
  if (dragColState.active) {
    dragColState.active = false;
    dragColState.draggedIdx = null;
    dragColState.activeRowEl = null;
    dom.reorderableColumnsList?.querySelectorAll('.col-reorder-item').forEach(el => el.classList.remove('col-drag-active'));
    if (state.viewMode === 'table') {
      renderBlock1();
    }
  }
};

window.addEventListener('pointerup', endColumnDrag);
window.addEventListener('pointercancel', endColumnDrag);

// -----------------------------------------------------------------------------
// 7. LEAFLET КАРТА (ЖИЗНЕННЫЙ ЦИКЛ С ПЕРЕИСПОЛЬЗОВАНИЕМ СЛОЕВ)
// -----------------------------------------------------------------------------

let leafletMap = null;
const leafletPolygons = new Map();

function openRealMapModal() {
  dom.realMapModal.classList.remove('hidden');
  setTimeout(() => initOrUpdateLeafletMap(), 60);
}

function closeRealMapModal() {
  dom.realMapModal.classList.add('hidden');
}

function initOrUpdateLeafletMap() {
  if (!window.L) {
    showToast('Библиотека карты загружается...');
    return;
  }

  if (!leafletMap) {
    leafletMap = L.map('leafletMapContainer', {
      zoomControl: true,
      attributionControl: true
    }).setView([55.742, 37.605], 11);

    leafletMap.attributionControl.setPrefix(false);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://openstreetmap.org" target="_blank" rel="noopener">OpenStreetMap</a> contributors, Tiles style by <a href="https://hotosm.org" target="_blank" rel="noopener">HOT</a>'
    }).addTo(leafletMap);

    districtsData.forEach(d => {
      const stats = getDistrictStats(d);

      const poly = L.polygon(d.polygon, {
        color: d.color,
        weight: 2,
        fillColor: d.color,
        fillOpacity: 0.22
      });

      poly.bindTooltip(
        `<div class="text-center leading-tight">
           <div class="font-extrabold text-[11px] text-[#FCE000]">${d.shortName}</div>
           <div class="text-[10px]">Ср: <b>${stats.avgStr}</b> • Пик: <b>${stats.peakStr}</b></div>
         </div>`,
        {
          permanent: true,
          direction: 'center',
          className: 'district-map-tooltip'
        }
      );

      poly.on('click', () => {
        selectDistrict(d.id);
        updateLeafletMapStyles();
      });

      leafletPolygons.set(d.id, poly);
    });
  } else {
    leafletMap.invalidateSize();
  }

  if (state.usingUserData) {
    leafletPolygons.forEach(p => {
      if (leafletMap.hasLayer(p)) leafletMap.removeLayer(p);
    });
    leafletMap.setView([61.5, 95.0], 3);
    dom.mapSelectedDistrictName.textContent = 'Локация пользователя (РФ)';
  } else {
    leafletPolygons.forEach(p => {
      if (!leafletMap.hasLayer(p)) p.addTo(leafletMap);
    });
    leafletMap.setView([55.742, 37.605], 11);
    const curDist = districtsData.find(d => d.id === state.districtId) || districtsData[0];
    dom.mapSelectedDistrictName.textContent = curDist.name;
    updateLeafletMapStyles();
  }
}

function updateLeafletMapStyles() {
  if (state.usingUserData) return;
  districtsData.forEach(d => {
    const poly = leafletPolygons.get(d.id);
    if (!poly) return;
    const isCurrent = d.id === state.districtId;
    const stats = getDistrictStats(d);

    poly.setStyle({
      color: isCurrent ? '#141518' : d.color,
      weight: isCurrent ? 3.5 : 2,
      fillColor: d.color,
      fillOpacity: isCurrent ? 0.45 : 0.22
    });

    poly.setTooltipContent(
      `<div class="text-center leading-tight">
         <div class="font-extrabold text-[11px] text-[#FCE000]">${d.shortName}</div>
         <div class="text-[10px]">Ср: <b>${stats.avgStr}</b> • Пик: <b>${stats.peakStr}</b></div>
       </div>`
    );
  });

  const curDist = districtsData.find(d => d.id === state.districtId) || districtsData[0];
  dom.mapSelectedDistrictName.textContent = curDist.name;
}

// -----------------------------------------------------------------------------
// 8. ОБРАБОТЧИКИ СОБЫТИЙ И ПОЛЬЗОВАТЕЛЬСКИХ ДЕЙСТВИЙ (PUBLIC API)
// -----------------------------------------------------------------------------

function toggleGrossNet() {
  state.isNet = !state.isNet;
  dom.lblGross.classList.toggle('ya-switch-opt-active', !state.isNet);
  dom.lblNet.classList.toggle('ya-switch-opt-active', state.isNet);
  renderBlock1();
  renderBlock2();
}

function toggleSumHourly() {
  state.isHourly = !state.isHourly;
  dom.lblSum.classList.toggle('ya-switch-opt-active', !state.isHourly);
  dom.lblHourly.classList.toggle('ya-switch-opt-active', state.isHourly);
  renderBlock1();
}

function toggleChartTable() {
  state.viewMode = state.viewMode === 'chart' ? 'table' : 'chart';
  dom.lblChart.classList.toggle('ya-switch-opt-active', state.viewMode === 'chart');
  dom.lblTable.classList.toggle('ya-switch-opt-active', state.viewMode === 'table');
  renderBlock1();
}

function setPeriod(p) {
  if (state.period === p) return;
  state.period = p;
  dataCache.invalidate();
  const currentData = getCurrentDataset();
  state.selectedBarIndex = Math.max(0, currentData.length - 1);

  ['days', 'weeks', 'months'].forEach(periodKey => {
    const btn = $(`btnPeriod-${periodKey}`);
    if (btn) btn.classList.toggle('ya-seg-btn-active', periodKey === p);
  });

  renderBlock1();
  renderBlock3();
}

function selectBar(idx) {
  if (state.selectedBarIndex === idx) return;
  const prevIdx = state.selectedBarIndex;
  state.selectedBarIndex = idx;

  const data = getCurrentDataset();
  const prevItem = data[prevIdx];
  const newItem = data[idx];

  const prevMetric = prevItem ? (state.isNet ? (state.isHourly ? prevItem.profitPerHr : prevItem.netProfit) : (state.isHourly ? prevItem.grossPerHr : prevItem.grossTotal)) : 0;
  const newMetric = newItem ? (state.isNet ? (state.isHourly ? newItem.profitPerHr : newItem.netProfit) : (state.isHourly ? newItem.grossPerHr : newItem.grossTotal)) : 0;

  // Быстрое обновление DOM без перерисовки всей диаграммы
  const prevCol = $(`barCol-${prevIdx}`);
  const prevStack = $(`barStack-${prevIdx}`);
  const prevVal = $(`barValue-${prevIdx}`);
  const prevDate = $(`barDate-${prevIdx}`);

  if (prevStack) {
    prevStack.classList.remove('ring-2', 'ring-[#FCE000]', 'ring-rose-400');
    prevStack.classList.add('opacity-90');
  }
  if (prevVal) {
    prevVal.classList.remove('opacity-100', 'font-black', 'text-[8.5px]', 'sm:text-[9px]', 'text-[10px]');
    prevVal.classList.add('opacity-75', 'text-[8px]', 'sm:text-[8.5px]');
    if (prevMetric < 0) {
      prevVal.classList.add('text-rose-500', 'font-extrabold');
      prevVal.classList.remove('text-main');
    }
  }
  if (prevDate) {
    prevDate.classList.remove('opacity-100', 'font-black', 'text-main', 'text-[10px]');
    prevDate.classList.add('opacity-70', 'font-semibold', 'text-[9px]');
  }

  const newStack = $(`barStack-${idx}`);
  const newVal = $(`barValue-${idx}`);
  const newDate = $(`barDate-${idx}`);

  if (newStack) {
    newStack.classList.remove('opacity-90');
    if (newMetric < 0) {
      newStack.classList.add('ring-2', 'ring-rose-400');
    } else {
      newStack.classList.add('ring-2', 'ring-[#FCE000]');
    }
  }
  if (newVal) {
    newVal.classList.remove('opacity-75', 'text-[8px]', 'sm:text-[8.5px]');
    newVal.classList.add('opacity-100', 'font-black', 'text-[8.5px]', 'sm:text-[9px]');
    if (newMetric < 0) {
      newVal.classList.add('text-rose-500', 'font-extrabold');
      newVal.classList.remove('text-main');
    } else {
      newVal.classList.add('text-main');
      newVal.classList.remove('text-rose-500', 'font-extrabold');
    }
  }
  if (newDate) {
    newDate.classList.remove('opacity-70', 'font-semibold', 'text-[9px]');
    newDate.classList.add('opacity-100', 'font-black', 'text-main', 'text-[10px]');
  }

  renderSelectedBarDetails(data[idx]);
  renderBlock3();

  const scrollContainer = document.getElementById('barScrollContainer');
  const activeBar = document.getElementById(`barCol-${idx}`);
  if (scrollContainer && activeBar) {
    const leftOffset = activeBar.offsetLeft - (scrollContainer.clientWidth / 2) + (activeBar.clientWidth / 2);
    scrollContainer.scrollTo({ left: Math.max(0, leftOffset), behavior: 'smooth' });
  }
}

function toggleWeather() {
  state.weatherBoost = !state.weatherBoost;
  renderBlock2();
  if (leafletMap && !dom.realMapModal.classList.contains('hidden')) {
    updateLeafletMapStyles();
  }
}

function toggleHeatUnit() {
  state.heatUnitRub = !state.heatUnitRub;
  renderBlock2();
  if (leafletMap && !dom.realMapModal.classList.contains('hidden')) {
    updateLeafletMapStyles();
  }
}

function toggleHeatCell(cellKey) {
  const [r, c] = cellKey.split('-').map(Number);
  const activeMatrix = (state.usingUserData && state.userDatasets && state.userDatasets.heatmapMatrix)
    ? state.userDatasets.heatmapMatrix
    : baseHeatmapMatrix;
  const rowObj = activeMatrix[r] || baseHeatmapMatrix[r];
  const comp = getCellComputedValue(rowObj?.values[c]);
  if (!comp) return;

  const idx = state.selectedSlotCells.indexOf(cellKey);
  const cellEl = document.querySelector(`.heat-cell[data-cell-key="${cellKey}"]`);

  if (idx >= 0) {
    state.selectedSlotCells.splice(idx, 1);
    if (cellEl) cellEl.classList.remove('heat-cell-selected');
  } else {
    state.selectedSlotCells.push(cellKey);
    if (cellEl) cellEl.classList.add('heat-cell-selected');
  }

  updateHeatmapSummary();
}

function clearSelectedSlots() {
  if (state.selectedSlotCells.length === 0) return;
  state.selectedSlotCells = [];
  document.querySelectorAll('.heat-cell-selected').forEach(el => el.classList.remove('heat-cell-selected'));
  updateHeatmapSummary();
  showToast('Выбор слотов сброшен');
}

function selectTop5Slots() {
  const allCells = [];
  const activeMatrix = (state.usingUserData && state.userDatasets && state.userDatasets.heatmapMatrix)
    ? state.userDatasets.heatmapMatrix
    : baseHeatmapMatrix;
  activeMatrix.forEach((row, rIdx) => {
    row.values.forEach((val, cIdx) => {
      const comp = getCellComputedValue(val);
      if (comp) {
        allCells.push({ key: `${rIdx}-${cIdx}`, val: comp.pct });
      }
    });
  });
  allCells.sort((a, b) => b.val - a.val);
  state.selectedSlotCells = allCells.slice(0, 5).map(c => c.key);

  document.querySelectorAll('.heat-cell').forEach(el => {
    const k = el.getAttribute('data-cell-key');
    el.classList.toggle('heat-cell-selected', state.selectedSlotCells.includes(k));
  });

  updateHeatmapSummary();
  showToast('Выбраны Топ-5 слотов (20 часов)');
}

function planSelectedSlots() {
  const summary = getSelectedSlotsSummary();
  if (summary.count === 0) {
    showToast('Выберите хотя бы один слот в таблице');
    return;
  }

  const slotItemsHtml = summary.items.map(s => `
    <div class="ya-subcard py-2 px-3 flex items-center justify-between">
      <span class="font-bold">${s.day}, ${s.hours} (4ч)</span>
      <span class="font-extrabold text-amber-400">+${s.comp.pct}% • ~${formatNum(s.comp.rubHr)} ₽/ч</span>
    </div>
  `).join('');

  const acctMeta = transportMeta[state.accountTransport] || transportMeta.ebike;
  const distObj = districtsData.find(d => d.id === state.districtId) || districtsData[0];

  dom.planModalTransport.textContent = `${acctMeta.icon} ${acctMeta.label}`;
  dom.planModalDistrict.textContent = distObj.shortName;
  dom.planModalTotal.textContent = `${summary.totalHours} ч • ~${formatNum(summary.totalRubEst)} ₽`;
  dom.planModalAvg.textContent = `+${summary.avgPctEst}% • ${formatNum(summary.avgHrEst)} ₽/ч`;
  dom.planModalSlotsList.innerHTML = slotItemsHtml;

  dom.planSlotsModal.classList.remove('hidden');
}

function closePlanSlotsModal() {
  dom.planSlotsModal.classList.add('hidden');
}

function confirmPlanSlots() {
  const count = state.selectedSlotCells.length;
  closePlanSlotsModal();
  showToast(`Слоты успешно запланированы (${count} сл., ${count * 4} ч)`);
}

function openForecastInfoModal() {
  dom.forecastInfoModal.classList.remove('hidden');
}

function closeForecastInfoModal() {
  dom.forecastInfoModal.classList.add('hidden');
}

function setCompareMode(mode) {
  if (state.compareMode === mode) return;
  state.compareMode = mode;
  ['transport', 'slot', 'total'].forEach(m => {
    const btn = $(`btnComp-${m}`);
    if (btn) btn.classList.toggle('ya-seg-btn-active', m === mode);
  });
  renderBlock3();
}

function onToggleGoals(checked) {
  state.includeGoals = checked;
  dataCache.invalidate();
  dom.goalsStatusLabel.textContent = checked ? '(с учетом целей)' : '(без учета целей)';
  dom.legendGoalsItem.classList.toggle('hidden', !checked);
  renderHeader();
  renderBlock1();
  renderBlock3();
}

function toggleTableColumn(key, checked) {
  const col = state.tableColumns.find(c => c.key === key);
  if (col) col.enabled = checked;
  if (state.viewMode === 'table') {
    renderBlock1();
  }
}

function applyTransportPreset(presetKey) {
  if (state.selectedPreset === presetKey) return;
  state.selectedPreset = presetKey;
  renderSettingsScreen(false);
  renderBlock2();
}

function updateExpense(idx, newVal, syncRange = false) {
  const item = state.expensesByTransport[state.selectedPreset]?.[idx];
  if (!item) return;

  item.value = Math.min(item.max, Math.max(0, newVal));
  dataCache.invalidate();

  if (syncRange) {
    const rangeInput = $(`expenseRangeInput-${idx}`);
    if (rangeInput) rangeInput.value = item.value;
  }
  const valLabel = $(`expenseValueLabel-${idx}`);
  if (valLabel) valLabel.textContent = `${formatNum(item.value)} ₽/нед`;

  // Обновляем бейджи расходов
  const presetSum = $(`presetSum-${state.selectedPreset}`);
  if (presetSum) presetSum.textContent = `${formatNum(getWeeklyExpenseForTransport(state.selectedPreset))} ₽`;
  dom.totalWeeklyExpenseBadge.textContent = `${formatNum(getTotalWeeklyExpenses())} ₽/нед`;

  // Обновляем зависимые финансовые блоки
  renderHeader();
  renderBlock1();
  renderBlock2();
  renderBlock3();
}

function stepExpense(idx, delta) {
  const item = state.expensesByTransport[state.selectedPreset]?.[idx];
  if (item) updateExpense(idx, Number(item.value) + delta, true);
}

function updateExpenseSlider(idx, val) {
  updateExpense(idx, Number(val));
}

function deleteExpenseItem(index) {
  const list = state.expensesByTransport[state.selectedPreset];
  const removed = list.splice(index, 1)[0];
  dataCache.invalidate();
  renderSettingsScreen(false);
  renderHeader();
  renderBlock1();
  renderBlock2();
  renderBlock3();
  if (removed) showToast(`Удалена статья «${removed.name}»`);
}

function resetExpensesToDefault() {
  state.expensesByTransport = cloneExpenses();
  dataCache.invalidate();
  renderSettingsScreen(false);
  renderHeader();
  renderBlock1();
  renderBlock2();
  renderBlock3();
  showToast('Расходы всех типов передвижения сброшены по умолчанию');
}

function toggleAddExpenseForm() {
  const form = dom.addExpenseForm;
  form.classList.toggle('hidden');
  if (!form.classList.contains('hidden')) {
    dom.newExpenseNameInput.focus();
  }
}

function confirmAddCustomExpense() {
  const input = dom.newExpenseNameInput;
  const list = state.expensesByTransport[state.selectedPreset];
  const rawName = input.value.trim();
  const name = rawName.substring(0, 40) || `Расход ${list.length + 1}`;

  list.push({ id: 'custom_' + Date.now(), name, value: 500, max: 25000 });
  dataCache.invalidate();

  input.value = '';
  dom.addExpenseForm.classList.add('hidden');

  renderSettingsScreen(false);
  renderHeader();
  renderBlock1();
  renderBlock2();
  renderBlock3();
  showToast(`Добавлен расход «${name}»`);
}

function setSeason(seasonKey) {
  if (state.usingUserData && seasonKey !== 'auto') {
    const avail = state.userDatasets?.availableSeasons || ['autumn'];
    if (!avail.includes(seasonKey)) {
      showToast(`В данных доступен только сезон: ${avail.map(s => seasonMultipliers[s]?.label || s).join(', ')}`);
      return;
    }
  }
  if (state.season === seasonKey) return;
  state.season = seasonKey;
  renderBlock2();
  if (leafletMap && !dom.realMapModal.classList.contains('hidden')) {
    updateLeafletMapStyles();
  }
}

function selectDistrict(distId) {
  if (state.usingUserData) {
    showToast('В режиме пользовательских данных используется локация пользователя');
    return;
  }
  if (state.districtId === distId) return;
  state.districtId = distId;
  renderBlock2();
  if (leafletMap && !dom.realMapModal.classList.contains('hidden')) {
    updateLeafletMapStyles();
  }
}

// Навигация по экранам
function navigateScreen(screen) {
  state.currentScreen = screen;
  dom.screenMain.classList.toggle('hidden', screen !== 'main');
  dom.screenMiddleSpec.classList.toggle('hidden', screen !== 'middle');
  dom.screenSettings.classList.toggle('hidden', screen !== 'settings');

  if (screen !== 'main') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    requestAnimationFrame(() => {
      const scrollContainer = document.getElementById('barScrollContainer');
      if (scrollContainer) {
        const activeBar = document.getElementById(`barCol-${state.selectedBarIndex}`);
        if (activeBar && scrollContainer.clientWidth > 0) {
          const leftOffset = activeBar.offsetLeft - (scrollContainer.clientWidth / 2) + (activeBar.clientWidth / 2);
          scrollContainer.scrollLeft = Math.max(0, leftOffset);
        } else {
          scrollContainer.scrollLeft = scrollContainer.scrollWidth;
        }
      }
    });
  }
}

const openSettingsScreen = () => navigateScreen('settings');
const closeSettingsScreen = () => {
  navigateScreen('main');
  requestAnimationFrame(() => {
    const scrollContainer = document.getElementById('barScrollContainer');
    if (scrollContainer) {
      const activeBar = document.getElementById(`barCol-${state.selectedBarIndex}`);
      if (activeBar && scrollContainer.clientWidth > 0) {
        const leftOffset = activeBar.offsetLeft - (scrollContainer.clientWidth / 2) + (activeBar.clientWidth / 2);
        scrollContainer.scrollLeft = Math.max(0, leftOffset);
      } else {
        scrollContainer.scrollLeft = scrollContainer.scrollWidth;
      }
    }
  });
};
const openDistrictSeasonModal = () => navigateScreen('middle');
const closeMiddleScreen = () => navigateScreen('main');

// Управление разворачиванием подстрок таблицы по видам транспорта
function toggleRowExpansion(rowKey) {
  if (state.collapsedDateKeys.has(rowKey)) {
    state.collapsedDateKeys.delete(rowKey);
  } else {
    state.collapsedDateKeys.add(rowKey);
  }
  renderDetailedTable(getCurrentDataset());
}

function expandAllDateSubRows() {
  state.collapsedDateKeys.clear();
  renderDetailedTable(getCurrentDataset());
}

function collapseAllDateSubRows() {
  const data = getCurrentDataset();
  data.forEach(r => {
    if (Array.isArray(r.subRows) && r.subRows.length > 1) {
      const k = r.fullDate || r.weekCycleKey || r.monthKey || r.date;
      state.collapsedDateKeys.add(k);
    }
  });
  renderDetailedTable(getCurrentDataset());
}

window.toggleRowExpansion = toggleRowExpansion;
window.expandAllDateSubRows = expandAllDateSubRows;
window.collapseAllDateSubRows = collapseAllDateSubRows;

// Темы оформления (Темная / Светлая)
function toggleColorTheme() {
  state.lightMode = !state.lightMode;
  document.body.classList.toggle('light-mode', state.lightMode);
  dom.btnColorTheme.textContent = state.lightMode ? '🌙' : '☀️';
  renderBlock1();
}

function openExportModal() {
  const data = getCurrentDataset();
  const totalNet = data.reduce((a, r) => a + r.netProfit, 0);
  showToast(`Отчет (${data.length} пер., Чистыми: ${formatNum(totalNet)} ₽) выгружен в CSV/PDF`);
}

// Всплывающие уведомления (Toast)
let toastTimer = null;
function showToast(msg) {
  const box = dom.toastBox;
  dom.toastText.textContent = msg;
  box.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => box.classList.add('hidden'), 3000);
}

// -----------------------------------------------------------------------------
// 9. ГЛОБАЛЬНЫЕ КЛАВИАТУРНЫЕ СОБЫТИЯ И ДОСТУПНОСТЬ
// -----------------------------------------------------------------------------

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!dom.realMapModal.classList.contains('hidden')) {
      closeRealMapModal();
    } else if (!dom.planSlotsModal.classList.contains('hidden')) {
      closePlanSlotsModal();
    } else if (!dom.forecastInfoModal.classList.contains('hidden')) {
      closeForecastInfoModal();
    } else if (state.currentScreen !== 'main') {
      navigateScreen('main');
    }
  }
});

// -----------------------------------------------------------------------------
// 10. ЭКСПОРТ В GLOBAL SCOPE ДЛЯ INLINE HTML ONCLICK HANDLERS
// -----------------------------------------------------------------------------

Object.assign(window, {
  toggleLayoutMode,
  triggerUserDataFileInput,
  handleUserDataFileUpload,
  resetToDemoData,
  toggleColorTheme,
  showToast,
  openExportModal,
  toggleGrossNet,
  toggleSumHourly,
  toggleChartTable,
  openSettingsScreen,
  closeSettingsScreen,
  setPeriod,
  toggleWeather,
  toggleHeatUnit,
  openDistrictSeasonModal,
  closeMiddleScreen,
  clearSelectedSlots,
  selectTop5Slots,
  planSelectedSlots,
  setCompareMode,
  setSeason,
  openRealMapModal,
  closeRealMapModal,
  resetExpensesToDefault,
  applyTransportPreset,
  confirmAddCustomExpense,
  toggleAddExpenseForm,
  onToggleGoals,
  closePlanSlotsModal,
  confirmPlanSlots,
  closeForecastInfoModal,
  openForecastInfoModal,
  selectDistrict,
  selectBar,
  toggleHeatCell,
  updateExpenseSlider,
  stepExpense,
  deleteExpenseItem,
  toggleTableColumn,
  setWeekStartDay
});

// -----------------------------------------------------------------------------
// 11. ПЕРВИЧНЫЙ ЗАПУСК
// -----------------------------------------------------------------------------

try {
  const savedWs = localStorage.getItem('courier_week_start_day');
  if (savedWs !== null) {
    const parsedWs = parseInt(savedWs, 10);
    if (!isNaN(parsedWs) && parsedWs >= 0 && parsedWs <= 6) {
      state.weekStartDay = parsedWs;
    }
  }
} catch (e) {}

setupColumnDragDelegation();
updateWeekStartDayUI();
renderAll();
