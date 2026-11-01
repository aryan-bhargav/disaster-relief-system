import { config } from "dotenv";
import path from "path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User, { UserRole } from "../models/User.js";
import { connectDB } from "../config/db.js";

// Load .env from backend directory or project root
config({ path: path.resolve(process.cwd(), ".env") });
config({ path: path.resolve(process.cwd(), "backend/.env") });
config();

function getArg(flag: string, index: number, envVar: string): string | undefined {
  if (process.env[envVar]) return process.env[envVar];

  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === flag && i + 1 < args.length) {
      return args[i + 1];
    }
    if (args[i].startsWith(`${flag}=`)) {
      return args[i].slice(flag.length + 1);
    }
  }

  // Positional fallback if no flags starting with '--' are used
  const hasFlags = args.some((a) => a.startsWith("--"));
  if (!hasFlags && args[index] !== undefined) {
    return args[index];
  }

  return undefined;
}

async function seedUser(): Promise<void> {
  const email = getArg("--email", 0, "ADMIN_EMAIL");
  const password = getArg("--password", 1, "ADMIN_PASSWORD");
  const name = getArg("--name", 2, "ADMIN_NAME") ?? "Authorized User";
  const role = (getArg("--role", 3, "ADMIN_ROLE") ?? "admin") as UserRole;

  if (!email || !password) {
    console.error("Usage:");
    console.error("  npm --prefix backend run seed:admin -- --email <email> --password <password> [--name <name>] [--role <admin|coordinator>]");
    console.error("  OR: npm --prefix backend run seed:admin -- <email> <password> [name] [role]");
    console.error("  OR: set ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_ROLE in environment.");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  if (!["admin", "coordinator"].includes(role)) {
    console.error("Role must be 'admin' or 'coordinator'.");
    process.exit(1);
  }

  try {
    await connectDB();

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });

    if (existing) {
      existing.name = name.trim();
      existing.password = await bcrypt.hash(password, 12);
      existing.role = role;
      existing.isActive = true;
      await existing.save();
      console.log(`Updated existing user '${normalizedEmail}' with role: ${role}`);
    } else {
      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role,
        isActive: true,
      });
      console.log(`Successfully created authorized user '${user.email}' with role: ${user.role}`);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Failed to seed authorized user:", error);
    process.exit(1);
  }
}

void seedUser();
