
import mongoose from "mongoose";

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is missing from the .env file");
  }

  await mongoose.connect(uri);

  console.log(
    `MongoDB connected successfully to database: ${mongoose.connection.name}`
  );
}
