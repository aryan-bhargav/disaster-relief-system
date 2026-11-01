# ReliefOps — Emergency Operations Console
### Design specification for the Disaster Relief Resource Allocation and Coordination System

**Audience:** Google Antigravity (AI coding agent) modifying an existing Next.js project.
**Status of this document:** Design source of truth. It describes how the existing interface should look and behave. It is not an application, and it contains no application source code.

**Naming rule.** The repository and academic project keep their original name, *Disaster Relief Resource Allocation and Coordination System*. **ReliefOps** is only the product identity shown in the UI. Do not rename the repository, folders, or package names.

**Honesty rule.** This is a college minor project. The UI must never imply it is a government system, a certified emergency service, or a live national network. No fake live indicators, fake metrics, fake notifications, fake avatars, or fake activity anywhere.

---

## 1. Project overview and design goals

### 1.1 What the product does
The system connects four kinds of record in one place: **relief requests**, **resource inventory**, **relief centres**, and **allocations**. A coordinator should be able to answer, quickly and with confidence:

1. Which requests are waiting, and which are critical or high priority?
2. Which centres are active, and what stock do they hold?
3. Which requests already have allocations, and are those allocations partial or complete?
4. Where are requests and centres, and what does a road route between two locations look like?

### 1.2 Design goals
1. **Operational clarity over decoration.** Hierarchy comes from typography, alignment, spacing, borders, and restrained status colour.
2. **Speed for the coordinator.** The coordinator flow (queue → pick request → pick compatible stock → allocate) must take the fewest possible steps.
3. **One coherent system.** Every page uses the same shell, tokens, and components.
4. **Truthful data.** Every number, status, and marker comes from the backend or is explicitly labelled as demo data.
5. **Implementable in increments.** Each phase leaves the app building and working.

### 1.3 Concept: "Emergency Operations Console"
A **light operational workspace** with a **deep charcoal-navy command sidebar**. The sidebar signals "operations console"; the main area stays light so tables, forms, and the map are comfortable for long sessions. Teal is the single interaction accent. Red and amber are reserved for real severity.

---

## 2. User roles and workflows

Roles in the backend: `admin`, `coordinator`, `field_user`. The frontend may hide or disable controls by role for clarity, but **backend authorization is authoritative**. The UI must never present hiding a button as a security measure, and must display backend 401/403 errors clearly.

### 2.1 Coordinator (primary operational user)
Reviews incoming requests, spots urgent ones, checks compatible inventory, allocates resources, reviews allocation history, inspects centres, and uses the map and routing. Optimise for speed, clarity, confidence.

### 2.2 Admin
Everything a coordinator can do, plus the management actions the backend actually permits (for example managing centres and resources). **Do not invent admin features.** Antigravity must confirm each privileged action against the backend routes and middleware before showing a control for it.

### 2.3 Field user
Registers, signs in, creates relief requests, views **only their own** requests with current status, and cancels an eligible pending request if the backend supports it. The field-user experience is deliberately simpler: fewer navigation items, no allocation controls, no inventory management.

### 2.4 Role-aware navigation (decision)
| Nav item | Admin | Coordinator | Field user |
|---|---|---|---|
| Overview | Yes | Yes | Yes (limited to what the API returns for them) |
| Relief Requests | Yes | Yes | Yes (own requests) |
| Resource Inventory | Yes | Yes | Hide unless backend lets them read it |
| Relief Centres | Yes | Yes | Hide unless backend lets them read it |
| Allocations | Yes | Yes | Hide unless backend lets them read it |
| Operations Map | Yes | Yes | Hide unless backend lets them read it |

Antigravity must verify visibility against actual route permissions in Phase 1 and report discrepancies rather than guessing.

---

## 3. Design principles and anti-patterns

### 3.1 Principles
1. **Queue first.** Operational lists (requests, allocations) are tables with strong columns, not card grids.
2. **Priority is visible without shouting.** Critical stands out; the rest stay calm.
3. **Status is always text plus a visual cue.** Never colour alone.
4. **Quantities always carry units.** Never show a bare number for stock or need.
5. **Never sum unlike units.** Litres, boxes, and packets are never added into one "total stock" figure.
6. **Partial is not complete.** A request with part of its quantity supplied is shown as partially allocated, never as fulfilled.
7. **Every control works.** No decorative buttons, dropdowns, or filters.
8. **Empty, loading, error, and success states are designed, not afterthoughts.**
9. **Respect the existing API.** Gaps are reported as dependencies, not papered over with invented data.

### 3.2 Anti-patterns (must not appear)
- Purple-to-blue gradients, neon borders, glassmorphism, floating blobs, decorative background patterns.
- A rounded card around every row or statistic; 24–32px radii.
- Giant hero sections or marketing typography on internal pages.
- Emoji as icons.
- Fake "Live", "System online", "Last synced just now" labels.
- Fake charts, fake trend arrows, fake percentages, fake avatars, fake notification badges.
- Pill-shaped badges for every label (use pills only for status and priority).
- Unnecessary animation.

---

## 4. Visual identity and colour palette

### 4.1 Tokens (decision: use exactly these; refine only with documented reason)
Define as CSS variables on `:root` and map into the Tailwind theme (extend the config or use `@theme` depending on the installed Tailwind version, which Antigravity must check).

