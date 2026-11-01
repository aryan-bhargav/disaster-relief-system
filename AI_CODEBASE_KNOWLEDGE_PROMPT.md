
# MASTER AI CONTEXT PROMPT: DISASTER RELIEF RESOURCE ALLOCATION SYSTEM (RELIEFOPS)

> **How to use this file:**  
> Copy and paste the entire content of this markdown document into any AI assistant (ChatGPT, Claude, Gemini, Cursor, Antigravity, Copilot, DeepSeek, etc.) at the start of a conversation. It equips the AI with complete 360-degree knowledge of this entire codebase—its architecture, file tree, functions, data models, REST API endpoints, business logic, workflows, UI design system, test credentials, and strict coding rules—without requiring the AI to inspect or load all individual files.

---

```markdown
<CODEBASE_CONTEXT_BRIEFING>
You are an expert full-stack engineer and coding pair programmer working on the existing college minor project:
"Disaster Relief Resource Allocation and Coordination System" (branded as "ReliefOps — Emergency Operations Console").

This document serves as your complete single source of truth for the entire repository. Read and adhere to all specifications, data contracts, and architectural rules outlined below.
</CODEBASE_CONTEXT_BRIEFING>

---

# 1. PROJECT OVERVIEW & TECH STACK

- **Project Name:** Disaster Relief Resource Allocation and Coordination System (ReliefOps)
- **Nature:** College minor project focused on real-time disaster relief logistics, connecting field requests with storage centres, and computing actual road transit routes.
- **Frontend Stack:**
  - Next.js 16.4.2 (App Router, Client Components with `"use client"`)
  - React 19, TypeScript
  - Tailwind CSS v4 (`@tailwindcss/postcss`, `@theme inline` in `src/app/globals.css`)
  - Icons: `lucide-react` (v1.61.0)
  - Mapping: Leaflet 1.9.4 + OpenStreetMap tiles (`next/dynamic` client-only rendering)
  - Routing: Real road routing via OSRM (Open Source Routing Machine public demo API)
- **Backend Stack:**
  - Node.js (v20+ / v22), Express 5.3.0
  - TypeScript (with `tsx` execution and `tsc` build)
  - Database: Local MongoDB (port `27017`, db `disaster_relief`) via Mongoose 9.11.2
  - Authentication: JWT (`jsonwebtoken`) + `bcryptjs`
  - Middleware: CORS (`http://localhost:3000`), JSON body parsing, Bearer Token Auth & RBAC
- **Directory Root:**
  - `backend/`: Express API server, Mongoose models, controllers, routes, seed scripts
  - `frontend/`: Next.js App Router application, design components, API client

---

# 2. COMPLETE FILE TREE & MODULE RESPONSIBILITIES

