# Timor Crest Product Design System

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
- **Variants**: construction progress, payment progress, Journey progress.
- **Spacing**: --space-3 and --space-4.
- **States**: loading animation, complete value.
- **Accessibility**: `aria-label` carries final value.
- **Motion**: transform-based bar fill and number count-up.

### Stage Card
- **Structure**: stage name, state chip, percent, date, guide text.
- **Variants**: Journey complete, in progress, pending, delayed; payment stage variants.
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

### Clickable Summary Card
- **Structure**: whole-card link wrapping the summary content, with a small text hint at the bottom instead of a separate CTA button.
- **Variants**: contract summary to Journey, payment summary to payment detail, document summary to document detail, preview summary to preview.
- **Spacing**: same as `info-card` and `meter-card`; no nested button inside the card.
- **States**: default, hover/focus border emphasis, active press.
- **Accessibility**: use a real link for navigation so keyboard focus and Enter activation work naturally.
- **Motion**: subtle lift on hover/focus and minimal scale on active press.

### Expandable Select List
- **Structure**: section title, item count, circular chevron toggle, one visible record while collapsed, scrollable card list while expanded.
- **Variants**: contractor selector, unit selector, payment contractor selector, document contractor selector.
- **Spacing**: --space-2 through --space-3, with record cards reusing the Admin Record Card rhythm.
- **States**: collapsed, expanded, selected, delete action.
- **Accessibility**: toggle uses `aria-expanded` and `aria-controls`; records are real buttons when selectable.
- **Motion**: toggle press uses common button press; list expansion uses bounded height without layout animation loops.

### Collapsible Admin Panel
- **Structure**: compact card header, optional summary text, and a small circular chevron toggle inside the card top-right.
- **Variants**: contractor account creation, unit creation, payment method/settings, Journey step editing, selected contractor document management.
- **Spacing**: same admin card padding, with the internal form rendered transparent to avoid nested-card bulk.
- **States**: collapsed by default for management forms, expanded when the user needs to edit.
- **Accessibility**: toggle uses `aria-expanded` and `aria-controls`; the button remains smaller than the dashboard expandable-list toggle.
- **Motion**: simple chevron direction change and common active press feedback.

### Project Journey Management
- **Structure**: page heading, KPI strip, shared 8-step timeline/progress board, selected-stage editor, contractor preview, and sticky save bar.
- **Variants**: loading, no data/default generation, clean, unsaved, saving, saved, and error.
- **States**: completed, in progress, pending, selected, disabled.
- **Accessibility**: stages are real buttons, progress values have labels, range and number inputs expose the same value, and status is text plus color.
- **Scroll ownership**: the CRM page owns scrolling; timeline and editor cards stack at tablet/mobile widths; the sticky save bar never hides inputs.

### Journey Stage Editor
- **Structure**: translated stage context, synchronized range/number progress controls, quick progress buttons, and editable status/date fields.
- **States**: clean, dirty, saving, disabled, and validation-safe normalized progress from 0 to 100.
- **Accessibility**: every control has a visible label or accessible name; keyboard focus remains visible.

### Journey Preview
- **Structure**: overall progress meter and compact eight-stage list using the same global journey data as the editor.
- **Variants**: current stage, completed stages, in-progress stages, and pending stages.
- **Constraint**: preview is display-only and does not create contractor-specific journey data.

### Language Toggle
- **Structure**: small pill button in the phone status row, paired with the current role label.
- **Variants**: `KR` while English UI is active, `EN` while Korean UI is active.
- **Spacing**: compact --space-2 gap inside `.status-actions`.
- **States**: default, hover, active, focus.
- **Accessibility**: real button with a language-switch aria label.
- **Motion**: same subtle press feedback as other compact controls.

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

## 9. Admin CRM Surface

The Admin route is a separate desktop-first surface. It keeps the purchaser mobile canvas untouched and uses the supplied CRM dashboard reference as its visual contract: a fixed deep-navy sidebar, a light-gray workspace, compact white cards, blue primary actions, and restrained semantic status colors.

### CRM tokens

| Role | Token | Value | Usage |
|------|-------|-------|-------|
| CRM/sidebar | --crm-sidebar | #071B41 | Fixed navigation rail |
| CRM/sidebar-hover | --crm-sidebar-hover | #102E66 | Sidebar hover and secondary surface |
| CRM/sidebar-active | --crm-sidebar-active | #1D64D8 | Current route |
| CRM/workspace | --crm-workspace | #F6F7FB | Main background |
| CRM/card | --crm-card | #FFFFFF | Panels and KPI cards |
| CRM/text | --crm-text | #15233D | Headlines and values |
| CRM/muted | --crm-muted | #6B7890 | Supporting metadata |
| CRM/border | --crm-border | #E7EBF2 | Dividers and card borders |
| CRM/primary | --crm-primary | #2168D5 | Primary actions and links |
| CRM/success | --crm-success | #23A27A | Paid and assigned states |
| CRM/warning | --crm-warning | #F29A2E | Due-soon and reserved states |
| CRM/danger | --crm-danger | #D94C58 | Outstanding and error states |