**Surfaces and text**
| Token | Value | Use |
|---|---|---|
| `--canvas` | `#F4F6F8` | App background |
| `--surface` | `#FFFFFF` | Panels, tables, forms |
| `--surface-muted` | `#EEF2F5` | Table headers, filter bars, inset areas |
| `--sidebar` | `#17232D` | Navigation shell |
| `--sidebar-hover` | `#243541` | Sidebar hover/active background |
| `--text` | `#17232D` | Primary text |
| `--text-muted` | `#5E6B75` | Secondary and helper text |
| `--border` | `#DCE3E8` | All borders and dividers |

**Accent and semantic**
| Token | Value | Background pair | Meaning |
|---|---|---|---|
| `--accent` | `#176B63` | hover `#11564F` | Primary actions, focus, active nav |
| `--danger` | `#B42318` | `#FEECEB` | Critical, destructive, errors |
| `--warning` | `#975A16` | `#FFF3D6` | Attention, pending, low stock |
| `--success` | `#216E4E` | `#E7F5EC` | Delivered, complete, success |
| `--info` | `#245C8A` | `#EAF2FA` | Allocated, dispatched, informational |

**Additional sidebar tokens (decision):** sidebar text `#C9D3DA`, sidebar muted text `#8A99A5`, sidebar divider `#2C3E4B`. White is used for the active item label.

### 4.2 Colour rules
- Teal is the only brand accent. No new accent colours per page.
- Red = critical or destructive. Amber = attention. Green = completed. Blue = in-progress/informational. Neutral grey = cancelled/inactive.
- Verify body text and badge text against WCAG AA (4.5:1). All badge text/background pairs above must be checked and adjusted darker if they fail.

### 4.3 Product mark
A small square mark (28px) in the sidebar: a simple geometric glyph (for example a rounded square with a cross or a location pin) drawn as inline SVG or an installed-icon-library icon in the accent colour on a slightly lighter sidebar tile. No gradient, no glow.

### 4.4 Iconography (decision)
Use **one** icon library. Antigravity checks `frontend/package.json` first. If `lucide-react` or similar is installed, use it. If none is installed, adding `lucide-react` is the single approved addition, and must be flagged in the Phase 1 audit for approval. Icons are 16–20px, stroke style, with accessible labels where icon-only.

---

## 5. Typography and spacing

### 5.1 Font
Use the font already configured in `layout.tsx` if it is Inter or a clean sans-serif. Otherwise use Inter via `next/font`, with fallback `system-ui, -apple-system, "Segoe UI", sans-serif`. Do not use more than one family.

### 5.2 Type scale
| Role | Size / line height | Weight |
|---|---|---|
| Page title | 24px / 32px | 600 |
| Section title | 16px / 24px | 600 |
| Body | 14px / 20px | 400 |
| Table cell | 14px / 20px | 400 |
| Table header | 12px / 16px | 600, sentence case, muted colour |
| Helper / secondary | 12–13px / 18px | 400, muted colour |
| Metric number | 28px / 32px | 600, tabular numerals |
| Button label | 14px / 20px | 500 |

- Apply `font-variant-numeric: tabular-nums` to quantities, counts, dates, coordinates, distances, and durations.
- Use sentence case everywhere. The only uppercase string is the sidebar descriptor `DISASTER RESPONSE` (11px, letter-spacing about 0.08em, muted sidebar colour).
- Coordinates display to 5 decimal places in monospace-tabular style.

### 5.3 Spacing, shape, elevation
- **Spacing rhythm:** 8px base (4px permitted for tight icon gaps). Common steps: 4, 8, 12, 16, 24, 32.
- **Radii:** 8px for inputs, buttons, badges-as-rectangles; 12px for panels and dialogs; full pill only for status/priority badges.
- **Borders:** 1px `--border` on panels, tables, inputs.
- **Shadows:** none on panels by default. A single subtle shadow (`0 1px 2px rgba(23,35,45,0.06)`) is allowed on panels. Dialogs and map popovers may use `0 8px 24px rgba(23,35,45,0.16)`.
- **Focus ring:** 2px `--accent` outline with 2px offset on every interactive element, always visible on keyboard focus. Never remove outlines without replacement.

### 5.4 Control sizing
| Element | Spec |
|---|---|
| Input / select height | 40px (44px on touch breakpoints) |
| Button height | Small 32px, Default 40px, Large 44px |
| Table row height | 48px comfortable default; header row 40px |
| Minimum touch target | 44 × 44px on mobile |
| Sidebar width | 240px expanded; 64px collapsed (tablet) |
| Content padding | 32px desktop, 24px tablet, 16px mobile |
| Max content width | 1440px, centred; the map page is full-bleed |
| Header block spacing | 24px below the page header before content |

### 5.5 Breakpoints
Mobile `< 640px`, tablet `640–1023px`, laptop `1024–1279px`, desktop `≥ 1280px`. Design and verify first at 1366×768 and 1440×900.

---

## 6. Application shell and navigation

### 6.1 One shared shell (decision)
Create a single reusable `AppShell` used by every authenticated route (dashboard, requests, resources, centres, allocations, map). It wraps `Sidebar` plus a content region. Implement it through a shared layout for the authenticated routes, for example a route group or a wrapper component, whichever Phase 1 shows is least disruptive. **Remove duplicated per-page sidebars and headers.** Do not rename or move route files unnecessarily.

Login and register are **outside** the shell.

### 6.2 Sidebar
Background `--sidebar`, full height, fixed on desktop.

**Top block (height 64px, bottom divider):** product mark, `ReliefOps` (16px, 600, white), and below it `DISASTER RESPONSE`.

