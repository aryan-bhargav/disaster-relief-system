# Disaster Relief Resource Allocation and Coordination System

A production-grade, full-stack disaster management and resource logistics platform developed as an engineering minor project. The system coordinates emergency relief requests from field volunteers, manages relief centres and emergency inventory, computes conflict-free atomic allocations, and provides geospatial visualization with real road routing.

---

## 1. System Architecture

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS.
- **Backend**: Node.js, Express 5, TypeScript (Node16 ESM), Mongoose.
- **Database**: Local MongoDB.
- **Geospatial & Mapping**: Leaflet, OpenStreetMap tiles, and Open Source Routing Machine (OSRM) for real road distance and driving duration.

```
disaster-relief-system/
├── frontend/               # Next.js App Router client
│   ├── src/
│   │   ├── app/            # App Router pages (/login, /register, /dashboard, /requests, /centres, /resources, /allocations, /map)
│   │   ├── components/     # UI components & Leaflet Map loader
│   │   ├── lib/            # Typed API client helper
│   │   └── types/          # Shared TypeScript models
│   ├── .env.local          # Frontend environment config
│   └── package.json
├── backend/                # Express TypeScript REST API
│   ├── src/
│   │   ├── config/         # Database connection
│   │   ├── controllers/    # API controllers
│   │   ├── middleware/     # JWT authentication & role-based access control (RBAC)
│   │   ├── models/         # Mongoose schemas (User, ReliefCentre, Resource, ReliefRequest, Allocation)
│   │   ├── routes/         # Express routes
│   │   ├── services/       # Atomic allocation service & inventory consistency
│   │   ├── scripts/        # Safe admin provisioning & end-to-end verification
│   │   ├── app.ts          # Express app configuration
│   │   └── server.ts       # Server entry point
│   ├── .env.example        # Environment variables template
│   └── package.json
└── README.md
```

---

## 2. User Roles & Access Control

| Role | Permissions |
| :--- | :--- |
| `field_user` | Public self-registration; create emergency relief requests with coordinates; view personal requests and fulfillment status. Cannot access centres, inventory, or allocation management. |
| `coordinator` | Manage relief centres and resource inventories; execute partial and full resource allocations; update allocation lifecycle statuses (`dispatched`, `delivered`, `cancelled`); view system-wide dashboard metrics and logistics map. |
| `admin` | Full system governance; manage user accounts, roles, centres, and inventory; inspect audit history and dashboard metrics. |

> **Security Note**: Public registration (`POST /api/auth/register`) enforces `role: "field_user"` regardless of request payloads to prevent privilege escalation. Privileged roles (`admin`, `coordinator`) are created exclusively through the safe CLI provisioning tool.

---

## 3. Verified Features & Business Logic

### Atomic Resource Allocation & Consistency
- **Concurrency & Over-allocation Guards**: Resource stock deduction uses atomic MongoDB operators (`$gte: quantity`, `$inc: { quantity: -quantity }`). Allocations are rejected if available stock is insufficient or if the allocation exceeds the request's remaining needed quantity.
- **Compatibility Validation**: Category (`food`, `water`, `medical`, `shelter`, `other`) and measurement unit (`packets`, `litres`, `kits`, `kg`, etc.) must strictly match between request and resource before an allocation is permitted.
- **Referential Integrity**: Resources referenced in historical allocations cannot be deleted (`HTTP 409 Conflict`), preserving audit history.
- **Lifecycle Tracking & Stock Rollback**:
  - Request statuses: `pending` → `partially_allocated` → `allocated` → `dispatched` → `delivered` (or `cancelled`).
  - Allocation statuses: `allocated` → `dispatched` → `delivered` (or `cancelled`).
  - When an allocation or request is cancelled, deducted inventory is atomically restored to the source resource.

### Categorized Inventory Metrics
- Unlike legacy implementations that summed quantities of incompatible units (e.g. adding litres of water to boxes of blankets), the dashboard breaks down inventory strictly by category and unit.

### Interactive GIS Mapping & Real Road Routing
- Interactive Leaflet map rendered dynamically on the client side to eliminate Next.js hydration and SSR errors.
- Displays color-coded markers for relief centres (blue) and pending relief requests (priority-coded: red = critical, orange = high, yellow = medium, green = low).
- Origin and destination selection directly from marker popups.
- Calculates and visualizes real road routes, driving distance (km), and estimated transit duration via the **OSRM (Open Source Routing Machine)** driving service.
- *Notice*: Routing relies on real road network topology via OSRM; it does not claim to run Dijkstra or mock Euclidean straight-line distance.

---

## 4. End-to-End Automated Test Verification

All 10 core system workflows were automatically verified against an active MongoDB test database:

| Workflow | Test Description | Result | Details |
| :---: | :--- | :---: | :--- |
| **1** | Register & Log In as Field User | **PASS** | Role locked to `field_user`, JWT token issued. |
| **2** | Create & View Relief Request | **PASS** | Request created with `pending` status and `quantityFulfilled: 0`. |
| **3** | RBAC Authorization Enforcement | **PASS** | `field_user` blocked from centres (403), resources (403), allocations (403). |
| **4** | Authorized Coordinator Authentication | **PASS** | Coordinator authenticated with valid permissions. |
| **5** | Create Relief Centre & Stock Inventory | **PASS** | Centre and 120-unit resource created and linked. |
| **6** | Partial Allocation & Stock Deduction | **PASS** | Allocated 40/100 units. Status updated to `partially_allocated`, stock reduced to 80. |
| **7** | Full Allocation Progression | **PASS** | Allocated remaining 60 units. Status progressed to `allocated`, stock updated to 20. |
| **8** | Validation Guards & Referential Integrity | **PASS** | Over-allocation rejected (409), category mismatch rejected (400), insufficient stock rejected (409), referenced resource deletion blocked (409). |
| **9** | Status Transitions & Stock Restoration | **PASS** | `dispatched` (200), `delivered` (200), backwards transition blocked (400), cancellation restored stock (+15). |
| **10** | Map Coordinates & OSRM Road Route | **PASS** | GPS boundary validation passed; real OSRM road distance and duration calculated. |

