// =============================================================================
// КОНЦЕПТ АНАЛИТИКИ ДОХОДА КУРЬЕРА (v13.6) — ЛОГИКА И СОСТОЯНИЕ (script.js)
// =============================================================================

// Хелпер быстрого доступа к DOM
const $ = id => document.getElementById(id);

// Базовые неизменяемые расходы по умолчанию для типов транспорта
const defaultTransportExpenses = {
  walk: [
    { id: 'rent', name: 'Аренда', value: 400, max: 25000 },
    { id: 'food', name: 'Еда', value: 1200, max: 25000 }
  ],
  bike: [
    { id: 'rent', name: 'Аренда', value: 1100, max: 25000 },
    { id: 'food', name: 'Еда', value: 1400, max: 25000 }
  ],
  ebike: [
    { id: 'rent', name: 'Аренда', value: 3900, max: 25000 },
    { id: 'food', name: 'Еда', value: 1400, max: 25000 }
  ],
  car: [
    { id: 'rent', name: 'Аренда', value: 7800, max: 25000 },
    { id: 'food', name: 'Еда', value: 1800, max: 25000 }
  ]
};

const cloneExpenses = () => JSON.parse(JSON.stringify(defaultTransportExpenses));

// Единое реактивное состояние приложения
const state = {
  wireframeMode: false,
  lightMode: false,
  currentScreen: 'main',

  isNet: true,
  isHourly: false,
  viewMode: 'chart',
  period: 'days',
  selectedBarIndex: 4,

  accountTransport: 'ebike',
  includeGoals: true,
  selectedPreset: 'ebike',
  expensesByTransport: cloneExpenses(),
  get expenses() {
    return this.expensesByTransport[this.selectedPreset] || [];
  },

  tableColumns: [
    { key: 'date',        label: 'Дата',                 enabled: true },
    { key: 'netProfit',   label: 'Прибыль (на руки)',    enabled: true },
    { key: 'profitPerHr', label: 'Прибыль в час',        enabled: true },
    { key: 'ordersPerHr', label: 'Заказов в час',        enabled: true },
    { key: 'slotHours',   label: 'Длит. слота (ч)',      enabled: true },
    { key: 'ordersCount', label: 'Кол-во заказов',       enabled: true },
    { key: 'grossTotal',  label: 'Начислено (до расх.)', enabled: true },
    { key: 'ordersCost',  label: 'Стоимость заказов',    enabled: true },
    { key: 'surgeRub',    label: 'Доплата (спрос)',      enabled: true },
    { key: 'ratingRub',   label: 'Доплата (рейтинг)',    enabled: true },
    { key: 'bonuses',     label: 'Бонусы',               enabled: true },
    { key: 'goals',       label: 'Цели',                 enabled: true },
    { key: 'tips',        label: 'Чаевые',               enabled: true },
    { key: 'tax',         label: 'Налог',                enabled: true },
    { key: 'adjustments', label: 'Корректировки',        enabled: true },
    { key: 'expenses',    label: 'Расходы',              enabled: true },
    { key: 'dayOfWeek',   label: 'День недели',          enabled: false },
    { key: 'transport',   label: 'Транспорт',            enabled: false },
    { key: 'surgePct',    label: 'Доплата (спрос; %)',   enabled: false },
    { key: 'ratingPct',   label: 'Доплата (рейтинг; %)', enabled: false }
  ],

  weatherBoost: false,
  heatUnitRub: false,
  season: 'auto',
  districtId: 'center_south',
  selectedSlotCells: ['4-4', '4-5', '4-6', '2-4', '2-5'],
  compareMode: 'transport'
};

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
    { date: '21.10', dayOfWeek: 'Ср', slotHours: 8,  ordersCount: 17, transport: 'Электровело', transportKey: 'ebike', ordersCost: 2600, surgePct: 35, surgeRub: 1250, ratingPct: 15, ratingRub: 560, bonuses: 480, goals: 550, tips: 320, adjustments: -100 },
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