**Navigation list (in order):**
1. Overview → `/dashboard`
2. Relief Requests → `/requests`
3. Resource Inventory → `/resources`
4. Relief Centres → `/centres`
5. Allocations → `/allocations`
6. Operations Map → `/map` (create route only if the map page does not exist; see 7.F)

Item spec: 40px height, 12px horizontal padding, icon (18px) + label (14px, 500), 8px radius. States:
- **Default:** sidebar text colour.
- **Hover:** `--sidebar-hover` background, white text.
- **Active:** `--sidebar-hover` background, white text, a 3px `--accent` strip on the left edge, `aria-current="page"`. No glow, no gradient.
- **Focus-visible:** 2px accent ring (lighter teal acceptable on dark for contrast).

**Bottom block (top divider):** the signed-in user's real name, the real role label (Admin, Coordinator, Field user), and a `Log out` button (tertiary on dark). If the user object is not available, show nothing rather than a placeholder name. Logout uses the existing auth logic.

### 6.3 Page header (shared `PageHeader`)
Layout: left column = title (24px), optional one-line description (14px muted); right column = primary action plus optional secondary action. Optional breadcrumb above the title **only** on detail or nested views, never on top-level pages. No welcome text, no clock, no status chips unless backed by real data.

### 6.4 Responsive shell
- **Desktop ≥ 1024px:** fixed 240px sidebar.
- **Tablet 640–1023px:** sidebar collapses to a 64px icon rail with tooltips and `aria-label`s; or, if simpler to implement reliably, uses the mobile drawer. Decision: use the **drawer** below 1024px to keep implementation small, and the full sidebar at 1024px and above.
- **Mobile:** a 56px top bar with menu button (`aria-label="Open navigation"`), the page title, and no clutter. Tapping the menu opens the sidebar as a left drawer with a scrim; Esc, scrim click, and selecting a link close it. Focus moves into the drawer on open and returns to the menu button on close.

---

## 7. Page-by-page layouts and component details

Common to all pages: states must be designed for **loading** (skeleton rows or a neutral skeleton block, no spinner-only pages), **empty**, **error** (with Retry), and **success** (inline notice or toast, see 8.8).

### A. Dashboard — "Operations overview" (`/dashboard`)
**Purpose:** Give a coordinator the current operational picture in one screen. **Primary task:** decide what to act on next.

**Layout, top to bottom:**
1. **Page header:** title `Operations overview`, description "Current requests, centres, and allocations." Primary action for coordinators/admins: `View request queue` (link) or none. No fake refresh stamp; a `Refresh` secondary button that re-fetches is acceptable.
2. **Attention strip (conditional):** rendered **only** when the data contains at least one critical request that is not yet fully allocated. Full-width band, `--danger-bg` background, 1px danger border, 8px radius, an alert icon, and text such as "3 critical requests need allocation" with a link `Review critical requests` that goes to `/requests` filtered to critical. If there are none, render nothing. Do not render an "all clear" decoration.
3. **Metric row:** four compact metrics in one bordered panel divided by vertical rules (not four separate big cards). Each: label (13px muted), number (28px tabular), optional small helper line. Metrics: **Open requests**, **Critical requests**, **Active relief centres**, **Pending allocations**. Only render a metric if the existing dashboard endpoint or other existing endpoints provide it. Otherwise render it as "Not available" and list it in the audit as an API gap. Do not compute misleading numbers client-side from partial lists.
4. **Main workspace (two columns at ≥ 1024px, 8/4 split):**
   - **Left, wide: "Request queue"** table, up to 8 rows, sorted by priority (critical first) then oldest. Columns: Priority, Request title, Category, Quantity (with unit), Status, Created. Row links to the request. Footer link `View all requests`.
   - **Right, narrow, stacked panels:** (a) **Priority summary:** counts per priority level (Critical, High, Medium, Low) as a compact list with small proportional bars (single hue per level, with text count). (b) **Allocation status summary:** counts per allocation/request status the backend actually has.
5. **Recent activity:** "Recent allocations" table of up to 5 rows (request, resource, quantity/unit, status, date) with a link to `/allocations`.

**Rules:** Never show "total resource quantity" across units. If inventory is summarised, show per-category-and-unit lines or only the count of low-stock items. No decorative charts. The proportional bars in the priority summary are data visualisations of real counts, not decoration.

**States:** Loading — metric placeholders and table skeletons. Empty (no data) — the queue panel shows an empty state "No relief requests yet" with a `New request` action if permitted. Error — per-panel error with Retry, so one failed call does not blank the page.
**Field user:** show only their own request counts if the API supports it; otherwise show a simple "Your requests" list using the requests endpoint.
**Mobile:** metrics become a 2×2 grid; columns stack; queue table becomes the stacked-row layout (see section 9).

### B. Relief Requests (`/requests`)
**Purpose:** The work queue. **Primary tasks:** triage (coordinator), create and track (field user).

**Header:** title `Relief requests`; description varies by role ("All incoming requests" vs "Requests you have submitted"). Primary action `New request` for roles allowed to create.

**Filter bar** (muted surface, 12px padding, single row on desktop): search input (searches only fields the API or loaded data can search, for example title), status select, priority select, category select, and a `Clear filters` tertiary button when any filter is active. Filters that the API cannot support server-side may filter the already-loaded list client-side; the label and result count ("Showing 12 of 48") must make that clear. Do not show a filter that does nothing.