### CRM layout

- `crm-shell` is a two-column desktop app shell with a 254px sidebar and a flexible workspace.
- `crm-main` owns the document scroll; cards never create an additional page-level scroll trap.
- At 1024px the sidebar remains a compact desktop rail; below 780px it becomes an overlay drawer opened by the menu button.
- The dashboard uses a 7-column KPI row, a 3-column information row, a 3-column lower row, and a five-action quick action strip.
- Cards use 12px radius, a 1px border, and a low-opacity shadow. Nested cards are avoided; existing management panels reuse the same card surface.

### CRM primitives

#### AdminShell
- **Structure**: `AdminSidebar`, `AdminTopbar`, `main.crm-main`.
- **States**: sidebar open/compact, route active, loading/error notice.
- **Accessibility**: landmark navigation, labeled search, visible focus rings.

#### KpiCard
- **Structure**: icon, label, value, supporting trend or helper copy.
- **Variants**: count, currency, percentage.
- **States**: default, loading, empty.

#### StatusBadge
- **Structure**: semantic text plus color token; never color-only.
- **Variants**: success, warning, danger, neutral, info.

#### EmptyState
- **Structure**: compact icon, message, optional route action.
- **States**: empty and error.

#### QuickActionCard
- **Structure**: icon, action label, short description, route link.
- **States**: default, hover, focus, pressed, disabled placeholder.

#### Unit Inventory
- **Structure**: page heading, KPI strip, filter cluster, inventory table, and summary/map aside.
- **Variants**: desktop list-detail, tablet stacked aside, mobile card rows with horizontal data fallback.
- **States**: available, assigned, reserved, hold, unknown, empty, loading, saving, selected.
- **Accessibility**: table rows and map cells expose the unit code and status text; filters use labeled native controls; edit/delete actions remain keyboard reachable.
- **Scroll ownership**: the CRM document remains the page scroll owner; only the dense table wrapper and map grid may scroll horizontally or within a bounded map region.

#### Unit Map
- **Structure**: grouped building/floor context with a responsive grid of unit-code buttons.
- **States**: available, assigned, reserved, hold, unknown, selected, empty.
- **Accessibility**: each cell is a real button with an accessible unit-code/status label; status is communicated by text as well as color.
- **Motion**: selection uses the existing 160ms CRM transition and respects reduced motion.

 #### Payment Management
- **Structure**: page heading, searchable customer selector, selected-customer summary, payment method card, plan settings, and an eight-step schedule table.
- **Variants**: no customer, no plan, empty schedule, populated schedule, unsaved changes, saving, and saved/error feedback.
- **States**: paid, partially paid, pending, no amount, ratio warning, selected customer, and disabled save.
- **Accessibility**: customer records are real buttons; every schedule input has a visible label; status is text plus semantic color; the save bar remains keyboard reachable.
- **Scroll ownership**: the CRM document owns page scrolling; only the dense payment table may scroll horizontally, and the save bar remains visible without covering mobile inputs.

#### Payment Summary
- **Structure**: customer identity, contract/required/paid/outstanding metrics, progress ring, and payment method metadata.
- **Variants**: cash, bank transfer with bank details, and not set.
- **States**: zero totals, partial progress, complete progress, and missing payment data.
- **Accessibility**: numeric values include readable labels and progress exposes an accessible percentage.

#### Document File Center
- **Structure**: page heading, document KPI strip, customer scope selector, search/filter controls, document table, and selected-file detail panel.
- **Variants**: all documents, customer-scoped documents, empty results, upload open, selected file, and loading/error feedback.
- **States**: uploaded, pending/review, active, selected, opening, deleting, and disabled upload action.
- **Accessibility**: document rows are real buttons; file actions use explicit labels; file type and status are communicated as text as well as icon/color; filters have native labels.
- **Scroll ownership**: the CRM document owns page scrolling; only the dense document table may scroll horizontally, while the detail panel remains readable on tablet and mobile.

#### File Detail Panel
- **Structure**: file-type preview block, metadata list, note, and Open/Download/Delete actions.
- **Variants**: selected PDF, office file, image, unknown type, and no selection.
- **States**: ready, opening, error, and deleting.
- **Accessibility**: selected file name is the panel heading; action buttons retain visible labels and focus rings; storage paths and signed URL tokens never render.