```
disaster-relief-system/
├── backend/
│   ├── src/
│   │   ├── app.ts                         # Express application setup, CORS, route mounting, /api/health
│   │   ├── server.ts                      # Server bootstrap (connectDB + app.listen on PORT 5000)
│   │   ├── config/
│   │   │   └── db.ts                      # Mongoose connection to process.env.MONGODB_URI
│   │   ├── middleware/
│   │   │   └── authenticate.ts            # JWT verification (`authenticate`) and role checking (`authorize(...)`)
│   │   ├── models/
│   │   │   ├── User.ts                    # User schema (name, email, password [select: false], role, isActive)
│   │   │   ├── ReliefCentre.ts            # Centre schema (name, address, location {lat, lng}, contactNumber, isActive)
│   │   │   ├── Resource.ts                # Resource schema (name, category, unit, quantity, centre ref)
│   │   │   ├── ReliefRequest.ts           # Request schema (title, description, category, quantityNeeded, quantityFulfilled, unit, priority, status, location, requestedBy, assignedCentre)
│   │   │   └── Allocation.ts              # Allocation schema (request ref, resource ref, centre ref, quantity, status, allocatedBy)
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts         # register, login, getMe
│   │   │   ├── centre.controller.ts       # getCentres, getCentreById, createCentre, updateCentre, deleteCentre (soft)
│   │   │   ├── resource.controller.ts     # getResources, getResourceById, createResource, updateResource, deleteResource (with 409 integrity check)
│   │   │   ├── request.controller.ts      # createRequest, getRequests, getRequestById, updateRequestStatus, cancelOwnRequest
│   │   │   ├── allocation.controller.ts   # allocateResource, getAllocations, updateAllocationStatusHandler
│   │   │   └── dashboard.controller.ts    # getDashboardStats (aggregated metrics, role-scoped for field_user)
│   │   ├── routes/
│   │   │   ├── auth.routes.ts             # POST /register, POST /login, GET /me
│   │   │   ├── centre.routes.ts           # GET /, GET /:id, POST /, PATCH /:id, DELETE /:id
│   │   │   ├── resource.routes.ts         # GET /, GET /:id, POST /, PATCH /:id, DELETE /:id
│   │   │   ├── request.routes.ts          # POST /, GET /, GET /:id, PATCH /:id/status, PATCH /:id/cancel
│   │   │   ├── allocation.routes.ts       # GET /, POST /, PATCH /:id/status
│   │   │   └── dashboard.routes.ts        # GET /stats
│   │   ├── services/
│   │   │   └── allocation.service.ts      # Atomic allocation logic, two-phase stock deduction/rollback, lifecycle state machine
│   │   └── scripts/
│   │       ├── seed-admin.ts              # CLI script to provision/update admin or coordinator
│   │       ├── seed-sample-data.ts        # Seeds realistic Delhi NCR centres, resources, requests, and allocations
│   │       └── verify-workflows.ts        # Automated integration test suite running 8 end-to-end workflows
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css                # Tailwind CSS v4 @theme inline tokens (--canvas, --surface, --accent, etc.)
│   │   │   ├── layout.tsx                 # Root layout with Geist font, metadata, light operational workspace
│   │   │   ├── page.tsx                   # Root route ('/'): Instant session-checking redirect (/dashboard or /login)
│   │   │   ├── login/page.tsx             # Sign in form: 400px light card, password reveal toggle, disclaimer
│   │   │   ├── register/page.tsx          # Public registration (strictly fixed to field_user; no role selection)
│   │   │   ├── dashboard/page.tsx         # Operations overview: 4 metrics, critical backlog strip, request queue, summaries
│   │   │   ├── requests/page.tsx          # Request management: debounced search, filters, table, 420px detail drawer, modal create form
│   │   │   ├── resources/page.tsx         # Inventory tracking: summary strip, facility filter, Add/Edit modal, delete 409 guard
│   │   │   ├── centres/page.tsx           # Facilities table: 420px drawer with 5-decimal coordinates & stock, Add/Edit modal, soft-delete toggle
│   │   │   ├── allocations/page.tsx       # 7/5 split: 4-step creation form + reactive context panel; allocation history + lifecycle transitions
│   │   │   └── map/
│   │   │       ├── page.tsx               # Full-bleed workspace, 360px docked tool panel, layer toggles, OSRM route calculator, list view table
│   │   │       └── ReliefMap.tsx          # Client-side Leaflet component with custom SVG markers and dual-layer road polylines
│   │   ├── components/
│   │   │   ├── index.ts                   # Barrel export
│   │   │   ├── AppShell.tsx               # Persistent shell wrapping authenticated routes, mobile drawer, skip link
│   │   │   ├── Sidebar.tsx                # Deep charcoal (#17232D) sidebar, 6 nav links, teal active strip, user badge, logout
│   │   │   ├── PageHeader.tsx             # Standard header with breadcrumbs, title, description, and primary/secondary actions
│   │   │   ├── Button.tsx                 # Button primitive (primary, secondary, tertiary, destructive; sm, md, lg; loading state)
│   │   │   ├── FormField.tsx              # Input wrapper with label, required asterisk, helper text, and accessible error message
│   │   │   ├── StatusBadge.tsx            # Pill badges for pending, allocated, partially_allocated, dispatched, delivered, cancelled, active, inactive
│   │   │   ├── PriorityBadge.tsx          # Dual shape + color badges: critical (alert-triangle), high (chevron-up), medium (dash), low (chevron-down)
│   │   │   ├── ConfirmDialog.tsx          # Accessible modal dialog for destructive or state-changing confirmations with ESC and focus trap
│   │   │   ├── Toast.tsx                  # Auto-dismissing success/error/info notifications
│   │   │   ├── LoadingState.tsx           # Pulse skeletons for tables, metric cards, and panels
│   │   │   ├── EmptyState.tsx             # Illustrated empty placeholder with action button
│   │   │   └── ErrorState.tsx             # Alert box with retry trigger
│   │   ├── lib/
│   │   │   └── api.ts                     # `apiRequest<T>` wrapper for fetch, handling base URL, JSON headers, bearer auth, and error parsing
│   │   └── types/
│   │       └── auth.ts                    # AuthUser, AuthResponse, UserRole types
│   ├── next.config.ts                     # Next.js config with staticGenerationRetryCount: 3
│   ├── postcss.config.mjs                 # PostCSS config with @tailwindcss/postcss
│   └── package.json
├── design.md                              # Master UI design specification & tokens (ReliefOps)
└── README.md
```

