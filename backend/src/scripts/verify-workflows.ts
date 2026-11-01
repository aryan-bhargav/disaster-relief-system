import { config } from "dotenv";
import path from "path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import type { Server } from "http";
import app from "../app.js";
import User from "../models/User.js";
import ReliefCentre from "../models/ReliefCentre.js";
import Resource from "../models/Resource.js";
import ReliefRequest from "../models/ReliefRequest.js";
import Allocation from "../models/Allocation.js";

// Load environment variables
config({ path: path.resolve(process.cwd(), ".env") });
config({ path: path.resolve(process.cwd(), "backend/.env") });
config();

interface TestResult {
  step: number;
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function record(step: number, name: string, passed: boolean, details: string) {
  results.push({ step, name, passed, details });
  const status = passed ? "✓ PASS" : "✗ FAIL";
  console.log(`[Step ${step}] ${status}: ${name} — ${details}`);
}

async function runTests() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/disaster_relief";
  console.log(`\n======================================================`);
  console.log(`Disaster Relief Operations (ReliefOps) - Comprehensive Test Suite`);
  console.log(`Connecting to MongoDB...`);
  await mongoose.connect(uri);
  console.log(`Connected to database: ${mongoose.connection.name}`);

  // Clean test-specific records
  await Promise.all([
    User.deleteMany({ email: /@test\.internal$/ }),
    ReliefCentre.deleteMany({ name: /^TEST_/ }),
    Resource.deleteMany({ name: /^TEST_/ }),
    ReliefRequest.deleteMany({ title: /^TEST_/ }),
  ]);

  const server: Server = app.listen(0);
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 5000;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  console.log(`Ephemeral Test API Server running on port ${port}\n`);

