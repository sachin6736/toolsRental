import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/userroutes.js";
import toolRoutes from "./routes/toolRoutes.js";
import rentalRoutes from "./routes/rentalRoutes.js";
import dailyTransactionRoutes from "./routes/dailyTransactionRoutes.js";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// REMOVE THESE LINES (no local uploads folder)
// app.use("/uploads", express.static("uploads"));

// Routes
app.use("/Users", userRoutes);
app.use("/Tools", toolRoutes);
app.use("/Rentals", rentalRoutes);
app.use("/dailytransactions", dailyTransactionRoutes);

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

await connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));