---

# 3. DATA MODELS & DATABASE SCHEMAS

All models reside in `backend/src/models/` using Mongoose and TypeScript interfaces.

### 3.1 User (`User.ts`)
- **Collection:** `users`
- **Fields:**
  - `name`: `string`, required, trim, minlength 2, maxlength 100
  - `email`: `string`, required, unique, lowercase, trim, maxlength 254
  - `password`: `string`, required, `select: false` (hashed with bcrypt, salt rounds 12)
  - `role`: `string`, enum: `["admin", "coordinator", "field_user"]`, default: `"field_user"`
  - `isActive`: `boolean`, default: `true`
  - `createdAt`, `updatedAt`: `Date` (timestamps enabled)

### 3.2 ReliefCentre (`ReliefCentre.ts`)
- **Collection:** `reliefcentres`
- **Fields:**
  - `name`: `string`, required, trim
  - `address`: `string`, required, trim
  - `location`: `{ lat: number (-90 to 90), lng: number (-180 to 180) }`, required
  - `contactNumber`: `string`, optional, trim
  - `isActive`: `boolean`, default: `true` (Used for soft-deactivation to preserve allocation history)
  - `createdAt`, `updatedAt`: `Date`

### 3.3 Resource (`Resource.ts`)
- **Collection:** `resources`
- **Fields:**
  - `name`: `string`, required, trim
  - `category`: `string`, enum: `["food", "water", "medicine", "clothing", "shelter", "other"]`, required
  - `unit`: `string`, required, trim (e.g., `"litres"`, `"packets"`, `"kits"`, `"boxes"`)
  - `quantity`: `number`, required, min 0, integer, default: 0
  - `centre`: `ObjectId` referencing `ReliefCentre`, required
  - `createdAt`, `updatedAt`: `Date`
- **Indexes:** `{ centre: 1, category: 1 }`

### 3.4 ReliefRequest (`ReliefRequest.ts`)
- **Collection:** `reliefrequests`
- **Fields:**
  - `title`: `string`, required, trim, maxlength 150
  - `description`: `string`, required, trim, maxlength 2000
  - `category`: `string`, enum: `["food", "water", "medicine", "clothing", "shelter", "other"]`, required
  - `quantityNeeded`: `number`, required, min 1, integer
  - `quantityFulfilled`: `number`, required, default 0, min 0, integer
  - `unit`: `string`, required, trim
  - `priority`: `string`, enum: `["low", "medium", "high", "critical"]`, default: `"medium"`
  - `status`: `string`, enum: `["pending", "partially_allocated", "allocated", "dispatched", "delivered", "cancelled"]`, default: `"pending"`
  - `location`: `{ lat: number (-90 to 90), lng: number (-180 to 180) }`, required
  - `requestedBy`: `ObjectId` referencing `User`, required
  - `assignedCentre`: `ObjectId` referencing `ReliefCentre`, optional
  - `createdAt`, `updatedAt`: `Date`

### 3.5 Allocation (`Allocation.ts`)
- **Collection:** `allocations`
- **Fields:**
  - `request`: `ObjectId` referencing `ReliefRequest`, required
  - `resource`: `ObjectId` referencing `Resource`, required
  - `centre`: `ObjectId` referencing `ReliefCentre`, required
  - `quantity`: `number`, required, min 1, integer
  - `status`: `string`, enum: `["allocated", "dispatched", "delivered", "cancelled"]`, default: `"allocated"`
  - `allocatedBy`: `ObjectId` referencing `User`, required
  - `createdAt`, `updatedAt`: `Date`
- **Indexes:** `{ request: 1, status: 1 }`, `{ centre: 1, createdAt: -1 }`

---

# 4. ROLES & PERMISSION MATRIX (RBAC)

The system enforces server-side role validation in `backend/src/middleware/authenticate.ts`:

