# Work Order Schedule Timeline

An interactive timeline component for a manufacturing ERP system built with Angular 19. Visualize, create, and edit work orders across multiple work centers with Day/Week/Month zoom levels.

## Quick Start

```bash
npm install
ng serve
```

Navigate to `http://localhost:4200/`.

## Features

### Core
- **Timeline Grid** with Day/Week/Month zoom levels
- **Work Order Bars** with status-based colors (Open, In Progress, Complete, Blocked)
- **Create/Edit Panel** with slide-out animation and form validation
- **Three-dot Menu** with Edit/Delete actions per work order
- **Overlap Detection** prevents scheduling conflicts on same work center
- **Today Indicator** vertical line showing current date/period

### Bonus
- **localStorage Persistence** — work orders survive page refresh
- **GSAP Animations** — smooth panel slide-in/out, bar entrance, row stagger
- **Keyboard Navigation** — Escape to close panel, Tab through form fields
- **Today Button** — quickly jump viewport to center on today's date
- **Tooltip on Bar Hover** — shows order name, status, and date range
- **Accessibility** — ARIA labels, focus management, reduced-motion support

## Architecture

```
src/app/
├── components/
│   ├── timeline/          # Main timeline grid + controls
│   ├── work-order-bar/    # Individual work order bar
│   └── work-order-panel/  # Create/Edit slide-out panel
├── data/
│   └── sample-data.ts     # Hardcoded sample data (6 centers, 10 orders)
├── models/
│   ├── work-center.model.ts
│   └── work-order.model.ts
└── services/
    └── work-order.service.ts  # Data management + localStorage
```

### Key Decisions

**Date Positioning**: Bar positions calculated as percentage of total timeline range, then converted to pixel offsets. This ensures smooth positioning across zoom level changes.

**State Management**: Angular signals used in the service layer for reactive data. The timeline component reads directly from the service's signal state.

**Form Architecture**: Single panel component handles both create and edit modes via a `mode` flag. Reactive Forms (FormGroup/FormControl) with custom cross-field validators for date range and overlap detection.

**Animations**: GSAP (GreenSock) for complex, physics-based animations (panel slide, bar entrance). CSS transitions for micro-interactions (hover states, focus rings). 

## Libraries

| Library | Purpose |
|---------|---------|
| Angular 19 | Framework (standalone components, signals) |
| PrimeNG 19 | UI component foundation |
| ng-select 14 | Dropdown/select for status field |
| @ng-bootstrap 18 | Date picker (ngb-datepicker) |
| GSAP | Complex entrance/exit animations |
| Anime.js 3.2 | Available for spring-based animations |

## Design Reference

- **Font**: Circular Std (400, 500, 600, 700 weights)
- **Colors**: Extracted from Sketch file — primary `#3e40db`, text `#030929`, muted `#687196`
- **Status Colors**: Open `#d4d7ff`, In Progress `#d6d8ff`, Complete `#d1fab3`, Blocked `#fceeb5`
- **Layout**: 1440px viewport, 380px sidebar, 48px row height, 38px bar height

## Sample Data

Pre-loaded with:
- 6 work centers with realistic manufacturing names
- 10 work orders across different centers
- All 4 status types represented
- Multiple non-overlapping orders on same work center
- Orders relative to today's date for immediate visibility

## Running Tests

```bash
ng test
```

## Building for Production

```bash
ng build
```

Build artifacts are stored in `dist/`.
