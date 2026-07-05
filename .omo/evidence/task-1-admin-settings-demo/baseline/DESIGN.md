# Timor Crest Purchaser Mobile Demo Design System

## 1. Atmosphere & Identity

Timor Crest is a clean purchaser mobile app: bright, direct, and confidence-building. The signature is a white 20:9 phone canvas with one blue action language, compact owner facts, rounded service buttons, and progress cards that make contract, payment, construction, documents, preview, and MY feel like one continuous app.

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
|------|-------|-------|------|-------|
| Surface/primary | --surface-primary | #F4F8FF | #08111F | Browser background outside phone |
| Surface/phone | --surface-phone | #FFFFFF | #111827 | Phone canvas |
| Surface/secondary | --surface-secondary | #F7FAFF | #172033 | Cards and bands |
| Surface/elevated | --surface-elevated | #FFFFFF | #1F2937 | Raised controls |
| Surface/blue-soft | --surface-blue-soft | #EAF3FF | #163457 | Blue-tinted panels |
| Text/primary | --text-primary | #102033 | #F9FBFF | Headlines and key facts |
| Text/secondary | --text-secondary | #607086 | #C2CCDA | Body and metadata |
| Text/tertiary | --text-tertiary | #94A3B8 | #94A3B8 | Helper labels |
| Border/default | --border-default | #D8E4F5 | #2C3D55 | Controls and cards |
| Border/subtle | --border-subtle | #E9F0FA | #223048 | Soft separators |
| Accent/primary | --accent-primary | #1769FF | #6EA2FF | Primary buttons and selected state |
| Accent/hover | --accent-hover | #0B55D8 | #93B9FF | Active press and hover |
| Accent/deep | --accent-deep | #0B2E6F | #DCEAFF | Deep blue text and charts |
| Status/success | --status-success | #21A67A | #70E0BA | Complete and paid |
| Status/warning | --status-warning | #F59E0B | #FACC15 | Due soon |
| Status/error | --status-error | #E5484D | #FF9CA0 | Unpaid and errors |
| Status/info | --status-info | #1769FF | #93B9FF | Informational notices |

### Rules

- Blue is the only accent for action, active state, and progress.
- White and very pale blue surfaces carry the app; no warm beige, copper, green, or dark luxury palette.
- User-visible MY labels replace all prior configuration language.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
|-------|------|--------|-------------|----------|-------|
| Display | 32px | 800 | 1.12 | 0 | Home hero name |
| H1 | 28px | 800 | 1.18 | 0 | Page title |
| H2 | 22px | 750 | 1.25 | 0 | Section headers |
| H3 | 17px | 750 | 1.35 | 0 | Card titles |
| Body/lg | 16px | 500 | 1.55 | 0 | Lead copy |
| Body | 14px | 500 | 1.5 | 0 | Default mobile text |
| Body/sm | 13px | 500 | 1.45 | 0 | Secondary info |
| Caption | 11px | 700 | 1.35 | 0.04em | Labels and chips |

### Font Stack

- Primary: `"Segoe UI Variable", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif`
- Mono: `"Cascadia Mono", "SFMono-Regular", monospace`

### Rules

- Korean text uses `word-break: keep-all` with compact line lengths.
- No negative tracking.
- Mobile labels stay short enough to fit rounded buttons.

## 4. Spacing & Layout

### Base Unit

All spacing derives from 4px.

| Token | Value | Usage |
|-------|-------|-------|
| --space-1 | 4px | Tight icon gap |
| --space-2 | 8px | Compact groups |
| --space-3 | 12px | Button padding |
| --space-4 | 16px | Card padding |
| --space-5 | 20px | Section gap |
| --space-6 | 24px | Page breathing |
| --space-8 | 32px | Large page gap |

### Grid

- Primary artifact: one centered 20:9 smartphone frame.
- Phone frame width: `min(430px, 100vw - 24px)`.
- Aspect ratio: `9 / 20`, with scrolling only on detail pages.
- Home must fit major owner info and buttons in one 20:9 frame without internal scroll.

### Rules

- Main service buttons are large rounded tiles in a 2x2 grid.
- Bottom navigation is always visible in the phone shell.
- Detailed pages may scroll inside the phone content area.

## 5. Components

### Phone Shell
- **Structure**: outer device frame, status row, content viewport, bottom navigation.
- **Variants**: home compact, detail scroll.
- **Spacing**: --space-3 through --space-5.
- **States**: active route, focus, pressed nav item.
- **Accessibility**: nav buttons expose selected route.
- **Motion**: page fade/translate on view change.

### Round Button
- **Structure**: pill or rounded tile button.
- **Variants**: primary, secondary, service, pagination, MY tab.
- **Spacing**: --space-2 through --space-4.
- **States**: default, hover, active, focus, selected.
- **Accessibility**: real buttons, clear text labels.
- **Motion**: scale-down on active and blue fill on press/selected.

### Progress Meter
- **Structure**: animated number plus progress bar.
- **Variants**: construction progress, payment progress.
- **Spacing**: --space-3 and --space-4.
- **States**: loading animation, complete value.
- **Accessibility**: `aria-label` carries final value.
- **Motion**: transform-free width animation and number count-up.

### Stage Card
- **Structure**: stage name, state chip, percent, date, guide text.
- **Variants**: complete, current, upcoming, waiting.
- **Spacing**: --space-3 and --space-4.
- **States**: selected/current, complete, waiting.
- **Accessibility**: status text is visible, not color-only.
- **Motion**: card press only when clickable.

### Document Notice Card
- **Structure**: type chip, title, summary, date.
- **Variants**: document, notice.
- **Spacing**: --space-4.
- **States**: page-switched by pagination.
- **Accessibility**: pagination buttons announce selected page.
- **Motion**: page buttons use common button press.

### MY Panel
- **Structure**: four large buttons, collapsed detail region.
- **Variants**: 내 정보, 계약 / 서류, 상담, 개인 알림.
- **Spacing**: --space-3 and --space-4.
- **States**: hidden, expanded selected panel.
- **Accessibility**: `aria-expanded` on each MY button.
- **Motion**: detail panel fades in below selected button.

## 6. Motion & Interaction

### Timing

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Micro | 140ms | cubic-bezier(0.2, 0.8, 0.2, 1) | Button press |
| Standard | 220ms | cubic-bezier(0.2, 0.8, 0.2, 1) | View switch |
| Meter | 900ms | cubic-bezier(0.16, 1, 0.3, 1) | Progress fill and count-up |

### Rules

- Every clickable button scales to 0.97 on active press.
- Buttons turn blue or deepen blue on selected/pressed state.
- Reduced motion disables count-up and view reveal transitions.

## 7. Depth & Surface

### Strategy

White card surfaces with light blue borders and soft blue shadows.

| Level | Value | Usage |
|-------|-------|-------|
| Subtle | 0 1px 2px rgba(23, 105, 255, 0.06) | Small chips |
| Default | 0 14px 34px rgba(23, 105, 255, 0.12) | Cards and phone shell |
| Prominent | 0 24px 70px rgba(11, 46, 111, 0.18) | Device frame |

The UI should read like a real mobile app, not a desktop dashboard squeezed into a phone.