| Action / Resource | Admin | Coordinator | Field User | Notes |
|---|:---:|:---:|:---:|---|
| Public Register (`/api/auth/register`) | — | — | Yes | Always registers as `field_user`. No client role selection allowed. |
| Login / Read Profile (`/api/auth/login`, `/me`) | Yes | Yes | Yes | All active users. |
| View Dashboard Stats (`/api/dashboard/stats`) | Yes | Yes | Scoped | `field_user` sees only their own request metrics; others see global metrics. |
| Submit Relief Request (`POST /api/requests`) | Yes | Yes | Yes | Any authenticated user. |
| View Relief Requests (`GET /api/requests`) | Global | Global | Own only | `field_user` is strictly scoped to `requestedBy == user.id`. |
| Cancel Own Request (`PATCH /api/requests/:id/cancel`) | Yes | Yes | Yes | Only when `requestedBy == user.id` and status is `"pending"`. |
| Update Request Status (`PATCH /api/requests/:id/status`) | Yes | Yes | No | Coordinator/Admin only. |
| Manage Centres (`POST`, `PATCH /api/centres`) | Yes | Yes | No | Coordinator/Admin only. |
| Deactivate Centre (`DELETE /api/centres/:id`) | Yes | No | No | Admin only (soft-delete). |
| Manage Resources (`POST`, `PATCH /api/resources`) | Yes | Yes | No | Coordinator/Admin only. |
| Delete Resource (`DELETE /api/resources/:id`) | Yes | Yes | No | Blocked with 409 if referenced by any allocation in history. |
| Create Allocation (`POST /api/allocations`) | Yes | Yes | No | Coordinator/Admin only. |
| Update Allocation Status (`PATCH /api/allocations/:id/status`) | Yes | Yes | No | Coordinator/Admin only (dispatch, delivered, cancel). |

---

# 5. COMPLETE REST API SPECIFICATION

Base URL: `http://localhost:5000/api`  
All protected routes require `Authorization: Bearer <jwt_token>` header.

### 5.1 Auth (`/api/auth`)
- **`POST /register`**
  - **Body:** `{ "name": "Jane", "email": "jane@relief.org", "password": "Password123!" }`
  - **Validation:** Name required, valid email, password ≥ 8 chars. Role forced to `field_user`.
  - **Returns (201):** `{ "success": true, "token": "...", "user": { "id", "name", "email", "role" } }`
- **`POST /login`**
  - **Body:** `{ "email": "admin@relief.org", "password": "AdminPass123!" }`
  - **Returns (200):** `{ "success": true, "token": "...", "user": { ... } }`
- **`GET /me`**
  - **Returns (200):** `{ "success": true, "user": { ... } }`

### 5.2 Relief Centres (`/api/centres`)
- **`GET /`** — List all centres (includes inactive; client can filter).
- **`GET /:id`** — Single centre details.
- **`POST /`** (Admin/Coordinator)
  - **Body:** `{ "name": "Central Hub", "address": "Connaught Place", "location": { "lat": 28.6315, "lng": 77.2167 }, "contactNumber": "+91-11-23345678" }`
  - **Validation:** Lat (−90 to 90), Lng (−180 to 180).
- **`PATCH /:id`** (Admin/Coordinator) — Update name, address, location, contact, or `isActive`.
- **`DELETE /:id`** (Admin only) — Soft deletes centre by setting `isActive: false`.

### 5.3 Resources (`/api/resources`)
- **`GET /`** — Query params: `?centre=<id>`, `?category=<cat>`. Returns resources populated with centre.
- **`GET /:id`** — Single resource.
- **`POST /`** (Admin/Coordinator)
  - **Body:** `{ "name": "Mineral Water", "category": "water", "unit": "litres", "quantity": 1000, "centre": "<centre_id>" }`
  - **Validation:** `centre` must exist and have `isActive === true`. `quantity` must be integer ≥ 0.
- **`PATCH /:id`** (Admin/Coordinator) — Partial update of resource fields.
- **`DELETE /:id`** (Admin/Coordinator)
  - **Integrity Rule:** Checks `Allocation.countDocuments({ resource: req.params.id })`. If `> 0`, returns **HTTP 409**: `"Cannot delete resource because it is referenced in allocation history. Update its quantity to 0 instead."`

### 5.4 Relief Requests (`/api/requests`)
- **`POST /`** (All authenticated)
  - **Body:** `{ "title": "Drinking Water", "description": "Sector 5 camp", "category": "water", "quantityNeeded": 200, "unit": "litres", "priority": "high", "location": { "lat": 28.7, "lng": 77.1 } }`
  - **Initial State:** `quantityFulfilled: 0`, `status: "pending"`, `requestedBy: req.user.id`.
