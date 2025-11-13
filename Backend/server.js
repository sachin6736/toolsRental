// server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import userRoutes from "./routes/userroutes.js";
import toolRoutes from "./routes/toolRoutes.js";
import rentalRoutes from "./routes/rentalRoutes.js";
import dailyTransactionRoutes from "./routes/dailyTransactionRoutes.js";

// ---------- ES-Modules __dirname ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- Load .env (local only) ----------
dotenv.config({ path: path.resolve(__dirname, ".env") });

// ---------- Express ----------
const app = express();

// ---------- CORS: Allow Your Vercel App ----------
const allowedOrigins = [
  "http://localhost:5173",                    // Vite dev
  "http://localhost:3000",                    // React dev (optional)
  "https://tools-rental-gamma.vercel.app",    // YOUR LIVE FRONTEND
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// ---------- Body Parsers ----------
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ---------- Routes ----------
app.use("/Users", userRoutes);
app.use("/Tools", toolRoutes);
app.use("/Rentals", rentalRoutes);
app.use("/dailytransactions", dailyTransactionRoutes);

// ---------- Health Check ----------
app.get("/ping", (req, res) => {
  res.json({
    message: "Backend is LIVE!",
    time: new Date().toISOString(),
    frontend: "https://tools-rental-gamma.vercel.app",
  });
});

// ---------- MongoDB ----------
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully");
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }
};

await connectDB();

// ---------- Start Server ----------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: https://toolsrental.onrender.com/ping`);
});