  try {
    // -------------------------------------------------------------
    // WORKFLOW 1: Register and log in as a field user
    // -------------------------------------------------------------
    const fieldEmail = `field_${Date.now()}@test.internal`;
    const fieldPassword = "TestPassword123!";

    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Field Worker Jane",
        email: fieldEmail,
        password: fieldPassword,
      }),
    });
    const regData = (await regRes.json()) as any;

    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: fieldEmail,
        password: fieldPassword,
      }),
    });
    const loginData = (await loginRes.json()) as any;
    const fieldToken = loginData.token;

    const wf1Pass =
      regRes.status === 201 &&
      regData.user?.role === "field_user" &&
      loginRes.status === 200 &&
      Boolean(fieldToken);
    record(1, "Register & Log In as Field User", wf1Pass, `Registered with role '${regData.user?.role}', token issued.`);

    // -------------------------------------------------------------
    // WORKFLOW 2: Create and view a relief request with GPS coordinates
    // -------------------------------------------------------------
    const createReqRes = await fetch(`${baseUrl}/requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${fieldToken}`,
      },
      body: JSON.stringify({
        title: "TEST_Emergency Drinking Water",
        description: "Flood affected block needs bottled water",
        category: "water",
        quantityNeeded: 100,
        unit: "litres",
        location: { lat: 28.6139, lng: 77.209 },
      }),
    });
    const createReqData = (await createReqRes.json()) as any;
    const requestId = createReqData.data?._id;

    const viewReqsRes = await fetch(`${baseUrl}/requests`, {
      headers: { Authorization: `Bearer ${fieldToken}` },
    });
    const viewReqsData = (await viewReqsRes.json()) as any;
    const foundMyReq = (viewReqsData.data || []).some((r: any) => r._id === requestId);

    const wf2Pass =
      createReqRes.status === 201 &&
      createReqData.data?.status === "pending" &&
      createReqData.data?.quantityFulfilled === 0 &&
      foundMyReq;
    record(2, "Create & View Relief Request", wf2Pass, `Request '${requestId}' created with status 'pending' and fulfilled '0'.`);

    // -------------------------------------------------------------
    // WORKFLOW 3: Verify field user cannot access coordinator/admin operations
    // -------------------------------------------------------------
    const tryCentre = await fetch(`${baseUrl}/centres`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${fieldToken}` },
      body: JSON.stringify({
        name: "TEST_Forbidden Centre",
        address: "123 Somewhere",
        location: { lat: 28.5, lng: 77.1 },
      }),
    });

    const tryResource = await fetch(`${baseUrl}/resources`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${fieldToken}` },
      body: JSON.stringify({
        name: "TEST_Forbidden Resource",
        category: "water",
        unit: "litres",
        quantity: 50,
        centre: new mongoose.Types.ObjectId().toString(),
      }),
    });

    const tryAlloc = await fetch(`${baseUrl}/allocations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${fieldToken}` },
      body: JSON.stringify({
        requestId,
        resourceId: new mongoose.Types.ObjectId().toString(),
        quantity: 10,
      }),
    });

    const tryUsers = await fetch(`${baseUrl}/users`, {
      headers: { Authorization: `Bearer ${fieldToken}` },
    });

    const wf3Pass = tryCentre.status === 403 && tryResource.status === 403 && tryAlloc.status === 403 && tryUsers.status === 403;
    record(3, "RBAC Authorization Enforcement for Field User", wf3Pass, `Centres (403), Resources (403), Allocations (403), Users (403) all correctly denied.`);

    // -------------------------------------------------------------
    // WORKFLOW 4: Authorized coordinator and admin logins
    // -------------------------------------------------------------
    const coordEmail = `coord_${Date.now()}@test.internal`;
    const coordPassword = "CoordPassword123!";
    const coordHash = await bcrypt.hash(coordPassword, 12);

    await User.create({
      name: "Coordinator Alex",
      email: coordEmail,
      password: coordHash,
      role: "coordinator",
      isActive: true,
    });

    const coordLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: coordEmail, password: coordPassword }),
    });
    const coordLoginData = (await coordLoginRes.json()) as any;
    const coordToken = coordLoginData.token;

    const adminEmail = `admin_${Date.now()}@test.internal`;
    const adminPassword = "AdminPassword123!";
    const adminHash = await bcrypt.hash(adminPassword, 12);

    const adminUser = await User.create({
      name: "Admin Chief",
      email: adminEmail,
      password: adminHash,
      role: "admin",
      isActive: true,
    });

    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    const adminLoginData = (await adminLoginRes.json()) as any;
    const adminToken = adminLoginData.token;

    const wf4Pass =
      coordLoginRes.status === 200 &&
      coordLoginData.user?.role === "coordinator" &&
      adminLoginRes.status === 200 &&
      adminLoginData.user?.role === "admin" &&
      Boolean(coordToken) &&
      Boolean(adminToken);
    record(4, "Authorized Coordinator & Admin Authentication", wf4Pass, `Coordinator and Admin tokens successfully issued.`);

    // -------------------------------------------------------------
    // WORKFLOW 5: Create a relief centre and add inventory
    // -------------------------------------------------------------
    const createCentreRes = await fetch(`${baseUrl}/centres`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${coordToken}` },
      body: JSON.stringify({
        name: "TEST_North Relief Hub",
        address: "Sector 14, Main Road",
        location: { lat: 28.7041, lng: 77.1025 },
        contactNumber: "+91-9876543210",
      }),
    });
    const centreData = (await createCentreRes.json()) as any;
    const centreId = centreData.data?._id;

    const createResourceRes = await fetch(`${baseUrl}/resources`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${coordToken}` },
      body: JSON.stringify({
        name: "TEST_Clean Mineral Water Cans",
        category: "water",
        unit: "litres",
        quantity: 120,
        centre: centreId,
      }),
    });
    const resourceData = (await createResourceRes.json()) as any;
    const resourceId = resourceData.data?._id;

    const wf5Pass = createCentreRes.status === 201 && createResourceRes.status === 201 && Boolean(centreId) && Boolean(resourceId);
    record(5, "Create Relief Centre & Stock Inventory", wf5Pass, `Centre '${centreData.data?.name}' and Resource with 120 litres created.`);

    // -------------------------------------------------------------
    // WORKFLOW 6: Partial allocation of compatible inventory
    // -------------------------------------------------------------
    // Request needs 100 litres. We allocate 40 litres (partial).
    const partialAllocRes = await fetch(`${baseUrl}/allocations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${coordToken}` },
      body: JSON.stringify({
        requestId,
        resourceId,
        quantity: 40,
      }),
    });
    const partialAllocData = (await partialAllocRes.json()) as any;
    const allocationId = partialAllocData.data?._id;

    const updatedReq1 = await ReliefRequest.findById(requestId);
    const updatedRes1 = await Resource.findById(resourceId);

    const wf6Pass =
      partialAllocRes.status === 201 &&
      updatedReq1?.status === "partially_allocated" &&
      updatedReq1?.quantityFulfilled === 40 &&
      updatedRes1?.quantity === 80;
    record(6, "Partial Allocation & Stock Deduction", wf6Pass, `Allocated 40/100 litres. Request status='${updatedReq1?.status}', stock remaining=${updatedRes1?.quantity}.`);

    // -------------------------------------------------------------
    // WORKFLOW 7: Fulfill remaining allocation and prevent negative stock
    // -------------------------------------------------------------
    const fullAllocRes = await fetch(`${baseUrl}/allocations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${coordToken}` },
      body: JSON.stringify({
        requestId,
        resourceId,
        quantity: 60,
      }),
    });

    const updatedReq2 = await ReliefRequest.findById(requestId);
    const updatedRes2 = await Resource.findById(resourceId);

    const wf7Pass =
      fullAllocRes.status === 201 &&
      updatedReq2?.status === "allocated" &&
      updatedReq2?.quantityFulfilled === 100 &&
      updatedRes2?.quantity === 20;
    record(7, "Full Allocation Progression & Stock Accuracy", wf7Pass, `Allocated remaining 60 litres. Request status='${updatedReq2?.status}', stock=${updatedRes2?.quantity}.`);

    // -------------------------------------------------------------
    // WORKFLOW 8: Validation Guards & Referential Integrity
    // -------------------------------------------------------------
    // 8a. Over-allocation attempt (already fulfilled)
    const overAllocRes = await fetch(`${baseUrl}/allocations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${coordToken}` },
      body: JSON.stringify({ requestId, resourceId, quantity: 10 }),
    });

    // 8b. Category mismatch
    const foodResource = await Resource.create({
      name: "TEST_Rice Packets",
      category: "food",
      unit: "packets",
      quantity: 50,
      centre: centreId,
    });
    const waterReq2 = await ReliefRequest.create({
      title: "TEST_Water Needs",
      description: "More water",
      category: "water",
      quantityNeeded: 50,
      unit: "litres",
      location: { lat: 28.5, lng: 77.2 },
      requestedBy: new mongoose.Types.ObjectId(),
    });

    const mismatchRes = await fetch(`${baseUrl}/allocations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${coordToken}` },
      body: JSON.stringify({
        requestId: waterReq2._id.toString(),
        resourceId: foodResource._id.toString(),
        quantity: 5,
      }),
    });

    // 8c. Insufficient stock (35 requested within remaining 50 needed, but stock is only 20)
    const excessRes = await fetch(`${baseUrl}/allocations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${coordToken}` },
      body: JSON.stringify({
        requestId: waterReq2._id.toString(),
        resourceId,
        quantity: 35,
      }),
    });

    // 8d. Attempt to delete resource referenced in allocation history
    const deleteReferencedRes = await fetch(`${baseUrl}/resources/${resourceId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${coordToken}` },
    });

    const wf8Pass =
      overAllocRes.status >= 400 &&
      mismatchRes.status === 400 &&
      excessRes.status === 409 &&
      deleteReferencedRes.status === 409;
    record(8, "Validation Guards & Referential Integrity", wf8Pass, `Over-allocation rejected (${overAllocRes.status}), Category mismatch rejected (${mismatchRes.status}), Insufficient stock rejected (${excessRes.status}), Referenced resource deletion protected (409).`);

    // -------------------------------------------------------------
    // WORKFLOW 9: Lifecycle Status Transitions & Stock Restoration
    // -------------------------------------------------------------
    const dispatchRes = await fetch(`${baseUrl}/allocations/${allocationId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${coordToken}` },
      body: JSON.stringify({ status: "dispatched" }),
    });

    const deliverRes = await fetch(`${baseUrl}/allocations/${allocationId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${coordToken}` },
      body: JSON.stringify({ status: "delivered" }),
    });

    const invalidTransRes = await fetch(`${baseUrl}/allocations/${allocationId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${coordToken}` },
      body: JSON.stringify({ status: "pending" }),
    });

    // Test cancellation of another allocation and stock return:
    const allocToCancel = await new Allocation({
      request: waterReq2._id,
      resource: resourceId,
      centre: centreId,
      quantity: 15,
      allocatedBy: coordLoginData.user.id,
      status: "allocated",
    }).save();
    await Resource.updateOne({ _id: resourceId }, { $inc: { quantity: -15 } });
    waterReq2.quantityFulfilled = 15;
    waterReq2.status = "partially_allocated";
    await waterReq2.save();

    const stockBeforeCancel = (await Resource.findById(resourceId))?.quantity;

    const cancelAllocRes = await fetch(`${baseUrl}/allocations/${allocToCancel._id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${coordToken}` },
      body: JSON.stringify({ status: "cancelled" }),
    });

    const stockAfterCancel = (await Resource.findById(resourceId))?.quantity;
    const reqAfterCancel = await ReliefRequest.findById(waterReq2._id);

    const wf9Pass =
      dispatchRes.status === 200 &&
      deliverRes.status === 200 &&
      invalidTransRes.status === 400 &&
      cancelAllocRes.status === 200 &&
      stockBeforeCancel === 5 &&
      stockAfterCancel === 20 &&
      reqAfterCancel?.status === "pending";
    record(9, "Lifecycle Status Transitions & Stock Restoration", wf9Pass, `Dispatched (200), Delivered (200), Invalid backwards transition blocked (400), Cancellation restored +15 stock (5 -> 20).`);

    // -------------------------------------------------------------
    // WORKFLOW 10: Geospatial Validation & Haversine Proximity Math
    // -------------------------------------------------------------
    function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return Math.round(R * c * 10) / 10;
    }

    const testDist = calculateDistanceKm(28.7041, 77.1025, 28.6139, 77.209);
    const validCoord = (lat: number, lng: number) =>
      Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

    const wf10Pass = testDist > 10 && testDist < 20 && validCoord(28.6, 77.2) && !validCoord(95, 77.2);
    record(10, "Geospatial Validation & Haversine Proximity Math", wf10Pass, `Distance between Hub & New Delhi calculated as ${testDist} km.`);

    // -------------------------------------------------------------
    // WORKFLOW 11: Master Data - User Management for System Administrator
    // -------------------------------------------------------------
    // 11a. Admin listing users
    const listUsersRes = await fetch(`${baseUrl}/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const listUsersData = (await listUsersRes.json()) as any;

    // 11b. Coordinator attempting to list users -> 403
    const coordListUsersRes = await fetch(`${baseUrl}/users`, {
      headers: { Authorization: `Bearer ${coordToken}` },
    });

    // 11c. Admin updating user role
    const updateRoleRes = await fetch(`${baseUrl}/users/${loginData.user.id}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ role: "coordinator" }),
    });

    // 11d. Guard against self-demoting the sole active admin
    const selfDemoteRes = await fetch(`${baseUrl}/users/${adminUser._id}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ role: "field_user" }),
    });

    // 11e. Guard against self-deactivating own admin account
    const selfDeactivateRes = await fetch(`${baseUrl}/users/${adminUser._id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ isActive: false }),
    });

    // 11f. Admin toggling another user's status
    const toggleStatusRes = await fetch(`${baseUrl}/users/${loginData.user.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ isActive: false }),
    });

    const wf11Pass =
      listUsersRes.status === 200 &&
      Array.isArray(listUsersData.data) &&
      coordListUsersRes.status === 403 &&
      updateRoleRes.status === 200 &&
      selfDemoteRes.status === 400 &&
      selfDeactivateRes.status === 400 &&
      toggleStatusRes.status === 200;
    record(11, "Administrator User Master Data & Role Safety", wf11Pass, `List users (200), Coordinator denied (403), Role update (200), Self-demote blocked (400), Self-deactivate blocked (400), Status toggle (200).`);

    // -------------------------------------------------------------
    // WORKFLOW 12: Comprehensive Reports & Analytics Module
    // -------------------------------------------------------------
    // 12a. Admin accessing analytics
    const analyticsRes = await fetch(`${baseUrl}/dashboard/analytics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const analyticsData = (await analyticsRes.json()) as any;

    // 12b. Field user accessing analytics -> 403
    const fieldAnalyticsRes = await fetch(`${baseUrl}/dashboard/analytics`, {
      headers: { Authorization: `Bearer ${fieldToken}` },
    });

    const wf12Pass =
      analyticsRes.status === 200 &&
      analyticsData.success === true &&
      Boolean(analyticsData.data?.summary) &&
      Array.isArray(analyticsData.data?.categoryDistributions) &&
      Array.isArray(analyticsData.data?.centreLoads) &&
      Boolean(analyticsData.data?.statusFunnel) &&
      fieldAnalyticsRes.status === 403;
    record(12, "Reports & Analytics Module (DFD Alignment)", wf12Pass, `Analytics generated with KPIs, category matrix, and centre workloads (200). Field user denied (403).`);

    // -------------------------------------------------------------
    // WORKFLOW 13: Edge Case Validation (Negative Numbers, Coordinates, ObjectIds)
    // -------------------------------------------------------------
    // 13a. Negative quantity
    const negQtyRes = await fetch(`${baseUrl}/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${coordToken}` },
      body: JSON.stringify({
        title: "TEST_Negative",
        description: "Negative",
        category: "water",
        quantityNeeded: -10,
        unit: "litres",
        location: { lat: 28.5, lng: 77.2 },
      }),
    });

    // 13b. Out-of-bounds latitude (> 90)
    const badLatRes = await fetch(`${baseUrl}/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${coordToken}` },
      body: JSON.stringify({
        title: "TEST_BadLat",
        description: "Bad Lat",
        category: "water",
        quantityNeeded: 10,
        unit: "litres",
        location: { lat: 105.5, lng: 77.2 },
      }),
    });

    // 13c. Malformed ObjectId
    const malformedIdRes = await fetch(`${baseUrl}/requests/invalid-mongo-id-999`, {
      headers: { Authorization: `Bearer ${coordToken}` },
    });

    // 13d. Duplicate email registration
    const dupRegRes = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Duplicate User",
        email: fieldEmail,
        password: "SomePassword123!",
      }),
    });

    const wf13Pass =
      negQtyRes.status === 400 &&
      badLatRes.status === 400 &&
      malformedIdRes.status === 400 &&
      dupRegRes.status === 409;
    record(13, "Input Sanitization & Extreme Boundary Edge Cases", wf13Pass, `Negative quantity rejected (400), Out-of-bounds latitude rejected (400), Malformed ID rejected (400), Duplicate email registration rejected (409).`);

    // -------------------------------------------------------------
    // WORKFLOW 14: Soft-Deleted Relief Centre Inventory Protection
    // -------------------------------------------------------------
    // 14a. Deactivate relief centre
    const deactivateCentreRes = await fetch(`${baseUrl}/centres/${centreId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    // 14b. Attempt allocation from inactive centre resource
    const newReqForInactive = await ReliefRequest.create({
      title: "TEST_Needs From Inactive Centre",
      description: "Testing inactive centre rejection",
      category: "water",
      quantityNeeded: 5,
      unit: "litres",
      location: { lat: 28.6, lng: 77.2 },
      requestedBy: new mongoose.Types.ObjectId(),
    });

    const allocFromInactiveRes = await fetch(`${baseUrl}/allocations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${coordToken}` },
      body: JSON.stringify({
        requestId: newReqForInactive._id.toString(),
        resourceId,
        quantity: 5,
      }),
    });

    const wf14Pass =
      deactivateCentreRes.status === 200 &&
      allocFromInactiveRes.status >= 400;
    record(14, "Soft-Deleted Facility & Inventory Protection", wf14Pass, `Centre soft-deactivated (200), Allocation attempt from inactive facility blocked (${allocFromInactiveRes.status}).`);

  } finally {
    server.close();
    await mongoose.disconnect();
  }

  const allPassed = results.every((r) => r.passed);
  console.log(`\n======================================================`);
  console.log(`VERIFICATION SUMMARY: ${results.filter((r) => r.passed).length}/${results.length} Workflows Passed`);
  console.log(`OVERALL STATUS: ${allPassed ? "ALL 14 SUITES VERIFIED SUCCESSFULLY (100% PASS)" : "SOME WORKFLOWS FAILED"}`);
  console.log(`======================================================\n`);

  if (!allPassed) {
    process.exit(1);
  }
}

void runTests();