- **`GET /`** (All authenticated)
  - Query params: `?category=...`, `?priority=...`, `?status=...`
  - Field users only receive their own requests (`requestedBy == req.user.id`).
- **`GET /:id`** — Single request details.
- **`PATCH /:id/status`** (Admin/Coordinator) — Direct status updates.
- **`PATCH /:id/cancel`** (Owner only) — Cancels request if current status is `"pending"`.

### 5.5 Allocations (`/api/allocations`)
- **`GET /`** (Admin/Coordinator) — Query params: `?request=<id>`, `?resource=<id>`, `?centre=<id>`. Returns allocation history.
- **`POST /`** (Admin/Coordinator)
  - **Body:** `{ "requestId": "<id>", "resourceId": "<id>", "quantity": 50 }`
  - **Execution:** Invokes `createAllocation()` atomic workflow (see Section 6).
- **`PATCH /:id/status`** (Admin/Coordinator)
  - **Body:** `{ "status": "dispatched" | "delivered" | "cancelled" }`
  - **Execution:** Invokes `updateAllocationStatus()` lifecycle state machine.

### 5.6 Dashboard (`/api/dashboard/stats`)
- **`GET /stats`**
  - Global metrics for Admin/Coordinator:
    `{ "requests": { "pending", "critical", "total" }, "centres": { "active", "total" }, "inventory": { "totalItems" }, "allocations": { "active" } }`
  - Scoped metrics for `field_user`:
    `{ "requests": { "myRequests", "pending", "fulfilled" } }`

### 5.7 Health (`/api/health`)
- **`GET /api/health`** — Public healthcheck: `{ "success": true, "message": "Disaster Relief API is running" }`.

---

# 6. CRITICAL CORE BUSINESS LOGIC & STATE MACHINES

### 6.1 Two-Phase Atomic Allocation Algorithm (`allocation.service.ts`)
When `POST /api/allocations` is called:
1. **Compatibility Validation:**
   - Request must be in status `"pending"` or `"partially_allocated"`.
   - Remaining needed = `request.quantityNeeded - request.quantityFulfilled`. Allocation quantity cannot exceed remaining needed.
   - Resource `category` must strictly match Request `category`.
   - Resource `unit` must match Request `unit` (trimmed, case-insensitive).
   - If request has an `assignedCentre`, resource must belong to that exact centre.
   - Storage centre must be active (`isActive === true`).
2. **Step 1: Atomic Stock Deduction:**
   `Resource.updateOne({ _id: resource._id, quantity: { $gte: quantity } }, { $inc: { quantity: -quantity } })`
   If `modifiedCount !== 1`, throws `INSUFFICIENT_STOCK` (HTTP 409).
3. **Step 2: Atomic Fulfillment Increment:**
   `ReliefRequest.updateOne({ _id: req._id, status: { $in: ["pending", "partially_allocated"] }, quantityFulfilled: { $lte: request.quantityNeeded - quantity } }, { $inc: { quantityFulfilled: quantity } })`
   If `modifiedCount !== 1`, **rolls back** resource deduction (`$inc: { quantity: +quantity }`) and throws `CONCURRENT_ALLOCATION_CONFLICT` (HTTP 409).
4. **Step 3: State Determination & Creation:**
   - If `newFulfilled >= quantityNeeded` → request status becomes `"allocated"`.
   - If `newFulfilled < quantityNeeded` → request status becomes `"partially_allocated"`.
   - Request locks `assignedCentre` to resource centre.
   - Creates `Allocation` document with status `"allocated"`.

### 6.2 Allocation Lifecycle State Machine (`updateAllocationStatus`)
Valid transitions for `Allocation.status`:
- `allocated` → `dispatched` OR `cancelled`
- `dispatched` → `delivered` OR `cancelled`
- `delivered` → (terminal state, no transitions)
- `cancelled` → (terminal state, no transitions)

**Cancellation Rollback Logic:**
When an allocation is transitioned to `"cancelled"`:
1. Allocated quantity is atomically added back to `Resource.quantity`.
2. `ReliefRequest.quantityFulfilled` is reduced by the allocation's quantity.
3. If new `quantityFulfilled === 0` → request status reverts to `"pending"`.
4. If `0 < newFulfilled < quantityNeeded` → request status reverts to `"partially_allocated"`.
5. If `newFulfilled >= quantityNeeded` → remains `"allocated"`.

