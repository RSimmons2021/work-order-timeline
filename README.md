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
- **Infinite Horizontal Scroll** — dynamically loads more date columns as you scroll near edges
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

## Trade-offs & Decisions

| Decision | Why | Alternative Considered |
|----------|-----|----------------------|
| **Context menu rendered at timeline level** | Three-dot dropdown needs to escape `overflow: hidden` on the scrollable grid. Rendering with `position: fixed` at the timeline root avoids all clipping/z-index issues. | Rendering inside bar component (failed due to overflow clipping). |
| **GSAP for animations** | Provides physics-based easing curves and staggered entrance animations that CSS alone cannot achieve cleanly. | `@angular/animations` — lighter but limited stagger/timeline support. Marked with `@upgrade` for future migration. |
| **localStorage for persistence** | Simple, zero-config persistence that meets the bonus requirement. No backend needed. | IndexedDB (better for large datasets, marked with `@upgrade`). |
| **Signals in service, plain arrays in component** | Service uses Angular signals for reactive state. Timeline component reads snapshot arrays for simpler template binding and avoids signal unwrapping in loops. | Full signal-based reactivity — would need `computed()` for derived state like `getOrdersForCenter`. |
| **Single panel for create + edit** | Reduces code duplication. A `mode` flag switches between pre-filled (edit) and empty (create) form state. | Separate components — more isolated but nearly identical templates. |
| **Dynamic row heights** | Rows expand to fit multiple non-overlapping bars stacked vertically (43px per bar). Prevents visual overlap when a work center has many orders. | Fixed row height with horizontal stacking — harder to read. |
| **Overlap validated on submit only** | Simpler implementation. Real-time validation during typing would need debounced async validators. | Live overlap feedback as dates change (marked with `@upgrade`). |
| **Date-to-pixel linear mapping** | Straightforward proportional calculation across the full timeline range. Works well for the current column count (~25-60). | Virtual scrolling for 1000+ columns (marked with `@upgrade`). |

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