**Table columns (decision):** Priority | Request (title, with description truncated to one line beneath in muted text) | Category | Quantity needed (number + unit) | Allocated / remaining (only if the API supplies it) | Status | Created | Requester (coordinator/admin only, only if returned) | Actions.
- Default sort: priority (critical → low), then created date ascending. Column header sorting only if implemented; otherwise a single sort select. Pagination only if the API paginates; do not invent pagination.
- Row click opens a **detail side panel** (right drawer, 420px) showing full description, location coordinates, requester (if permitted), allocations to this request, and actions. If a detail page already exists, link to it instead.
- Actions: `Allocate` (coordinator/admin, links to `/allocations` with the request preselected via query param only if the allocations page can read it; otherwise just navigates), `Cancel request` (only when the backend allows it and role/ownership and status permit it).

**Create request form** (modal dialog on desktop, full-screen sheet on mobile; or a dedicated panel on the page, whichever the existing code makes safer):
| Field | Spec |
|---|---|
| Title | Text, required, visible label |
| Description | Textarea, 3–4 rows |
| Category | Select using the exact backend category values |
| Quantity needed | Number, min greater than 0, tabular |
| Unit | Select/text following backend values |
| Priority | Select: Critical, High, Medium, Low (backend values mapped to labels) |
| Location | Latitude and longitude number inputs, with helper text: "Enter decimal degrees. Latitude −90 to 90, longitude −180 to 180." |

If map picking is added later, it supplements these inputs; manual entry always remains. Do not add map picking in the first pass (decision: out of scope for this redesign; list as optional enhancement).
Validation is inline per field on blur and on submit, with an error summary at the top on failed submit. Submit button shows loading and disables. Success: close the form, show a success toast "Request submitted", refresh the list, and highlight the new row for a few seconds without animation dependence.

**Priority badges (decision):**
| Priority | Treatment |
|---|---|
| Critical | `--danger-bg` fill, `--danger` text, solid 6px filled-circle icon prefix, label "Critical". Strongest treatment on the page. |
| High | `--warning-bg` fill, `--warning` text, label "High" |
| Medium | `--info-bg` fill, `--info` text, label "Medium" |
| Low | `--surface-muted` fill, `--text-muted` text, label "Low" |
Each includes an icon or shape difference in addition to colour (for example Critical uses an alert-triangle icon, High an up-chevron, Medium a dash, Low a down-chevron).

**States:** first-use empty ("No relief requests yet"; field user sees "You haven't submitted any requests" with `New request`), no-results ("No requests match your filters" with `Clear filters`), loading skeleton rows, error panel with Retry, success toast. Cancel uses a confirmation dialog (see 8.7).

### C. Resource Inventory (`/resources`)
**Purpose:** See what is available where, and what is short. **Primary user:** coordinator/admin.

**Header:** `Resource inventory`; primary action `Add resource` where permitted.

**Summary strip (compact, one bordered panel):** only meaningful figures the data supports: number of resource records, number of low-stock records, number of centres holding stock. No grand total quantity.
**Low-stock rule:** inspect how the backend defines low stock (a threshold field or a convention). If none exists, **do not show low-stock indicators**, and list "low-stock definition" as a dependency. Never invent a threshold in the frontend.

**Filter bar:** search by resource name, centre select, category select, low-stock toggle (only if defined).

**Table columns:** Resource | Category | Centre (with inactive marker if the centre is inactive) | Available quantity (right-aligned, tabular) | Unit | Status | Actions.
- Status shows "Low stock" (amber, with icon and text) or "In stock" (neutral text, no badge to keep the table calm) when low stock is defined.
- Actions: `Edit` (if supported), `Delete` or `Deactivate` (if supported).

**Form (add/edit):** Name, Category, Unit, Quantity (min 0, no negatives, no decimals unless the unit model allows), Centre (select of **active** centres). Edit mode reuses the same form.
**Destructive rule:** Before delete, the confirmation dialog states the consequence. If the backend blocks deletion of resources referenced by allocations, show the backend message verbatim in the dialog's error area. Never assume deletion is safe; prefer deactivation if the backend supports it.

**States:** empty inventory ("No resources recorded yet" + `Add resource`), no-results, loading, error, success toast after add/edit/delete.

### D. Relief Centres (`/centres`)
**Purpose:** Manage and inspect facilities. 

**Header:** `Relief centres`; primary action `Add centre` where permitted.

**Layout:** a table (decision, not cards). Columns: Centre name | Address | Contact | Status (Active / Inactive) | Actions. Coordinates are **not** in the row; they appear in the detail side panel (420px) opened on row click, together with: address, contact, status, coordinates (lat/lng, tabular), a link `View on map` (to the map page with the centre selected, only if the map supports it), and the resources held there (if the API exposes them or via the inventory list filtered by centre).

**Inactive centres:** row text muted, an "Inactive" badge (neutral with an icon and text), and a default filter of "Active" with a status select to show all. Never mix inactive centres into resource-entry selects or allocation selects.

**Form fields:** Centre name (required), Address (required), Contact number (optional, helper "Optional"), Latitude (−90 to 90), Longitude (−180 to 180). Validation messages state the allowed range.
**Actions:** `Edit`; `Deactivate` / `Reactivate` with a confirmation dialog if supported by the backend (decision: do not show hard delete unless the backend provides it and protects allocation history).

**States:** empty ("No relief centres yet"), no-results, loading, error, success toast. Mobile: stacked rows.