**Overall Verification Status**: `10/10 Workflows Passed`

---

## 5. Prerequisites & Setup

### Requirements
- **Node.js**: v18.x or v20.x
- **MongoDB**: v6.0+ or v8.0+ running locally on port `27017`
- **npm**: v9.x or v10.x

### Environment Configuration

1. **Backend (`backend/.env`)**:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://127.0.0.1:27017/disaster_relief
   JWT_SECRET=your_secure_random_jwt_secret_key_here
   NODE_ENV=development
   ```

2. **Frontend (`frontend/.env.local`)**:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```

---

## 6. Running the Application

### Step 1: Start MongoDB
Ensure MongoDB is running locally:
```powershell
Get-Service MongoDB
```

### Step 2: Safe Admin / Coordinator Account Provisioning
Create privileged accounts through the secure CLI seeding script (passwords are securely hashed with bcrypt):
```bash
# Provision a Coordinator
npm --prefix backend run seed:admin -- --email coordinator@relief.org --password CoordinatorSecurePass123! --name "Operations Lead" --role coordinator

# Provision an Administrator
npm --prefix backend run seed:admin -- --email admin@relief.org --password AdminSecurePass123! --name "System Administrator" --role admin
```

### Step 3: Run Backend Development Server
```bash
cd backend
npm run dev
```
Backend API will listen on `http://localhost:5000`.

### Step 4: Run Frontend Development Server
```bash
cd frontend
npm run dev
```
Frontend application will be accessible at `http://localhost:3000`.

---

## 7. Running Builds & Automated Tests

### Backend TypeScript Compilation
```bash
cd backend
npm run build
```

### Frontend Production Build
```bash
cd frontend
npm run build
```

### Automated End-to-End Workflow Verification Suite
To execute the complete 10-workflow test suite against your local MongoDB:
```bash
npm --prefix backend exec tsx backend/src/scripts/verify-workflows.ts
```

---

## 8. Manual Demonstration Walkthrough

Follow these steps for a complete live demonstration:

1. **Public User Registration**:
   - Navigate to `http://localhost:3000/register`.
   - Register a field volunteer (e.g., `volunteer@disaster.org`).
   - Observe that the account is created with `field_user` role and redirected to `/dashboard`.
2. **Submit Emergency Relief Request**:
   - Navigate to `http://localhost:3000/requests`.
   - Click **Create Request**. Fill in title, category (e.g., `water`), needed quantity (e.g., `50`), unit (`litres`), priority (`critical`), and GPS coordinates (e.g., Lat: `28.6139`, Lng: `77.2090`).
   - Submit and verify the request shows status `pending` with `0 / 50 litres fulfilled`.
3. **Log In as Coordinator**:
   - Log out and log in at `http://localhost:3000/login` with your seeded coordinator credentials.
   - Observe that navigation items for **Centres**, **Resources**, **Allocations**, and **Map** are visible.
4. **Create Centre and Stock Inventory**:
   - Go to `http://localhost:3000/centres` and create a centre (e.g., "Central Relief Depot", Lat: `28.6500`, Lng: `77.2300`).
   - Go to `http://localhost:3000/resources` and add stock (e.g., "Mineral Water Bottles", category: `water`, unit: `litres`, quantity: `100`).
5. **Execute Partial and Full Allocations**:
   - Go to `http://localhost:3000/allocations`.
   - Select the pending request, select the water resource, enter quantity `30`, and submit.
   - Notice the request advances to `partially_allocated` (`30 / 50 fulfilled`), and resource stock reduces from `100` to `70`.
   - Allocate the remaining `20` units to transition the request to `allocated` (`50 / 50 fulfilled`).
6. **Progress Logistics Lifecycle**:
   - In the Allocations table, click **Dispatch** to transition status to `dispatched`.
   - Click **Mark Delivered** to confirm delivery.
7. **Geospatial Map & Road Routing**:
   - Navigate to `http://localhost:3000/map`.
   - View relief centres and emergency requests pinned on the interactive OpenStreetMap.
   - Click a Relief Centre popup and click **Set as Origin**.
   - Click a Relief Request popup and click **Set as Destination**.
   - The system calls the OSRM routing engine, renders the actual road path on the map, and displays driving distance (km) and estimated travel time (minutes).

---

## 9. Known Limitations & Technical Details

1. **OSRM Public Routing API**:
   - Road routes, distances, and travel times are computed using the public OSRM demo server (`https://router.project-osrm.org`).
   - The public server has rate limits and requires internet connectivity. In an offline or production deployment, deploy a local OSRM Docker container (`osrm/osrm-backend`) loaded with regional OpenStreetMap `.osm.pbf` extracts.
2. **Offline Map Tiles**:
   - Leaflet map rendering relies on OpenStreetMap public tile servers (`https://{s}.tile.openstreetmap.org/...`). Active internet access is required to download map tiles unless an offline raster/vector tile cache is configured.
3. **Single-Document Concurrency**:
   - Atomic inventory deductions and rollback guards are implemented using MongoDB atomic document update operations (`$gte`, `$inc`). This guarantees consistency on standalone local MongoDB instances without requiring a multi-node replica set.
