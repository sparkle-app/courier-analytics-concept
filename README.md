# Продуктовый и UI/UX-концепт: аналитика дохода курьера

🔗 **Интерактивное демо (GitHub Pages):** [https://sparkle-app.github.io/courier-analytics-concept/](https://sparkle-app.github.io/courier-analytics-concept/)

## О проекте (RU)
Независимый некоммерческий продуктовый и UI/UX-концепт аналитической вкладки дохода для курьеров доставки.

### Основные модули прототипа:
1. **Динамика и структура дохода (Начислено vs Чистыми):** декомпозиция начислений, учет индивидуальных расходов по типам передвижения (Пеший, Вело, Электровело, Авто), налога НПД и штрафов-корректировок.
2. **Тепловая матрица доплат за спрос и дохода в час:** планирование слотов с учетом осадков, сезона и полигона доставки на интерактивной карте (Leaflet + OpenStreetMap).
3. **Сравнение средних показателей:** сопоставление по типам передвижения (включая персональный прогноз перехода на другие типы передвижения с учетом графика пользователя), типам слотов (Плановый / Свободный) и обезличенным бенчмаркам района и города (Среднее / Топ-20%).

### Правовое уведомление и условия использования (Disclaimer & Terms)
* **Независимый статус:** Данный проект является независимым исследовательским прототипом (Product & UX Case Study) и **не является официальным продуктом или ресурсом каких-либо компаний и сервисов доставки**.
* **Синтетические данные:** Все числовые показатели, графики и таблицы внутри прототипа сгенерированы в демонстрационных целях (вымышленные данные).
* **Конфиденциальность (100% In-Memory):** Прототип работает исключительно локально в оперативной памяти браузера пользователя (Zero-Server Architecture), не собирает, не хранит и не передает персональные данные на внешние серверы.
* **Условия «КАК ЕСТЬ» (AS IS):** Прототип предоставляется на условиях «КАК ЕСТЬ» без каких-либо явных или подразумеваемых гарантий. Разработчик не несет ответственности за любые решения, убытки или действия, основанные на демонстрационных данных Сервиса (подробнее см. Пользовательское соглашение в интерфейсе приложения).
* **Интеллектуальная собственность:** Авторский код, архитектура интерфейса и графические решения защищены авторским правом (All Rights Reserved). Некоммерческий исследовательский проект. Коммерческое использование, декомпиляция или тиражирование без согласия правообладателя запрещены.

---

## About & Legal Disclaimer (EN)
This repository contains an independent, non-commercial UI/UX and Product Management concept (prototype) for a courier income analytics dashboard.
* **Not Affiliated:** This project is an educational/portfolio case study and is not affiliated with, endorsed by, or connected to any commercial delivery service.
* **Synthetic Data & Privacy:** All metrics displayed in the prototype are synthetic mock data. Prototype operates 100% client-side (In-Memory). No user data, personal info, or cookies are collected or stored.
* **"AS IS" Disclaimer:** The service and code are provided "AS IS", without warranties of any kind, express or implied. The author disclaims any liability for loss or damages resulting from the use of this prototype.
* **License & Proprietary Code:** The original codebase and interface design are protected by copyright (All Rights Reserved). Commercial use, unauthorized distribution, or monetization is strictly prohibited without explicit written permission.
* **Open-Source Libraries Used:** 
  - Tailwind CSS (MIT License)
  - Leaflet.js (BSD-2-Clause License)
  - SheetJS (Apache-2.0 License)
  - OpenStreetMap & HOT Tiles (ODbL / CC BY-SA 2.0)
  - Inter Font (SIL OFL 1.1)

---

More design ideas from Claude Sonnet 5.5 Extra (for fun):

<p align="left">
  <img src="designs/Sonnet 5.5 Extra (1).png" width="150" alt="Базовая версия" />
  <img src="designs/Sonnet 5.5 Extra (3).png" width="150" alt="Футуризм" />
  <img src="designs/Sonnet 5.5 Extra (2).png" width="150" alt="Киберпанк" />
  <img src="designs/Sonnet 5.5 Extra (5).png" width="150" alt="Чек/журнал" />
  <img src="designs/Sonnet 5.5 Extra (4).png" width="150" alt="Чек/журнал" />
</p>