const comparisonDatasets = {
  transport: {
    columns: [
      { key: 'walk',  title: 'Пеший',       forecast: false },
      { key: 'bike',  title: 'Вело',        forecast: false },
      { key: 'ebike', title: 'Электровело', forecast: false },
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
      { label: 'Прибыль в час',             vals: ['DYNAMIC', '530 ₽/ч']}
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

// =============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ И РАСЧЕТЫ
// =============================================================================

function formatNum(n) {
  return Math.round(Number(n || 0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function formatCompact(n) {
  return n >= 10000 ? (n / 1000).toFixed(1) + 'к' : formatNum(n);
}

function getPeriodExpenseFactor(periodKey) {
  if (periodKey === 'days') return 1 / 6;
  if (periodKey === 'months') return 4.2;
  return 1;
}

function getWeeklyExpenseForTransport(transportKey) {
  const list = state.expensesByTransport[transportKey] || [];
  return list.reduce((acc, item) => acc + Number(item.value || 0), 0);
}

const getTotalWeeklyExpenses = () => getWeeklyExpenseForTransport(state.selectedPreset);

function enrichRow(rawRow, periodKey) {
  const goalsVal = state.includeGoals ? rawRow.goals : 0;
  const grossTotal = rawRow.ordersCost + rawRow.surgeRub + rawRow.ratingRub + rawRow.bonuses + goalsVal + rawRow.tips;
  const tax = Math.round(grossTotal * 0.06);

  const factor = getPeriodExpenseFactor(periodKey);
  const slotTransportKey = rawRow.transportKey || 'ebike';
  const slotExpensesList = state.expensesByTransport[slotTransportKey] || [];
  const itemizedExpenses = slotExpensesList.map(e => ({
    name: e.name,
    amount: Math.round(Number(e.value || 0) * factor)
  }));
  const rowExpense = itemizedExpenses.reduce((a, b) => a + b.amount, 0);

  const penaltyAdjustments = -Math.abs(Number(rawRow.adjustments || 0));
  const netProfit = Math.max(0, grossTotal - tax - rowExpense + penaltyAdjustments);
  const ordersPerHr = (rawRow.ordersCount / rawRow.slotHours).toFixed(2);
  const profitPerHr = Math.round(netProfit / rawRow.slotHours);
  const grossPerHr = Math.round(grossTotal / rawRow.slotHours);

  return {
    ...rawRow,
    adjustments: penaltyAdjustments,
    goals: goalsVal,
    grossTotal,
    grossPerHr,
    tax,
    expenses: rowExpense,
    itemizedExpenses,
    netProfit,
    ordersPerHr,
    profitPerHr
  };
}

function getCurrentDataset() {
  const list = rawDatasets[state.period] || rawDatasets.days;
  return list.map(r => enrichRow(r, state.period));
}

function getAllTimeHourlyProfit() {
  const allMonths = rawDatasets.months.map(r => enrichRow(r, 'months'));
  const totalNet = allMonths.reduce((a, r) => a + r.netProfit, 0);
  const totalHrs = allMonths.reduce((a, r) => a + r.slotHours, 0);
  return totalHrs > 0 ? Math.round(totalNet / totalHrs) : 0;
}

function getCellComputedValue(basePct) {
  const distObj = districtsData.find(d => d.id === state.districtId) || districtsData[0];
  const distFactor = distObj.avgPct / 42;
  const seasonFactor = seasonMultipliers[state.season].mult;
  const weatherAdd = state.weatherBoost ? 16 : 0;

  const acctMeta = transportMeta[state.accountTransport] || transportMeta.ebike;
  const finalPct = Math.round(basePct * distFactor * seasonFactor + weatherAdd);
  const rubPerHour = Math.round(acctMeta.baseHourlyRub * (1 + finalPct / 100));
  return { pct: finalPct, rubHr: rubPerHour };
}

function getSelectedSlotsSummary() {
  const count = state.selectedSlotCells.length;
  const totalHours = count * 4;
  let totalRubEst = 0;
  let totalPctSum = 0;
  const items = state.selectedSlotCells.map(key => {
    const [r, c] = key.split('-').map(Number);
    const rowObj = baseHeatmapMatrix[r];
    const comp = getCellComputedValue(rowObj?.values[c] || 35);
    totalRubEst += comp.rubHr * 4;
    totalPctSum += comp.pct;
    return { day: shortDayNames[c], hours: rowObj.hours, comp };
  });

  return {
    count,
    totalHours,
    totalRubEst,
    avgHrEst: totalHours > 0 ? Math.round(totalRubEst / totalHours) : 0,
    avgPctEst: count > 0 ? Math.round(totalPctSum / count) : 0,
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
    const sumNet = matchingRows.reduce((a, r) => a + r.netProfit, 0);
    const sumHrs = matchingRows.reduce((a, r) => a + r.slotHours, 0);
    return Math.round(sumNet / sumHrs);
  }

  const cityAvgGrossHr = (transportMeta[tKey] && transportMeta[tKey].cityAvgGrossHr) || 980;
  const hrs = Math.max(1, userHoursInPeriod);
  const grossForUserHours = cityAvgGrossHr * hrs;
  const tax = Math.round(grossForUserHours * 0.06);
  const periodExpense = Math.round(getWeeklyExpenseForTransport(tKey) * getPeriodExpenseFactor(state.period));
  const netForecast = grossForUserHours - tax - periodExpense;
  return Math.round(netForecast / hrs);
}

// =============================================================================
// ОСНОВНОЙ РЕНДЕРИНГ
// =============================================================================

function renderAll(skipSettingsSlidersRebuild = false) {
  const allTimeProfitHr = getAllTimeHourlyProfit();
  $('allTimeHourlyProfit').textContent = `${formatNum(allTimeProfitHr)} ₽/ч`;
  $('goalsStatusLabel').textContent = state.includeGoals ? '(с учетом целей)' : '(без учета целей)';

  $('lblGross').classList.toggle('ya-switch-opt-active', !state.isNet);
  $('lblNet').classList.toggle('ya-switch-opt-active', state.isNet);
  $('lblSum').classList.toggle('ya-switch-opt-active', !state.isHourly);
  $('lblHourly').classList.toggle('ya-switch-opt-active', state.isHourly);
  $('lblChart').classList.toggle('ya-switch-opt-active', state.viewMode === 'chart');
  $('lblTable').classList.toggle('ya-switch-opt-active', state.viewMode === 'table');

  ['days', 'weeks', 'months'].forEach(p => {
    const btn = $(`btnPeriod-${p}`);
    if (btn) btn.classList.toggle('ya-seg-btn-active', state.period === p);
  });

  renderBlock1();
  renderBlock2();
  renderBlock3(allTimeProfitHr);
  renderSettingsScreen(skipSettingsSlidersRebuild);
}

// Блок 1: Динамика дохода (Диаграмма / Таблица)
function renderBlock1() {
  const data = getCurrentDataset();
  if (state.selectedBarIndex >= data.length) {
    state.selectedBarIndex = data.length - 1;
  }

  $('block1Title').textContent = state.viewMode === 'chart' ? 'Динамика дохода' : 'Таблица доходов и расходов';
  $('chartViewContainer').classList.toggle('hidden', state.viewMode !== 'chart');
  $('tableViewContainer').classList.toggle('hidden', state.viewMode !== 'table');

  $('legendGoalsItem').classList.toggle('hidden', !state.includeGoals);
  $('legendGrossBg').classList.toggle('hidden', !state.isNet);

  if (state.viewMode === 'chart') {
    renderBarChart(data);
  } else {
    renderDetailedTable(data);
  }
}

function renderBarChart(data) {
  const canvas = $('barChartCanvas');
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

  let html = `
    <div class="absolute left-0 top-3 bottom-6 w-8 flex flex-col justify-between text-[9px] pr-1 text-right text-mut">
      <span>${formatCompact(yTop)}</span>
      <span>${formatCompact(yMid)}</span>
      <span>0</span>
    </div>

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

    <div class="w-full h-full flex items-end justify-around gap-1.5 border-b border-l relative z-10 px-1 border-strong">
  `;

  data.forEach((d, idx) => {
    const grossMetric = state.isHourly ? d.grossPerHr : d.grossTotal;
    const netMetric   = state.isHourly ? d.profitPerHr : d.netProfit;
    const displayMetric = state.isNet ? netMetric : grossMetric;

    const grossHeightPct = Math.max(6, Math.round((grossMetric / maxGrossVal) * 100));
    const netHeightPct   = Math.max(4, Math.round((displayMetric / maxGrossVal) * 100));

    const totalParts = d.grossTotal || 1;
    const p = key => ((d[key] / totalParts) * 100).toFixed(1);

    const isSelected = idx === state.selectedBarIndex;

    html += `
      <div onclick="selectBar(${idx})" class="flex-1 h-full flex flex-col justify-end items-center cursor-pointer group relative">
        <div class="text-[9px] font-bold mb-0.5 ${isSelected ? 'opacity-100' : 'opacity-70'}">
          ${formatCompact(displayMetric)}
        </div>

        <div class="w-full max-w-[36px] h-full flex items-end justify-center relative">
          ${state.isNet ? `
            <div style="height: ${grossHeightPct}%"
                 class="w-full bg-gray-500/35 border border-dashed border-gray-400/70 rounded-t-lg absolute bottom-0 left-0 right-0">
            </div>
          ` : ''}

          <div style="height: ${netHeightPct}%"
               class="w-4/5 relative z-10 rounded-t-lg overflow-hidden flex flex-col-reverse shadow ${isSelected ? 'ring-2 ring-[#FCE000]' : 'opacity-90 group-hover:opacity-100'}">
            <div style="height: ${p('ordersCost')}%" class="w-full bg-blue-500"></div>
            <div style="height: ${p('surgeRub')}%"   class="w-full bg-[#FCE000]"></div>
            <div style="height: ${p('ratingRub')}%"  class="w-full bg-orange-400"></div>
            <div style="height: ${p('bonuses')}%"    class="w-full bg-purple-500"></div>
            ${state.includeGoals ? `<div style="height: ${p('goals')}%" class="w-full bg-pink-500"></div>` : ''}
            <div style="height: ${p('tips')}%"       class="w-full bg-emerald-400"></div>
          </div>
        </div>

        <div class="absolute -bottom-5 text-[10px] font-semibold ${isSelected ? 'underline font-extrabold' : 'opacity-65'}">
          ${d.date}
        </div>
      </div>
    `;
  });

  html += `</div>`;
  canvas.innerHTML = html;

  const sel = data[state.selectedBarIndex];
  const deductionBadges = [];

  if (sel.tax > 0) {
    deductionBadges.push(`<span class="ya-badge ya-badge-red">Налог: <b>-${formatNum(sel.tax)} ₽</b></span>`);
  }
  sel.itemizedExpenses.forEach(expItem => {
    if (expItem.amount > 0) {
      deductionBadges.push(`<span class="ya-badge ya-badge-red">${expItem.name}: <b>-${formatNum(expItem.amount)} ₽</b></span>`);
    }
  });
  if (sel.adjustments < 0) {
    deductionBadges.push(`<span class="ya-badge ya-badge-red">Корректировки: <b>-${formatNum(Math.abs(sel.adjustments))} ₽</b></span>`);
  }

  $('selectedBarDetails').innerHTML = `
    <div class="flex items-center justify-between">
      <div>
        <span class="font-extrabold">${sel.date} (${sel.dayOfWeek})</span>
        <span class="opacity-70 ml-1">• ${sel.transport} • ${sel.slotHours} ч • ${sel.ordersCount} зак.</span>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-1.5 text-[10px] pt-1">
      <span class="ya-badge ya-badge-grey">Начислено: <b>${formatNum(sel.grossTotal)} ₽</b></span>
      ${deductionBadges.join('')}
      <span class="ya-badge ya-badge-green">Чистыми: <b>${formatNum(sel.netProfit)} ₽ (${formatNum(sel.profitPerHr)} ₽/ч)</b></span>
    </div>
  `;
}

function renderDetailedTable(data) {
  const enabledCols = state.tableColumns.filter(c => c.enabled);
  const thead = $('detailedTableHead');
  const tbody = $('detailedTableBody');
  const tfoot = $('detailedTableFoot');

  let headHtml = '<tr>';
  enabledCols.forEach((col, i) => {
    const stickyCls = i === 0 ? 'sticky left-0 z-10 border-r min-w-[54px] border-strong bg-elevated' : 'min-w-[72px] max-w-[90px]';
    headHtml += `<th class="py-1.5 px-1 font-bold text-[9.5px] leading-snug whitespace-normal align-middle ${stickyCls}">${col.label}</th>`;
  });
  headHtml += '</tr>';
  thead.innerHTML = headHtml;

  let bodyHtml = '';
  data.forEach(row => {
    bodyHtml += '<tr class="hover:opacity-90 transition">';
    enabledCols.forEach((col, i) => {
      const stickyCls = i === 0 ? 'sticky left-0 font-bold z-10 border-r bg-card border-strong' : '';
      bodyHtml += `<td class="py-1.5 px-1 text-[10px] whitespace-nowrap ${stickyCls}">${formatTableCellValue(row, col.key)}</td>`;
    });
    bodyHtml += '</tr>';
  });
  tbody.innerHTML = bodyHtml;

  let footHtml = '<tr>';
  enabledCols.forEach((col, i) => {
    const stickyCls = i === 0 ? 'sticky left-0 z-10 border-r bg-elevated border-strong' : '';
    footHtml += `<td class="py-1.5 px-1 text-[10px] whitespace-nowrap ${stickyCls}">${i === 0 ? 'ИТОГО / СР.' : formatTableFootValue(data, col.key)}</td>`;
  });
  footHtml += '</tr>';
  tfoot.innerHTML = footHtml;
}

function formatTableCellValue(row, key) {
  switch (key) {
    case 'date':        return row.date;
    case 'dayOfWeek':   return row.dayOfWeek;
    case 'slotHours':   return `${row.slotHours} ч`;
    case 'ordersCount': return row.ordersCount;
    case 'ordersPerHr': return row.ordersPerHr;
    case 'transport':   return row.transport;
    case 'grossTotal':  return `<span class="font-semibold">${formatNum(row.grossTotal)} ₽</span>`;
    case 'surgePct':
    case 'ratingPct':   return `+${row[key]}%`;
    case 'tax':
    case 'expenses':    return `<span class="text-rose-400">-${formatNum(row[key])} ₽</span>`;
    case 'adjustments': return row.adjustments === 0 ? '0 ₽' : `<span class="text-rose-400">-${formatNum(Math.abs(row.adjustments))} ₽</span>`;
    case 'netProfit':   return `<span class="font-extrabold text-emerald-400">${formatNum(row.netProfit)} ₽</span>`;
    case 'profitPerHr': return `<span class="font-extrabold">${formatNum(row.profitPerHr)} ₽/ч</span>`;
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
    case 'transport':   return 'Электровело';
    case 'slotHours':   return `${sum('slotHours')} ч`;
    case 'ordersCount': return sum('ordersCount');
    case 'ordersPerHr': return (sum('ordersCount') / sum('slotHours')).toFixed(2);
    case 'surgePct':    return `+${avg('surgePct')}%`;
    case 'ratingPct':   return `+${avg('ratingPct')}%`;
    case 'profitPerHr': return `${formatNum(avg('profitPerHr'))} ₽/ч`;
    case 'netProfit':   return `<span class="text-emerald-400">${formatNum(sum('netProfit'))} ₽</span>`;
    case 'adjustments': return sum('adjustments') === 0 ? '0 ₽' : `<span class="text-rose-400">-${formatNum(Math.abs(sum('adjustments')))} ₽</span>`;
    case 'tax':
    case 'expenses':    return `<span class="text-rose-400">-${formatNum(sum(key))} ₽</span>`;
    default:            return `${formatNum(sum(key))} ₽`;
  }
}

// Блок 2: Матрица спроса и планирование слотов
function renderBlock2() {
  const btnWeather = $('btnWeather');
  btnWeather.style.backgroundColor = state.weatherBoost ? 'var(--ya-yellow)' : 'var(--bg-card)';
  btnWeather.style.color = state.weatherBoost ? 'var(--ya-yellow-text)' : 'var(--text-main)';

  $('lblUnitPct').classList.toggle('ya-switch-opt-active', !state.heatUnitRub);
  $('lblUnitRub').classList.toggle('ya-switch-opt-active', state.heatUnitRub);

  $('block2Title').textContent = state.heatUnitRub
    ? 'Средний общий доход в час (с учетом спроса)'
    : 'Средняя доплата за спрос по часам';

  const distObj = districtsData.find(d => d.id === state.districtId) || districtsData[0];
  const seasonObj = seasonMultipliers[state.season];
  $('currentDistrictSeasonSub').textContent = `${distObj.shortName} • ${seasonObj.label}`;

  const tbody = $('heatmapTableBody');
  let html = '';
  baseHeatmapMatrix.forEach((row, rIdx) => {
    html += `<tr><td class="text-left font-medium py-1.5 pl-0.5 pr-1 whitespace-nowrap text-[9.5px] opacity-80">${row.hours}</td>`;
    row.values.forEach((baseVal, cIdx) => {
      const cellKey = `${rIdx}-${cIdx}`;
      const isSelected = state.selectedSlotCells.includes(cellKey);
      const comp = getCellComputedValue(baseVal);
      const displayStr = state.heatUnitRub ? `${comp.rubHr}₽` : `+${comp.pct}%`;
      const colorCls = getHeatCellColor(comp.pct);

      html += `
        <td>
          <div onclick="toggleHeatCell('${cellKey}')"
               class="heat-cell rounded-lg py-1.5 px-0 text-[9.5px] font-bold ${colorCls} ${isSelected ? 'heat-cell-selected' : ''}">
            ${displayStr}
          </div>
        </td>
      `;
    });
    html += `</tr>`;
  });
  tbody.innerHTML = html;

  const summary = getSelectedSlotsSummary();
  const avgMetricLabel = summary.count > 0
    ? (state.heatUnitRub ? ` • Ср. ${formatNum(summary.avgHrEst)} ₽/ч` : ` • Ср. +${summary.avgPctEst}%`)
    : '';

  $('selectedSlotsCounter').textContent = `Выбрано: ${summary.count} сл. (${summary.totalHours}ч)${avgMetricLabel}`;
  $('btnClearSlots').classList.toggle('opacity-40', summary.count === 0);

  $('plannedProfitEstimate').textContent = summary.totalHours > 0
    ? `Расчет прибыли: ~${formatNum(summary.totalRubEst)} ₽ (${summary.avgHrEst} ₽/ч за ${summary.totalHours}ч)`
    : `Выберите слоты в таблице для расчета прибыли`;

  renderDistrictSeasonScreen();
}

function getHeatCellColor(pct) {
  if (pct >= 60) return 'bg-[#FCE000] text-[#141518]';
  if (pct >= 45) return 'bg-amber-400/85 text-[#141518]';
  if (pct >= 32) return 'bg-amber-500/30';
  return 'bg-gray-500/15 opacity-80';
}

function renderDistrictSeasonScreen() {
  ['auto', 'summer', 'autumn', 'winter', 'spring'].forEach(s => {
    const btn = $(`btnSeason-${s}`);
    if (btn) btn.classList.toggle('ya-seg-btn-active', state.season === s);
  });

  $('districtListUnitHint').textContent = state.heatUnitRub ? 'Средняя / Пик (₽/ч)' : 'Средняя / Пик (% спроса)';

  const listContainer = $('districtListContainer');
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
            <div class="text-xs font-bold truncate">${d.name}</div>
            <div class="text-[10px] text-sec">Сезон: ${seasonMultipliers[state.season].label}</div>
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

// Блок 3: Сравнение показателей
function renderBlock3(allTimeProfitHr) {
  ['transport', 'slot', 'total'].forEach(m => {
    const btn = $(`btnComp-${m}`);
    if (btn) btn.classList.toggle('ya-seg-btn-active', state.compareMode === m);
  });

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

  const ds = comparisonDatasets[state.compareMode];
  const thead = $('compareTableHead');
  const tbody = $('compareTableBody');
  const tfoot = $('compareTableFoot');

  let headHtml = `<tr><th class="py-1.5 px-1.5 font-bold text-[9.5px] leading-snug whitespace-normal sticky left-0 z-10 border-r min-w-[94px] max-w-[104px] bg-elevated border-strong">Показатель</th>`;
  ds.columns.forEach(colItem => {
    if (typeof colItem === 'object') {
      if (colItem.forecast) {
        headHtml += `
          <th class="py-1.5 px-1 font-bold text-[9px] leading-snug text-center whitespace-normal align-middle min-w-[76px] max-w-[88px]">
            <div class="inline-flex items-center justify-center gap-1 flex-wrap">
              <span>${colItem.title}</span>
              <button onclick="openForecastInfoModal()" title="Как рассчитывается прогноз" class="w-4 h-4 rounded-full bg-[#FCE000] text-[#141518] font-extrabold text-[9px] inline-flex items-center justify-center shadow hover:opacity-90 active:scale-95 transition">?</button>
            </div>
          </th>
        `;
      } else {
        headHtml += `<th class="py-1.5 px-1 font-bold text-[9.5px] leading-snug text-center whitespace-normal align-middle min-w-[62px] max-w-[76px]">${colItem.title}</th>`;
      }
    } else {
      let resolvedColName = colItem;
      if (colItem === 'DYNAMIC_PERIOD_COL') resolvedColName = `Вы (${periodTag})`;
      if (colItem === 'AVG_DIST_COL')       resolvedColName = `Ср. район (${periodTag})`;
      if (colItem === 'TOP_DIST_COL')       resolvedColName = `Топ-20% района (${periodTag})`;
      if (colItem === 'AVG_CITY_COL')       resolvedColName = `Ср. город (${periodTag})`;
      if (colItem === 'TOP_CITY_COL')       resolvedColName = `Топ-20% города (${periodTag})`;
      headHtml += `<th class="py-1.5 px-1 font-bold text-[9px] leading-snug text-center whitespace-normal align-middle min-w-[62px] max-w-[76px]">${resolvedColName}</th>`;
    }
  });
  headHtml += `</tr>`;
  thead.innerHTML = headHtml;

  let bodyHtml = '';
  ds.rowsPerOrder.forEach(row => {
    bodyHtml += `<tr class="hover:opacity-90">
      <td class="py-1.5 px-1.5 font-medium text-[9.5px] leading-snug whitespace-normal sticky left-0 z-10 border-r min-w-[94px] max-w-[104px] bg-card border-strong text-sec">${row.label}</td>`;
    row.vals.forEach(v => {
      bodyHtml += `<td class="py-1.5 px-1 text-[10px] text-center whitespace-nowrap">${v}</td>`;
    });
    bodyHtml += `</tr>`;
  });
  tbody.innerHTML = bodyHtml;

  let footHtml = '';
  ds.rowsTotal.forEach(row => {
    footHtml += `<tr>
      <td class="py-1.5 px-1.5 font-extrabold text-[9.5px] leading-snug whitespace-normal sticky left-0 z-10 border-r min-w-[94px] max-w-[104px] bg-elevated border-strong">${row.label}</td>`;
    row.vals.forEach(v => {
      let cellVal = v.trim();
      if (cellVal === 'DYNAMIC') cellVal = `${formatNum(userPeriodProfitHr)} ₽/ч`;
      else if (cellVal === 'DYNAMIC_ORD_HR') cellVal = `${userPeriodOrdersHr}`;
      else if (cellVal === 'ALLTIME') cellVal = `${formatNum(allTimeProfitHr)} ₽/ч`;
      else if (cellVal === 'CAR_FORECAST_DYN') {
        const val = getTransportProfitPerHourForComparison('car', userHoursInSelectedPeriod, currentData);
        cellVal = `<span class="${val < 0 ? 'text-rose-400' : ''}">${formatNum(val)} ₽/ч</span>`;
      } else if (cellVal.endsWith('_DYN')) {
        const tKey = cellVal.replace('_DYN', '').toLowerCase();
        const val = getTransportProfitPerHourForComparison(tKey, userHoursInSelectedPeriod, currentData);
        cellVal = `${formatNum(val)} ₽/ч`;
      }
      footHtml += `<td class="py-1.5 px-1 text-[10px] text-center font-extrabold whitespace-nowrap">${cellVal}</td>`;
    });
    footHtml += `</tr>`;
  });
  tfoot.innerHTML = footHtml;
}

// Экран настроек
function renderSettingsScreen(skipSlidersRebuild = false) {
  $('chkIncludeGoals').checked = state.includeGoals;

  ['walk', 'bike', 'ebike', 'car'].forEach(t => {
    const btn = $(`presetBtn-${t}`);
    const isSelected = state.selectedPreset === t;
    btn.style.backgroundColor = isSelected ? 'var(--ya-yellow)' : 'var(--bg-elevated)';
    btn.style.color = isSelected ? 'var(--ya-yellow-text)' : 'var(--text-main)';

    const sumSpan = $(`presetSum-${t}`);
    if (sumSpan) sumSpan.textContent = `${formatNum(getWeeklyExpenseForTransport(t))} ₽`;
  });

  $('totalWeeklyExpenseBadge').textContent = `${formatNum(getTotalWeeklyExpenses())} ₽/нед`;

  if (!skipSlidersRebuild) {
    const slidersEl = $('expenseSlidersContainer');
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
            <span class="font-bold truncate">${item.name}</span>
            <div class="flex items-center gap-2 shrink-0">
              <span id="expenseValueLabel-${idx}" class="font-extrabold">${formatNum(item.value)} ₽/нед</span>
              <button onclick="deleteExpenseItem(${idx})" title="Удалить статью расхода" class="w-5 h-5 rounded-md bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 flex items-center justify-center text-[10px] font-bold active:scale-95 transition">✕</button>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="stepExpense(${idx}, -100)" class="px-2.5 py-1 rounded-lg bg-black/20 hover:bg-black/30 border border-white/10 text-xs font-extrabold active:scale-95 transition shrink-0">-100</button>
            <input id="expenseRangeInput-${idx}" type="range" min="0" max="${item.max}" step="100" value="${item.value}"
                   oninput="updateExpenseSlider(${idx}, this.value)"
                   class="flex-1 h-6 cursor-pointer touch-pan-y" />
            <button onclick="stepExpense(${idx}, 100)" class="px-2.5 py-1 rounded-lg bg-black/20 hover:bg-black/30 border border-white/10 text-xs font-extrabold active:scale-95 transition shrink-0">+100</button>
          </div>
        </div>
      `).join('');
    }
  }

  renderReorderableColumnsList();
}

function renderReorderableColumnsList() {
  const listEl = $('reorderableColumnsList');
  if (!listEl) return;

  const items = state.tableColumns.slice(1);
  listEl.innerHTML = items.map((c, idx) => {
    const realIdx = idx + 1;
    return `
      <div data-col-idx="${realIdx}"
           class="col-reorder-item ya-subcard py-2 px-2.5 flex items-center justify-between gap-2 transition cursor-grab active:cursor-grabbing">
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-xs opacity-50 font-bold select-none" title="Удерживайте для перетаскивания">☰</span>
          <span class="text-[11px] font-semibold truncate">${realIdx}. ${c.label}</span>
        </div>
        <input type="checkbox" ${c.enabled ? 'checked' : ''}
               onchange="toggleTableColumn('${c.key}', this.checked)"
               class="w-4 h-4 accent-[#FCE000] cursor-pointer shrink-0" />
      </div>
    `;
  }).join('');

  initLongPressDragColumns();
}

// Drag & Drop перетаскивание столбцов (долгий тап / клик)
let dragColState = { timer: null, active: false, draggedIdx: null };

function initLongPressDragColumns() {
  const container = $('reorderableColumnsList');
  if (!container) return;

  container.querySelectorAll('.col-reorder-item').forEach(row => {
    row.addEventListener('pointerdown', (e) => {
      if (e.target && e.target.tagName === 'INPUT') return;
      const idx = Number(row.getAttribute('data-col-idx'));
      clearTimeout(dragColState.timer);
      dragColState.timer = setTimeout(() => {
        dragColState.active = true;
        dragColState.draggedIdx = idx;
        row.classList.add('col-drag-active');
        showToast('Перетащите столбец вверх или вниз');
      }, 260);
    });
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
    const activeRow = document.querySelector(`.col-reorder-item[data-col-idx="${overIdx}"]`);
    if (activeRow) activeRow.classList.add('col-drag-active');
    renderBlock1();
  }
}, { passive: false });

window.addEventListener('pointerup', () => {
  clearTimeout(dragColState.timer);
  if (dragColState.active) {
    dragColState.active = false;
    dragColState.draggedIdx = null;
    document.querySelectorAll('.col-reorder-item').forEach(el => el.classList.remove('col-drag-active'));
  }
});

// =============================================================================
// LEAFLET ИНТЕРАКТИВНАЯ КАРТА РАЙОНОВ
// =============================================================================

let leafletMap = null;
let polygonLayers = [];

function openRealMapModal() {
  $('realMapModal').classList.remove('hidden');
  setTimeout(() => initOrUpdateLeafletMap(), 60);
}

function closeRealMapModal() {
  $('realMapModal').classList.add('hidden');
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
      attribution: '&copy; <a href="https://openstreetmap.org" target="_blank">OpenStreetMap</a> contributors, Tiles style by <a href="https://hotosm.org" target="_blank">HOT</a> hosted by <a href="https://openstreetmap.fr" target="_blank">OSM France</a>'
    }).addTo(leafletMap);
  } else {
    leafletMap.invalidateSize();
  }

  polygonLayers.forEach(layer => leafletMap.removeLayer(layer));
  polygonLayers = [];

  districtsData.forEach(d => {
    const isCurrent = d.id === state.districtId;
    const stats = getDistrictStats(d);

    const poly = L.polygon(d.polygon, {
      color: isCurrent ? '#141518' : d.color,
      weight: isCurrent ? 3.5 : 2,
      fillColor: d.color,
      fillOpacity: isCurrent ? 0.45 : 0.22
    }).addTo(leafletMap);

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
      initOrUpdateLeafletMap();
    });

    polygonLayers.push(poly);
  });

  const curDist = districtsData.find(d => d.id === state.districtId) || districtsData[0];
  $('mapSelectedDistrictName').textContent = curDist.name;
}

// =============================================================================
// ОБРАБОТЧИКИ СОБЫТИЙ И ПОЛЬЗОВАТЕЛЬСКИХ ДЕЙСТВИЙ
// =============================================================================

function toggleGrossNet() {
  state.isNet = !state.isNet;
  renderAll();
}

function toggleSumHourly() {
  state.isHourly = !state.isHourly;
  renderAll();
}

function toggleChartTable() {
  state.viewMode = state.viewMode === 'chart' ? 'table' : 'chart';
  renderAll();
}

function setPeriod(p) {
  state.period = p;
  state.selectedBarIndex = 0;
  renderAll();
}

function selectBar(idx) {
  state.selectedBarIndex = idx;
  renderAll();
}

function toggleWeather() {
  state.weatherBoost = !state.weatherBoost;
  renderAll();
}

function toggleHeatUnit() {
  state.heatUnitRub = !state.heatUnitRub;
  renderAll();
}

function toggleHeatCell(cellKey) {
  const idx = state.selectedSlotCells.indexOf(cellKey);
  if (idx >= 0) {
    state.selectedSlotCells.splice(idx, 1);
  } else {
    state.selectedSlotCells.push(cellKey);
  }
  renderBlock2();
}

function clearSelectedSlots() {
  if (state.selectedSlotCells.length === 0) return;
  state.selectedSlotCells = [];
  renderBlock2();
  showToast('Выбор слотов сброшен');
}

function selectTop5Slots() {
  const allCells = [];
  baseHeatmapMatrix.forEach((row, rIdx) => {
    row.values.forEach((val, cIdx) => {
      allCells.push({ key: `${rIdx}-${cIdx}`, val });
    });
  });
  allCells.sort((a, b) => b.val - a.val);
  state.selectedSlotCells = allCells.slice(0, 5).map(c => c.key);
  renderBlock2();
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

  $('planModalTransport').textContent = `${acctMeta.icon} ${acctMeta.label}`;
  $('planModalDistrict').textContent = distObj.shortName;
  $('planModalTotal').textContent = `${summary.totalHours} ч • ~${formatNum(summary.totalRubEst)} ₽`;
  $('planModalAvg').textContent = `+${summary.avgPctEst}% • ${formatNum(summary.avgHrEst)} ₽/ч`;
  $('planModalSlotsList').innerHTML = slotItemsHtml;

  $('planSlotsModal').classList.remove('hidden');
}

function closePlanSlotsModal() {
  $('planSlotsModal').classList.add('hidden');
}

function confirmPlanSlots() {
  const count = state.selectedSlotCells.length;
  closePlanSlotsModal();
  showToast(`Слоты успешно запланированы (${count} сл., ${count * 4} ч)`);
}

function openForecastInfoModal() {
  $('forecastInfoModal').classList.remove('hidden');
}

function closeForecastInfoModal() {
  $('forecastInfoModal').classList.add('hidden');
}

function setCompareMode(mode) {
  state.compareMode = mode;
  renderAll();
}

function onToggleGoals(checked) {
  state.includeGoals = checked;
  renderAll();
}

function toggleTableColumn(key, checked) {
  const col = state.tableColumns.find(c => c.key === key);
  if (col) col.enabled = checked;
  renderAll();
}

function applyTransportPreset(presetKey) {
  state.selectedPreset = presetKey;
  renderAll();
}

function updateExpense(idx, newVal, syncRange = false) {
  const item = state.expensesByTransport[state.selectedPreset]?.[idx];
  if (!item) return;
  item.value = Math.min(item.max, Math.max(0, newVal));
  if (syncRange) {
    const rangeInput = $(`expenseRangeInput-${idx}`);
    if (rangeInput) rangeInput.value = item.value;
  }
  const valLabel = $(`expenseValueLabel-${idx}`);
  if (valLabel) valLabel.textContent = `${formatNum(item.value)} ₽/нед`;
  renderAll(true);
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
  renderAll(false);
  if (removed) showToast(`Удалена статья «${removed.name}»`);
}

function resetExpensesToDefault() {
  state.expensesByTransport = cloneExpenses();
  renderAll(false);
  showToast('Расходы всех типов передвижения сброшены по умолчанию');
}

function toggleAddExpenseForm() {
  const form = $('addExpenseForm');
  form.classList.toggle('hidden');
  if (!form.classList.contains('hidden')) {
    $('newExpenseNameInput').focus();
  }
}

function confirmAddCustomExpense() {
  const input = $('newExpenseNameInput');
  const list = state.expensesByTransport[state.selectedPreset];
  const name = input.value.trim() || `Расход ${list.length + 1}`;
  list.push({ id: 'custom_' + Date.now(), name, value: 500, max: 25000 });
  input.value = '';
  $('addExpenseForm').classList.add('hidden');
  renderAll(false);
  showToast(`Добавлен расход «${name}»`);
}

function setSeason(seasonKey) {
  state.season = seasonKey;
  renderAll();
}

function selectDistrict(distId) {
  state.districtId = distId;
  renderAll();
}

// Навигация по экранам
function navigateScreen(screen) {
  state.currentScreen = screen;
  $('screenMain').classList.toggle('hidden', screen !== 'main');
  $('screenMiddleSpec').classList.toggle('hidden', screen !== 'middle');
  $('screenSettings').classList.toggle('hidden', screen !== 'settings');
  if (screen !== 'main') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

const openSettingsScreen = () => navigateScreen('settings');
const closeSettingsScreen = () => navigateScreen('main');
const openDistrictSeasonModal = () => navigateScreen('middle');
const closeMiddleScreen = () => navigateScreen('main');

// Темы оформления
function toggleWireframeTheme() {
  state.wireframeMode = !state.wireframeMode;
  if (state.wireframeMode) {
    state.lightMode = false;
    document.body.classList.remove('light-mode');
  }
  document.body.classList.toggle('wireframe-mode', state.wireframeMode);
  $('btnWireTheme').textContent = state.wireframeMode ? '📐 Стиль: Ч/Б схема' : '🎨 Стиль: Цветной';
  renderAll();
}

function toggleColorTheme() {
  state.lightMode = !state.lightMode;
  if (state.lightMode) {
    state.wireframeMode = false;
    document.body.classList.remove('wireframe-mode');
    $('btnWireTheme').textContent = '🎨 Стиль: Цветной';
  }
  document.body.classList.toggle('light-mode', state.lightMode);
  $('btnColorTheme').textContent = state.lightMode ? '🌙' : '☀️';
  renderAll();
}

function openExportModal() {
  const data = getCurrentDataset();
  const totalNet = data.reduce((a, r) => a + r.netProfit, 0);
  showToast(`Отчет (${data.length} пер., Чистыми: ${formatNum(totalNet)} ₽) выгружен в CSV/PDF`);
}

// Всплывающие уведомления (Toast)
let toastTimer = null;
function showToast(msg) {
  const box = $('toastBox');
  $('toastText').textContent = msg;
  box.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => box.classList.add('hidden'), 3000);
}

// Запуск первичного рендеринга
renderAll();