### E. Allocations (`/allocations`)
**Purpose:** The most important workflow: turn an eligible request into a valid allocation. **Primary user:** coordinator/admin. If field users cannot access this, they see the backend's denial or are redirected, per existing behaviour.

**Layout at ≥ 1024px:**
1. **Header:** `Allocations`; description "Assign available stock to open requests."
2. **Two-column work area (7/5 split):**
   - **Left: "Create allocation" panel** (a form, titled, with numbered field groups).
   - **Right: "Context" panel**, which updates as selections change: selected request summary, remaining quantity, and the compatible resources list with centre and available stock.
3. **Allocation history** table full width below.

**Form flow (decision):**
1. **Request** (select/searchable list): each option shows title, priority badge, category, and remaining quantity with unit. Only requests eligible for allocation (backend-defined, for example pending or partially allocated) are selectable. Default order: priority then oldest.
2. **Resource** (select): enabled after a request is chosen. Lists **only compatible** resources (matching category and unit, with stock greater than 0, at active centres). Each option shows resource name, centre, and available stock with unit. If none are compatible, show an inline message "No compatible stock available for this request" and disable the submit button. Never list incompatible options, not even greyed out.
3. **Quantity to allocate** (number): min 1; max = the lesser of remaining need and available stock. Helper text under the field: "Remaining need: 40 litres · Available: 25 litres". Errors: exceeding stock, exceeding remaining need (if the backend forbids over-allocation), non-integer, empty.
4. **Confirmation summary** (inline panel above the submit button, appears when the form is valid): "Allocate 25 litres of Drinking water from Central Relief Centre to 'Flood shelter water'. Remaining need after allocation: 15 litres." Primary button `Allocate resources`.

**After submit:** success toast with the outcome; if the request is only partly supplied, the message states "Partially allocated" and the request remains selectable. Refresh history, request options, and stock. Backend error text is displayed in an error notice above the form.

**Partial allocation rule:** A request is shown as "Allocated" or "Fulfilled" only if the backend indicates the full quantity has been supplied. Otherwise show "Partially allocated" with allocated/required numbers (only if the API returns what is needed to compute it; if it does not, report as a dependency and show only what is known).

**History table columns:** Request | Resource | Centre | Quantity (with unit) | Status | Date. Workflow actions (dispatch, mark delivered, cancel) appear in an Actions column **only** for transitions the backend supports and the user's role permits, each with confirmation. Status badges: pending = amber, allocated = info blue, dispatched = info blue with a truck/arrow icon, delivered = green with a check, cancelled = neutral. Use the exact backend enum values; do not invent statuses.

**States:** loading, no eligible requests ("All requests have been fully allocated or none are open"), no history, error, success.
**Mobile:** panels stack in order: form, context, history (as stacked rows).

### F. Operations Map (`/map`)
**Purpose:** A genuine spatial workspace. **Primary user:** coordinator/admin. If no map route exists, create `frontend/src/app/map/page.tsx` and ensure the sidebar link resolves.

**Layout (decision):** Full-bleed workspace beside the sidebar. A map canvas fills the remaining width and the viewport height minus the shell. A **left tool panel** (360px, white, scrollable, docked over/next to the map, 1px border) holds controls; the map occupies the rest. On mobile, the tool panel becomes a bottom sheet with a handle (collapsed height 72px, expandable to 70% of the screen).

**Tool panel sections (top to bottom):**
1. **Layers & filters:** toggles for Relief centres and Relief requests; request filters for priority and status; "Show inactive centres" off by default.
2. **Legend** (compact): marker key (see below).
3. **Selected location:** appears on marker click. Shows name/title, type, address or category, priority and status (badges), quantity/unit for requests, coordinates, and actions: `Set as origin`, `Set as destination`, `Open record` (link to the relevant page).
4. **Route:** Origin and Destination fields (readonly displays filled from selections, each with a clear button; may also be chosen from a select of centres/requests with valid coordinates), a `Calculate route` button (disabled until both are set), and a results block: **Distance** and **Duration** (only the values returned by OSRM, formatted `12.4 km`, `18 min`), plus a `Clear route` button.

**Marker design (shape + colour, never colour only):**
| Type | Marker |
|---|---|
| Relief centre | Teal square marker with a white building/cross glyph |
| Request (standard: medium/low) | Info-blue circular marker, small, with a white dot |
| Request (high) | Amber circular marker with a "!" glyph |
| Request (critical) | Red circular marker, slightly larger, with an alert glyph and white outline |
| Inactive centre | Grey square, hollow, hidden by default |
| Selected | Darker ring (2px) and raised z-index |
Use inline-SVG `L.divIcon` markers (avoids the default marker-image path issues in bundlers). Marker size 28–32px; touch area at least 40px.
**Route line:** 4px `--accent` line with a white 2px casing for contrast on tiles. Fit bounds to the route after calculation. Origin and destination use labelled "A" and "B" markers.

**Popups/selection:** Clicking a marker selects it and fills the tool panel; a Leaflet popup may show the title and one key line, but the detailed information lives in the panel (keeps the map clean and accessible).

**Data rules:** Markers come only from real records with valid numeric coordinates. Records with missing/invalid coordinates are excluded from the map and counted in a note in the panel: "2 requests have no valid coordinates and are not shown." No demo markers. If any demo data is ever used, it must be explicitly labelled "Demo data".