---

# 7. OPERATIONS MAP & REAL ROAD ROUTING (OSRM)

The map feature resides in `frontend/src/app/map/`:
- **Engine:** Leaflet 1.9.4 loaded client-side (`next/dynamic` with `ssr: false`).
- **Tiles:** OpenStreetMap standard tiles (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`) with mandatory attribution.
- **Routing Service:** OSRM (Open Source Routing Machine) public demo API:
  `https://router.project-osrm.org/route/v1/driving/{originLng},{originLat};{destLng},{destLat}?overview=full&geometries=geojson`
  *(Note: OSRM expects coordinates in `longitude,latitude` order; Leaflet uses `latitude,longitude`).*
- **Crucial Rule:** The project uses **OSRM for driving road network routes**. **Never claim Dijkstra is implemented on the frontend/backend.** Do not invent fake coordinates or display straight flight paths.
- **Marker Styling (`ReliefMap.tsx`):**
  - Active Centre: Teal square (`#176B63`, 30px) with white building SVG icon.
  - Inactive Centre: Hollow grey square (`#667085`, 26px).
  - Critical Request: Red circle (`#B42318`, 32px) with white triangle alert icon.
  - High Request: Amber circle (`#B54708`, 28px) with "!" icon.
  - Standard Request: Blue circle (`#026AA2`, 24px) with white dot.
  - Origin / Destination: Badged with "A" (teal) or "B" (blue) overlays.
  - Route Polyline: Dual layer — 7px white casing underlay + 4px `--accent` (`#176B63`) road line.

---

# 8. FRONTEND DESIGN SYSTEM & COMPONENT ARCHITECTURE

Branding: **ReliefOps — Emergency Operations Console** (from `design.md`).

### 8.1 Design Tokens (`frontend/src/app/globals.css`)
- Light, calm operational workspace (avoid bright neon or dark cyberpunk themes).
- Canvas: `#F4F6F8` (`--canvas`)
- Surface: `#FFFFFF` (`--surface`), Muted Surface: `#EEF2F6` (`--surface-muted`)
- Sidebar: `#17232D` (`--sidebar`), Sidebar Hover: `#22323F` (`--sidebar-hover`)
- Accent: `#176B63` (`--accent`, restrained teal), Hover: `#11564F`
- Status Colors:
  - Critical / Danger: `#B42318` text, `#FEE4E2` background
  - Warning / High: `#B54708` text, `#FEF0C7` background
  - Info: `#026AA2` text, `#E0F2FE` background
  - Success: `#027A48` text, `#ECFDF3` background
  - Muted: `#667085`

### 8.2 Client-Side Session Storage
- Token: `sessionStorage.getItem("authToken")`
- User: `JSON.parse(sessionStorage.getItem("authUser"))` as `AuthUser` (`{ id, name, email, role }`)
- Authenticated routes are wrapped in `<AppShell user={user}>`. If token is absent, redirect to `/login`.
- Unauthenticated routes (`/login`, `/register`) redirect to `/dashboard` if token is present.
- Root route (`/`) automatically inspects `sessionStorage` and immediately redirects to `/dashboard` or `/login`.

---

# 9. SEED ACCOUNTS & TEST CREDENTIALS

The database contains pre-configured credentials for all three roles:

| Role | Email | Password |
|---|---|---|
| **System Admin** | `admin@relief.org` | `AdminPass123!` |
| **Operations Coordinator** | `coordinator@relief.org` | `CoordinatorPass123!` |
| **Field Volunteer** | `volunteer@relief.org` | `FieldVolunteerPass123!` |

**CLI Seed Commands:**
```powershell
# Provision/reset an Admin or Coordinator:
npm --prefix backend run seed:admin -- --email admin@relief.org --password AdminPass123! --name "System Admin" --role admin

# Seed realistic Delhi NCR centres (Connaught Place, Rohini), inventory, requests, and allocations:
npm --prefix backend run seed:sample

# Run end-to-end integration test suite (verifies 8 complete workflows):
npm --prefix backend run verify:workflows
```

---

# 10. STRICT DEVELOPMENT RULES FOR CODING ASSISTANTS

When proposing changes, writing code, or debugging:
1. **Do not recreate the project from scratch** or replace the tech stack (Next.js App Router, Express, TypeScript, Mongoose).
2. **Never break existing API contracts** or change route paths without explicit user approval.
3. **Preserve data integrity:** Keep atomic allocations, partial fulfillment calculations, and the 409 deletion lock on referenced resources.
4. **Preserve OSRM road routing:** Leaflet must always be loaded client-side (`next/dynamic`, `ssr: false`). Never claim Dijkstra is used for road routing.
5. **No `any` types in TypeScript:** Keep code strictly typed across both frontend and backend.
6. **No duplicated shells or sidebars:** All authenticated frontend pages must reuse `<AppShell>` from `src/components/AppShell.tsx`.
7. **Always verify builds:** Run `npm --prefix frontend run build` and `npm --prefix backend run build` to ensure 0 compilation errors.

---

# 11. IMPLEMENTATION AUDIT: WHAT IS COMPLETED VS WHAT IS LEFT

This section provides an itemized breakdown of current completion status (estimated ~90% complete for college minor project scope, with full core requirements delivered and working) versus optional future enhancements.

### 11.1 What Is 100% Completed & Verified Working

#### A. Backend Architecture & Security
- [x] Express 5.3 + TypeScript server setup with CORS, body parsing, and route modularization.
- [x] MongoDB local database integration via Mongoose 9.11 with typed schemas, validation, and indexes.
- [x] Secure authentication with JWT (`1d` expiration) and bcrypt password hashing (12 salt rounds).
- [x] Passwords strictly excluded from MongoDB query results (`select: false`).
- [x] Server-side Role-Based Access Control (`authenticate` and `authorize` middleware).
- [x] Safe public registration: forced strictly to `field_user` (prevents privilege escalation).
- [x] Strict input sanitization and MongoDB ObjectId validation (`mongoose.isValidObjectId`) on all params.
- [x] Strict numerical validation: positive whole numbers for quantities; decimal range checks (−90 to 90 lat, −180 to 180 lng).
- [x] Field user data scoping: field users can only view and cancel their own submitted requests.
- [x] Soft-delete mechanism for relief centres (`isActive: false`), preserving historical relations.
- [x] Referential integrity protection: `DELETE /api/resources/:id` blocked with **HTTP 409 Conflict** if the resource is referenced by any allocation history.
- [x] CLI seed script for admin/coordinator provisioning (`npm run seed:admin`).
- [x] Automated sample dataset seeding realistic Delhi NCR coordinates (`npm run seed:sample`).
- [x] Automated 8-step end-to-end integration test suite (`npm run verify:workflows`).
- [x] Clean backend TypeScript build (`npm --prefix backend run build` passes with 0 errors).

#### B. Allocation Business Logic & State Machines
- [x] Two-phase atomic allocation algorithm in `allocation.service.ts`.
- [x] Atomic inventory deduction via MongoDB conditional update (`$gte: quantity`, `$inc: { quantity: -quantity }`).
- [x] Atomic request fulfillment tracking (`$inc: { quantityFulfilled: quantity }`) with concurrency rollback.
- [x] Automated request status progression (`pending` → `partially_allocated` → `allocated`).
- [x] Compatibility filtering: category matching, unit matching (case-insensitive), active centre verification, and assigned centre lock.
- [x] Allocation lifecycle state machine: `allocated` → `dispatched` → `delivered` or `cancelled`.
- [x] Allocation cancellation rollback: atomically returns stock to inventory and rolls back request fulfillment.

#### C. Frontend Design System & Pages (ReliefOps)
- [x] Complete Tailwind CSS v4 design token implementation (`globals.css` via `@theme inline`).
- [x] Light operational workspace theme (`--canvas: #F4F6F8`, `--surface: #FFFFFF`, deep charcoal `--sidebar: #17232D`, restrained teal `--accent: #176B63`).
- [x] Complete reusable UI component library in `frontend/src/components/`:
  - `AppShell` (shared wrapper, mobile hamburger drawer, accessible skip link)
  - `Sidebar` (role-aware navigation, active teal strip, user role badge, logout)
  - `PageHeader` (breadcrumbs, title, subtitle, actions)
  - `Button` (primary, secondary, tertiary, destructive; sm, md, lg; loading spinner)
  - `FormField` (label, required asterisk, helper text, accessible error display)
  - `StatusBadge` (calm pill badges for all 8 system statuses)
  - `PriorityBadge` (dual shape + color badges: critical alert-triangle, high chevron-up, medium dash, low chevron-down)
  - `ConfirmDialog` (accessible modal dialog with focus trap and ESC key support)
  - `Toast` (auto-dismissing notifications for actions)
  - `LoadingState`, `EmptyState`, `ErrorState` (uniform fallbacks across all pages)
- [x] **Root Route (`/`):** Instant session check and redirect (`/dashboard` if authenticated, `/login` if not).
- [x] **Sign In (`/login`):** 400px light card, visible labels, password reveal toggle, alert banners, required college project disclaimer.
- [x] **Registration (`/register`):** 400px light card, password length validation, no role selector.
- [x] **Dashboard (`/dashboard`):** 4-metric strip (`Pending requests`, `Critical requests`, `Active relief centres`, truthful `Not available` for pending allocations), attention strip for critical backlog, request queue, priority and allocation breakdowns.
- [x] **Relief Requests (`/requests`):** Debounced search, category/priority filter, fulfillment ratio column, 420px slide-out detail drawer, validated modal create form, request cancellation dialog.
- [x] **Resource Inventory (`/resources`):** Inventory summary strip, active facility filter, Add/Edit modal (strictly active centres selectable), delete dialog with verbatim 409 referential error handling.
- [x] **Relief Centres (`/centres`):** Facilities table, 420px slide-out drawer with 5-decimal WGS84 coordinates and stored inventory list, Add/Edit modal, soft-deactivate/reactivate confirmation dialog.
- [x] **Allocations (`/allocations`):** 7/5 desktop split with numbered 4-step allocation form, dynamic context panel with fulfillment bar and compatible stock, inline confirmation summary, allocation history table with lifecycle action buttons (`Dispatch`, `Mark delivered`, `Cancel`).
- [x] **Operations Map (`/map`):** Full-bleed workspace, 360px docked left tool panel, Leaflet + OpenStreetMap engine, custom SVG markers (teal squares for centres, hollow for inactive, priority-coded circles for requests), real road routing via OSRM (distance & duration), dual-layer road polyline, accessible tabular list view fallback.
- [x] Clean frontend Next.js production build (`npm --prefix frontend run build` passes with 0 errors).

---

### 11.2 What Is Left / Future Roadmap (Pending Enhancements)

While all core project requirements, rubric criteria, and design specifications are completely implemented and functional, the following items represent potential future enhancements, production hardening, or extended features:

#### A. Extended Mapping & GIS Features (Currently Functional via Manual Entry)
- [ ] **Interactive Map Picking:** Allow clicking on the map canvas to set latitude/longitude coordinates directly when creating a new relief request or centre (currently validated manual decimal degrees input).
- [ ] **Multi-Stop Route Optimization:** TSP (Travelling Salesperson Problem) or multi-drop delivery routing for dispatching one resource vehicle to multiple relief requests (currently point-to-point A-to-B via OSRM).
- [ ] **Self-Hosted OSRM Instance:** Replace public OSRM demo API with a self-hosted Docker OSRM backend to eliminate public rate-limiting in production environments.
- [ ] **Geofencing / Disaster Boundary Overlays:** GeoJSON polygon overlays on Leaflet to visualize flood zones, earthquake impact zones, or containment perimeters.

#### B. Real-Time Communication & Notifications
- [ ] **WebSockets / Server-Sent Events (SSE):** Push instant updates to the dashboard and request queue when a field user submits an urgent request (currently updates on page reload, navigation, or form submission).
- [ ] **SMS / Email Alerts:** Twilio or SendGrid integration to alert coordinators when a "critical" priority request is submitted.

#### C. Scalability & Advanced Data Management
- [ ] **Server-Side Pagination:** Add `?page=1&limit=25` cursor/offset pagination to `GET /api/requests` and `GET /api/allocations` for datasets exceeding thousands of records (currently client-side debouncing and filtering).
- [ ] **PDF & CSV Export:** Export manifest sheets for drivers during dispatch, or CSV audit reports of monthly inventory consumption.
- [ ] **Resource Expiration Tracking:** Add `expiryDate` and batch numbers to perishable medical supplies and food rations.

#### B. Production Infrastructure & Deployment Hardening
- [ ] **HTTP-Only Cookie Sessions:** Migrate JWT tokens from `sessionStorage` to secure HTTP-only cookies with rotating refresh tokens for enterprise SSO hardening.
- [ ] **Rate Limiting:** Add `express-rate-limit` middleware on `/api/auth/login` and `/api/auth/register` to mitigate brute-force attempts.
- [ ] **Containerization:** Create `Dockerfile` and `docker-compose.yml` for unified one-click deployment of Node backend, Next.js frontend, and MongoDB service.
```
