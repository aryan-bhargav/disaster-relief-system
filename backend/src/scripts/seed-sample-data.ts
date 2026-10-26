import { config } from "dotenv";
import path from "path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User, { IUser } from "../models/User.js";
import ReliefCentre, { IReliefCentre } from "../models/ReliefCentre.js";
import Resource, { IResource } from "../models/Resource.js";
import ReliefRequest, { IReliefRequest } from "../models/ReliefRequest.js";
import Allocation from "../models/Allocation.js";
import { connectDB } from "../config/db.js";

// Load .env
config({ path: path.resolve(process.cwd(), ".env") });
config({ path: path.resolve(process.cwd(), "backend/.env") });
config();

async function seedSampleData(): Promise<void> {
  try {
    await connectDB();
    console.log("Connected to MongoDB. Seeding demo sample data...");

    // 1. Ensure a Coordinator and a Field User exist for relations
    let coordinator: IUser | null = await User.findOne({ role: "coordinator" });
    if (!coordinator) {
      const hashed = await bcrypt.hash("CoordinatorPass123!", 12);
      coordinator = await User.create({
        name: "Operations Lead (Demo)",
        email: "coordinator@relief.org",
        password: hashed,
        role: "coordinator",
        isActive: true,
      });
      console.log("Created coordinator: coordinator@relief.org");
    }

    let fieldUser: IUser | null = await User.findOne({ role: "field_user" });
    if (!fieldUser) {
      const hashed = await bcrypt.hash("FieldVolunteerPass123!", 12);
      fieldUser = await User.create({
        name: "Field Volunteer (Demo)",
        email: "volunteer@relief.org",
        password: hashed,
        role: "field_user",
        isActive: true,
      });
      console.log("Created field user: volunteer@relief.org");
    }

    // 2. Clean up previous demo data to avoid duplicates
    await ReliefRequest.deleteMany({ title: /^\[Demo\]/ });
    await Resource.deleteMany({ name: /^\[Demo\]/ });
    await ReliefCentre.deleteMany({ name: /^\[Demo\]/ });

    // 3. Create 2 Relief Centres with real Delhi NCR coordinates
    const centre1: IReliefCentre = await ReliefCentre.create({
      name: "[Demo] Central Relief Depot (Connaught Place)",
      address: "Block C, Connaught Place, New Delhi",
      location: { lat: 28.6315, lng: 77.2167 },
      contactNumber: "+91-11-23345678",
      isActive: true,
    });

    const centre2: IReliefCentre = await ReliefCentre.create({
      name: "[Demo] North Logistics Hub (Rohini)",
      address: "Sector 10, Rohini, New Delhi",
      location: { lat: 28.7150, lng: 77.1180 },
      contactNumber: "+91-11-27564321",
      isActive: true,
    });
    console.log("Created 2 relief centres with geospatial coordinates.");

    // 4. Create Resource Inventories at both centres
    await Resource.create({
      name: "[Demo] Mineral Drinking Water",
      category: "water",
      unit: "litres",
      quantity: 2000,
      centre: centre1._id,
    });

    const medicalResource: IResource = await Resource.create({
      name: "[Demo] Emergency Trauma & First Aid Kits",
      category: "medicine",
      unit: "kits",
      quantity: 140, // 150 - 10 allocated
      centre: centre1._id,
    });

    await Resource.create({
      name: "[Demo] Ready-to-Eat Ration Packets",
      category: "food",
      unit: "packets",
      quantity: 1200,
      centre: centre1._id,
    });

    await Resource.create({
      name: "[Demo] Water Purification Tablets & Cans",
      category: "water",
      unit: "litres",
      quantity: 1500,
      centre: centre2._id,
    });

    await Resource.create({
      name: "[Demo] Waterproof Tarpaulins & Blankets",
      category: "shelter",
      unit: "kits",
      quantity: 400,
      centre: centre2._id,
    });
    console.log("Created 5 resource inventory items across centres.");

    // 5. Create 3 Relief Requests with real Delhi NCR coordinates
    await ReliefRequest.create({
      title: "[Demo] Flood Relief Camp - Drinking Water Need",
      description: "Yamuna river flood plain camp urgently needs clean drinking water for 80 families",
      category: "water",
      quantityNeeded: 350,
      quantityFulfilled: 0,
      unit: "litres",
      priority: "critical",
      location: { lat: 28.6920, lng: 77.2280 }, // Majnu Ka Tila flood area
      requestedBy: fieldUser._id,
      status: "pending",
    });

    const req2: IReliefRequest = await ReliefRequest.create({
      title: "[Demo] Community Health Post - Medical Kits",
      description: "Field clinic requiring sterile trauma dressing and basic first aid kits",
      category: "medicine",
      quantityNeeded: 25,
      quantityFulfilled: 10,
      unit: "kits",
      priority: "high",
      location: { lat: 28.6505, lng: 77.1950 }, // Karol Bagh community post
      requestedBy: fieldUser._id,
      assignedCentre: centre1._id,
      status: "partially_allocated",
    });

    await ReliefRequest.create({
      title: "[Demo] Evacuation Center - Food Packets",
      description: "Displaced families needing non-perishable high-energy food ration packets",
      category: "food",
      quantityNeeded: 180,
      quantityFulfilled: 0,
      unit: "packets",
      priority: "medium",
      location: { lat: 28.6180, lng: 77.1250 }, // Janakpuri Community Hall
      requestedBy: fieldUser._id,
      status: "pending",
    });
    console.log("Created 3 relief requests with geolocations (critical, high, medium).");

    // 6. Create 1 Sample Allocation for req2
    await Allocation.create({
      request: req2._id,
      resource: medicalResource._id,
      centre: centre1._id,
      quantity: 10,
      allocatedBy: coordinator._id,
      status: "dispatched",
    });
    console.log("Created 1 active sample allocation (status: dispatched).");

    console.log("\n==========================================");
    console.log("DEMO SAMPLE DATA SEEDED SUCCESSFULLY!");
    console.log("Centres: 2 (Central Delhi & Rohini Hubs)");
    console.log("Requests: 3 (Flood Camp, Health Post, Evacuation Center)");
    console.log("Inventory: Water, Medicine Kits, Food, Shelter");
    console.log("All locations configured with real Delhi NCR coordinates for OSRM routing.");
    console.log("==========================================");

    await mongoose.disconnect();
  } catch (err) {
    console.error("Failed to seed sample data:", err);
    process.exit(1);
  }
}

void seedSampleData();