**Routing rules:** Call OSRM only on user action (button), never on every selection change. Validate both coordinates first. Handle: loading (button spinner, "Calculating route…"), no route found, network or service failure ("Route service is unavailable. Try again."), and timeouts. Remember OSRM order is longitude,latitude. The public OSRM demo server is for light use; add a note in the implementation (not necessarily the UI) to make the base URL configurable via an environment variable and to avoid automatic or repeated calls. **Do not describe OSRM as Dijkstra** anywhere in the UI or documentation.

**Tiles and attribution:** OpenStreetMap standard tiles with the attribution "© OpenStreetMap contributors" visible in the map's attribution control. Respect the OSM tile usage policy: no bulk prefetching, a sensible zoom limit, and no stripped attribution.

**Next.js integration:** Leaflet touches `window`. Load the map component with `next/dynamic` and `ssr: false` from a client component; import Leaflet CSS once; ensure the map container has an explicit height; guard against double-initialisation in React strict mode; clean up on unmount. Verify there are no hydration or SSR errors.

**Accessibility:** The map is supplementary for keyboard users: all records are also reachable via the tool panel, with a "List view" toggle presenting the same locations as a table, and every action available from the panel has a visible focus state.

**States:** loading (map skeleton), no records ("No locations with coordinates to show"), error loading data (panel error with Retry).

### G. Login (`/login`)
Centred single-column form, not inside the shell, on the `--canvas` background. A 400px-wide panel with 1px border and 12px radius; no hero, no gradient. Contents: the product mark, `ReliefOps`, the heading `Sign in`, a one-line subtext "Disaster relief coordination", fields **Email** and **Password** with visible labels (password with a show/hide toggle, `aria-label` and `aria-pressed`), a primary full-width `Sign in` button, and a link "Create an account" if registration is available. Footer line (small, muted): "College project — not an official emergency service."
**Validation:** Email format and required password, inline. **Loading:** button shows a spinner and "Signing in…". **Errors:** a top-of-form error notice (`role="alert"`) with the backend's message when safe, otherwise "Incorrect email or password" or "Unable to reach the server. Try again." Do not reveal whether an email exists.

### H. Registration (`/register`)
Identical shell to login. Fields: only those the registration API accepts (inspect it; typically name, email, password). **No role selector.** Public registration must never allow choosing admin or coordinator, and the form must not send a role from the client unless the backend explicitly requires a fixed safe default; if the existing code sends a role, flag it in the audit and report it as a security issue, do not silently expand it. Password helper text states the real rule enforced by the backend (do not invent rules). Confirm-password field only if the existing form has it. Success: redirect to login with a success notice, or sign in, per existing behaviour. Link back to login.

### I. Root route (`/`)
Inspect `frontend/src/app/page.tsx`. **Decision:** the root route must not be a marketing landing page. If the existing behaviour is a redirect, keep it: authenticated users go to `/dashboard`, unauthenticated users go to `/login`. If the current page renders marketing content, replace it with that redirect logic using the app's existing auth-check mechanism. Show a minimal neutral loading state during the check; avoid a flash of protected content. Do not change how authentication or sessions are handled.

---

## 8. Component states and interactions

Define once; reuse everywhere. Keep the set small.

### 8.1 Buttons
| Variant | Default | Hover | Disabled |
|---|---|---|---|
| Primary | `--accent` fill, white text | `#11564F` | 45% opacity, no pointer |
| Secondary | white fill, 1px `--border`, `--text` text | `--surface-muted` fill | 45% opacity |
| Tertiary | no fill, accent text | `--surface-muted` fill | 45% opacity |
| Destructive | `--danger` fill, white text | darker red `#912018` | 45% opacity |
Focus: 2px accent ring with offset. **Loading:** inline spinner replaces or precedes the label, the button is disabled and keeps its width, `aria-busy="true"`, and the label changes to a present-progressive ("Saving…"). Icon-only buttons require an `aria-label` and a tooltip.

### 8.2 Inputs, selects, textareas
40px height, 12px horizontal padding, 8px radius, 1px `--border`, white fill. Label above (14px, 500), helper text below (13px muted). **Hover:** border darkens slightly. **Focus:** border `--accent` plus 2px ring. **Disabled:** `--surface-muted` fill, muted text. **Error:** border `--danger`, error icon, error text below (13px, `--danger`) linked by `aria-describedby`, `aria-invalid="true"`. Required fields marked with text "(required)" or an asterisk with a legend; optional fields marked "Optional". Native `select` elements are preferred (reliable, accessible) unless a searchable list is truly needed.

### 8.3 Status badges
Rounded rectangle (6px radius) or pill, 24px height, 12px/500 text, icon (14px) plus label. Colours follow section 4. Mapping (apply to real enum values after inspection):
| Meaning | Colours |
|---|---|
| Pending | Warning |
| Allocated / in progress | Info |
| Dispatched | Info (distinct icon) |
| Delivered / completed | Success |
| Cancelled / inactive | Muted neutral |
| Active (centre) | Success text, no heavy fill |

### 8.4 Tables
White surface, 1px border, 12px outer radius, no inner row cards. Header: `--surface-muted`, 12px/600 muted text, 40px. Rows: 48px, bottom border 1px `--border`, hover `--surface-muted`. Numeric columns right-aligned with tabular numerals. Primary column (title/name) is 500 weight. Sticky header inside scroll containers. Truncate long text with ellipsis and provide the full text via `title` or in the detail panel. Row actions are right-aligned; a row-level action menu only if there are more than two actions. Interactive rows must be keyboard-focusable and activatable with Enter.