#### Document Upload Panel
- **Structure**: customer selector, title/category/note fields, file input, selected-file hint, and submit action.
- **Variants**: collapsed, open, selected customer, missing file, uploading, success, and error.
- **States**: disabled without customer/file, uploading, reset after success, and validation error.
- **Accessibility**: every field has a visible label; upload progress is communicated through button text and status messaging; the file input remains keyboard reachable.

#### Reports Analytics Workspace
- **Structure**: page heading with date/export controls, six-metric KPI strip, and read-only Sales, Units, Payments, Documents, and Journey report cards.
- **Variants**: all-time, date-filtered, zero-data, export feedback, and print view.
- **States**: positive, warning, danger, neutral, filtered, and empty; all values come from existing Supabase records.
- **Accessibility**: filters have visible labels; summary bars include text counts and percentages; export and print controls are real buttons; status is communicated through text as well as color.
- **Scroll ownership**: the CRM main owns page scrolling; report cards use `min-width: 0` and collapse from two columns to one on mobile; print hides navigation chrome.

#### Report Distribution Row
- **Structure**: semantic label, count, percentage, and a CSS progress bar for actual unit/document distributions.
- **States**: available, assigned, reserved, hold, empty, and filtered.
- **Constraint**: distribution rows never invent trend or monthly values when the source data does not contain them.

#### Report Journey Row
- **Structure**: ordered step number, translated title/description, progress meter, and text status badge.
- **States**: completed, in progress, pending, and empty.
- **Accessibility**: progress is written as a percentage and status text; the row remains readable when cards stack at tablet/mobile widths.

#### Unit Payment Export
- **Structure**: read-only export preview followed by a single HTML worksheet document containing export date, unit/payment summary rows, and one detail row per unit.
- **Data contract**: every unit is included, unassigned units remain visible, and payment steps 1-8 are flattened into five columns per step. Active buyer rows without a matching unit row remain available as separate unassigned records.
- **States**: zero units, missing payment plan/items, zero amounts, partial payments, completed payments, and language-specific headers.
- **Safety**: the `.xls` download uses UTF-8 HTML with escaped text and formula-injection protection. It contains only current Supabase-derived unit, buyer, and payment fields; keys, tokens, storage paths, and session data never enter the export.
- **Constraint**: no CSV fallback, mock rows, extra worksheets, schema changes, or new spreadsheet/chart dependency.

#### Admin Settings Workspace
- **Structure**: page heading followed by a two-column read-only settings layout. The left column owns Account & Access, App Preferences, and Portal Information; the right column owns Security & Environment, Data Management shortcuts, System Information, and the Danger Zone notice.
- **Variants**: active admin session, unavailable session/profile metadata, configured/unconfigured environment indicators, and English/Korean local preference.
- **States**: loading account metadata, safe boolean checklist, shortcut hover/focus, empty or unavailable values, and read-only notice. Settings has no fake save state and no destructive controls.
- **Access**: `/admin/settings` remains inside the existing admin-only protected route; contractor routes and screens do not reuse this surface.
- **Responsive contract**: desktop uses two equal columns; at 900px and below the columns stack; at 640px and below definition lists become single-column, language controls stretch, and shortcut cards stack.
- **Accessibility**: language choices are native buttons with selected state; management shortcuts are real links; checklist status is communicated with text and color; long emails, domains, and identifiers wrap within their card.

#### SettingsCard and SettingList
- **Structure**: `crm-settings__card` is a single white panel with a heading/icon row. Definition-list rows use `crm-settings__list` with label/value columns and divider borders.
- **Tokens**: Settings spacing, sizes, typography, border width, line height, radius, selected shadow, and semantic danger colors use `--crm-settings-*` tokens layered over the shared CRM palette.
- **States**: default, selected language, configured/safe status, unavailable metadata, shortcut hover/focus, and read-only danger notice.
- **Layout contract**: every card and list value has `min-width: 0` and `overflow-wrap: anywhere`; Korean headings use `word-break: keep-all` while long identifiers remain breakable; cards keep the CRM 1px border and compact radius without nested page-section cards.

#### Settings Security Checklist
- **Structure**: a compact list of environment and route checks with a check icon, human-readable label, and status badge.
- **Data boundary**: only configured booleans are rendered. Supabase URLs, anon keys, service-role keys, session tokens, and other environment values never appear in the DOM or logs.
- **States**: configured, not configured, safe/not exposed, and unavailable; the checklist never provides a secret-management or credential-editing control.

 ### CRM motion

- Sidebar links and cards use a 160ms color/transform transition.
- Buttons and links scale to 0.98 on press; no layout properties are animated.
- KPI progress bars use the existing 900ms meter easing and respect `prefers-reduced-motion`.
- Placeholder routes remain visibly disabled and do not navigate to broken screens.
