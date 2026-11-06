# Project: Courier Analytics Controls & Prototypes Redesign

## Architecture
- **Web UI Single Page Application**:
  - `index.html`: Main dashboard markup, header, switch cards container (`#block1SwitchCards`), period controls (`#block1PeriodButtons`), chart/table containers.
  - `style.css`: Design tokens, dark/light theme properties, two-tier card styling, segmented pill styling, typography stabilization.
  - `script.js`: State variables (`currentGrossNet`, `currentSumHourly`, `currentViewMode`, `currentPeriod`), toggle event listeners, DOM renderers.
- **Prototypes**:
  - `prototypes/period_controls_prototypes.html`: Dedicated isolated showcase file containing 7 substantially distinct layout variants for period switching («дни / недели / месяцы»).
- **Test Infrastructure**:
  - `tests/test_analytics.py`: Automated test suite with 50 unit and DOM structure assertions. All 50 tests pass cleanly.

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | R1: Git Branch Reset | Synchronize `dev_ui` with `main` (`git reset --hard main`) | M1 | ORIGINAL_REQUEST | DONE |
| 2 | R2.1: Two-Tier Switch Cards | Two-tier cards: category uppercase in small font on top, larger active value below | M2 | ORIGINAL_REQUEST & Screenshot 1 | DONE |
| 3 | R2.2: Order of Controls | 1. «Показатель» (`switchSumHourly`), 2. «Режим» (`switchGrossNet`), 3. «Диаграмма» / «Таблица» (`switchChartTable`) | M2 | ORIGINAL_REQUEST | DONE |
| 4 | R2.3: Segmented Pill Switch | Compact segmented pill container: active blue capsule (`#2563EB` -> `#3B82F6`) with white icon, outline inactive icon | M2 | ORIGINAL_REQUEST & Screenshot 2 | DONE |
| 5 | R2.4: Typography Stabilization | Align font format, size, weight, and letter spacing across all states to eliminate font jumping | M2 | ORIGINAL_REQUEST | DONE |
| 6 | R3: Equalizer Settings Icon | Style settings button with 3 vertical slider lines/knobs icon | M2 | ORIGINAL_REQUEST & Screenshot 3 | DONE |
| 7 | R4: Period Controls Prototypes | Create `prototypes/period_controls_prototypes.html` with 7 substantially distinct compact layouts for Days/Weeks/Months (isolated button blocks only) | M3 | ORIGINAL_REQUEST | DONE |
| 8 | R5: Protected Assets Safety | Zero modifications to gitignored files (`.antigravityrules`, `GEMINI.md`, `server.py`, `tests/`, `scratch/`, `data.xlsx`) and `designs/` | Cross-cutting | ORIGINAL_REQUEST | DONE |
| 9 | SemVer & Regression Protection | Preserve SemVer `v13.14.7` per hardcoded assertion in `test_analytics.py:313` and verify 50/50 passing tests | M4 | ORIGINAL_REQUEST & GEMINI.md | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Git Sync & Baseline | Reset `dev_ui` to `main`, verify baseline test suite (50/50 OK) | none | DONE |
| 2 | M2: UI Controls & Icons Redesign | Implement two-tier cards, pill switch, equalizer icon, and typography stabilization in `index.html`, `style.css` | M1 | DONE |
| 3 | M3: Period Controls Prototypes | Create `prototypes/period_controls_prototypes.html` with 7 distinct compact variants | M1 | DONE |
| 4 | M4: Multi-Agent Gate & Verification | 2 Reviewers, 2 Challengers, 1 Forensic Auditor, verify all acceptance criteria and 50/50 tests | M2, M3 | DONE |

## Code Layout
- `index.html`: Main UI markup with reordered switch cards and equalizer settings icon
- `style.css`: Styles for two-tier cards, segmented pill switch, typography stability
- `script.js`: State management and event handlers
- `prototypes/period_controls_prototypes.html`: 7 standalone period switch prototypes
- `tests/test_analytics.py`: Read-only verification harness (50 tests passing)
- `designs/`: Read-only visual references