### 8.5 Filter bars
Muted surface, 12px padding, 8px gaps, wraps on smaller screens. A visible result count. `Clear filters` appears only when filters are active. Filters apply immediately on change (search is debounced by about 300ms), and the active state is reflected in the controls.

### 8.6 Empty, loading, error, success components
- **EmptyState:** centred inside the panel, 40px muted icon, a 16px/600 heading, a 14px muted line, and at most one action. No illustrations.
- **LoadingState:** skeleton rows matching the final layout, in `--surface-muted`; a subtle pulse is allowed only if `prefers-reduced-motion` is not set.
- **ErrorState:** danger-tinted notice with an icon, plain-language message, the backend message if safe, and a `Retry` button.
- **Success feedback:** a toast at the top right (bottom on mobile), auto-dismiss after 5 seconds, with a close button, `role="status"`. No success toast for passive loads.

### 8.7 Confirmation dialogs
Used for cancel request, deactivate/delete centre, delete resource, and any allocation status transition. Modal, 440px wide, 12px radius, scrim `rgba(23,35,45,0.5)`. Contents: title (the action in plain words), one-sentence consequence, optional detail, and two buttons: `Cancel`/`Keep` (secondary) and the action (destructive or primary), with the destructive button **not** autofocused (focus the safe option). Esc closes. Focus is trapped and returned to the trigger on close. The submit shows loading, and backend errors appear in the dialog.

### 8.8 Interaction behaviour summary
| Interaction | Behaviour |
|---|---|
| Navigation | Client-side links; active item reflects the route |
| Search | Debounced, filters list, shows result count |
| Filters | Immediate, combinable, clearable |
| Sorting | Only if implemented; sort state visible in the header with `aria-sort` |
| Pagination | Only if the API paginates; otherwise none |
| Forms | Inline validation on blur and submit, error summary on failure, preserved input on server error |
| Refresh | Re-fetches data, keeps filters, shows a loading state in place |
| Mobile sidebar | Drawer as described in 6.4 |
| Map selection | Marker click selects; panel updates; Esc clears selection |
| Route | Explicit button; clear button resets |
Animations: 150ms ease for hover/focus and drawer slide; no decorative or looping motion; respect `prefers-reduced-motion` by disabling transitions beyond opacity.

---

## 9. Responsive design

| Breakpoint | Shell | Content |
|---|---|---|
| ≥ 1280px | 240px fixed sidebar | Full layouts as specified, 32px padding |
| 1024–1279px | 240px fixed sidebar | Same layouts, two-column splits retained, 24px padding |
| 640–1023px | Drawer navigation with top bar | Two-column areas stack; filter bars wrap; tables scroll horizontally or use stacked rows |
| < 640px | Drawer navigation with top bar | Single column; 16px padding; 44px touch targets |

**Table strategy (decision):** Below 768px, data tables with five or more columns present as **stacked rows**: each record shows the title and priority/status on the first line, the key quantity and category beneath, and actions at the end, with other fields in a collapsible "Details" area. Tables with four or fewer columns may scroll horizontally inside an `overflow-x-auto` container with a sticky first column. The page itself must never scroll horizontally.

Forms are single-column on mobile. Dialogs become full-height sheets on mobile. The map page's tool panel becomes a bottom sheet. Verify at 360px, 768px, 1366px, and 1440px widths.

---

## 10. Accessibility

Target WCAG 2.1 AA where practical.
1. **Contrast:** 4.5:1 for text, 3:1 for UI components and focus rings; verify every badge and the sidebar text tokens, and adjust colours darker if needed.
2. **Keyboard:** Everything is reachable and operable by keyboard; logical tab order; a "Skip to main content" link at the top of the shell; drawers and dialogs trap and restore focus; Esc closes overlays.
3. **Focus:** A visible 2px focus ring on every interactive element.
4. **Forms:** Every input has a programmatically associated visible label; errors are linked via `aria-describedby`, announced with `role="alert"` for form-level errors; required state is conveyed in text.
5. **Non-colour communication:** Priority and status always include text, and distinct icons or shapes. Map markers differ in shape and glyph, not only colour.
6. **Icons:** Decorative icons are `aria-hidden`; icon-only buttons have `aria-label`.
7. **Landmarks:** `header`, `nav` (with `aria-label="Primary"`), `main`, one `h1` per page, ordered headings.
8. **Tables:** Real `table` markup with `th scope`, a caption or `aria-label`, and `aria-sort` where sorting exists.
9. **Live regions:** Toasts use `role="status"`; blocking errors use `role="alert"`.
10. **Touch:** Targets at least 44px on mobile.
11. **Motion:** Respect `prefers-reduced-motion`.
12. **Map:** Provide the list-view alternative described in 7.F.

---

## 11. Technical implementation constraints

1. Keep **Next.js App Router, React, TypeScript, Tailwind CSS**. Keep the Express/TypeScript/MongoDB/Mongoose backend, JWT authentication, and the existing roles.
2. **Inspect before adding.** Read `frontend/package.json` and installed versions first. No UI component library, no animation library, no state-management library. The only pre-approved potential addition is one icon library (see 4.4), and only if none is installed. Do not upgrade existing package versions.
3. **Tailwind version:** Check whether the project uses Tailwind v3 (`tailwind.config`) or v4 (CSS-first `@theme`) and wire tokens accordingly.
4. **Do not rename or move files unnecessarily.** New shared components go in `frontend/src/components/` (for example `AppShell`, `Sidebar`, `PageHeader`, `Button`, `StatusBadge`, `PriorityBadge`, `FormField`, `EmptyState`, `LoadingState`, `ErrorState`, `ConfirmDialog`, `Toast`). Add a `DataTable` only if it removes real duplication.
5. **Preserve** data fetching in `frontend/src/lib/api.ts`, auth types in `frontend/src/types/auth.ts`, and all existing business logic. Keep UI separate from business logic.
6. **No invented endpoints, fields, enum values, or business rules.** Where a design element needs data the API does not provide, show the reduced version and record it as an "API dependency" in the audit report. Candidates to check: remaining/allocated quantity per request, low-stock definition, centre-level inventory, request status transitions, pagination, server-side filtering, dashboard metrics.
7. **Security:** Never print, commit, or expose `.env*` files, JWT secrets, tokens, or credentials. Do not change authentication or session handling. Do not hardcode real user data. Registration must not offer privileged roles.
8. **Leaflet** loads client-side only (`next/dynamic`, `ssr: false`), with CSS imported once. OSRM base URL should come from configuration, with a graceful failure when unreachable.
9. **Do not delete functionality** to achieve a visual effect. Do not make broad unrelated refactors.
10. **No source control side effects:** do not commit, push, merge, or alter branches. Report `git status` only.
11. **Honest labelling:** any demo data is labelled "Demo data".

---

## 12. Implementation phases

Antigravity works strictly incrementally and **stops for approval after Phase 1**.

### Phase 1 — Audit only (no file modifications)
Inspect: the frontend structure; `globals.css`, `layout.tsx`, the Tailwind config; every page under `frontend/src/app/`; `frontend/src/components/`; `frontend/src/lib/api.ts`; `frontend/src/types/auth.ts`; `package.json` dependencies; the existing navigation and any duplicated sidebars/headers; the backend routes, models, enums, and role middleware that determine what the UI may show; Git branch and status.
Return an **audit report** containing: (a) current-state summary versus this spec; (b) the exact list of files to create or change per phase; (c) every API gap or dependency (see 11.6); (d) every place the existing UI shows something this spec forbids (fake data, fake live labels, role selection at registration, emoji icons); (e) any security concern; (f) whether a map page exists; (g) any new dependency proposed, with justification.
**Do not edit anything. Wait for explicit approval.**

### Phase 2 — Tokens and shell
Add tokens, global typography, focus styles; build `AppShell`, `Sidebar`, `PageHeader`, and the shared primitives (buttons, form fields, badges, empty/loading/error states, toast, confirm dialog). Apply the shell to authenticated routes. Run the frontend build and fix errors. Report changed files.

### Phase 3 — Pages, one at a time, in this order
1. Dashboard 2. Requests 3. Resources 4. Centres 5. Allocations 6. Map 7. Login and register (and the root redirect check).
For each page: preserve existing data flow and logic; implement the layout, states, and role-aware behaviour from section 7; then verify before starting the next page.

### Phase 4 — Verification (after each page and at the end)
Run `npm run build` in `frontend/`; fix TypeScript, lint, hydration, and runtime errors. Manually check: navigation, forms and validation, filters and search, actions and confirmations, loading/empty/error/success states, responsive widths (360, 768, 1366, 1440), keyboard navigation and focus, and API integration against the running backend. Report exactly what changed and what was actually tested. **Never claim a test passed that was not run**; list untested behaviours explicitly. Do not push or merge.

---

## 13. Acceptance criteria

The redesign is accepted only when **all** of the following hold:

**Design system**
- [ ] One shared shell and one token set are used by every authenticated page; no page has its own sidebar or header.
- [ ] Colours come only from the defined tokens; teal is the only accent.
- [ ] No gradients, glass effects, glows, emoji icons, decorative blobs, or oversized radii.
- [ ] One icon library is used consistently.

**Truthfulness**
- [ ] No fake live/online/sync indicators, fake metrics, fake charts, fake notifications, avatars, or activity.
- [ ] No sum of unlike units; every quantity shows a unit.
- [ ] Any metric the API cannot supply is shown as unavailable and listed as a dependency, not invented.
- [ ] Partially allocated requests are never shown as fulfilled.

**Functionality**
- [ ] Every button, link, filter, search field, and form control works.
- [ ] Existing API contracts, authentication, and business logic are unchanged.
- [ ] Allocation form only offers compatible resources and enforces stock/need limits with clear errors.
- [ ] Destructive actions use confirmation dialogs and respect backend safeguards.
- [ ] Public registration offers no privileged roles.
- [ ] The root route redirects correctly (dashboard if authenticated, login if not).
- [ ] The map renders without SSR/hydration errors, shows only real coordinates, attributes OpenStreetMap, calculates routes on demand through OSRM, shows distance/duration only when returned, and handles all failure cases.
- [ ] No UI text claims OSRM implements Dijkstra.

**Quality**
- [ ] Loading, empty, error, and success states exist for every data page.
- [ ] Layouts work at 360, 768, 1366, and 1440px with no page-level horizontal scroll.
- [ ] Keyboard-only use is possible throughout, focus is always visible, and dialogs/drawers manage focus.
- [ ] Text and UI contrast meet WCAG AA; status and priority never rely on colour alone.
- [ ] `npm run build` passes in `frontend/`.
- [ ] The final report lists changed files, tests run, and untested behaviours, and no commit, push, or merge occurred.

---

**Begin with Phase 1 (audit only). Do not modify any file until the audit has been reviewed and approved.**