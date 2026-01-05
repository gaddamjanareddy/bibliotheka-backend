import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import bookRoutes from "./routes/bookRoutes.js";
import googleBooksRoutes from "./routes/googleBooksRoutes.js";


dotenv.config();

const app = express();

app.use("/uploads", express.static("uploads"));


// Middleware
app.use(cors({
  origin: "http://localhost:5173", 
  credentials: true,               
  allowedHeaders: ["Content-Type", "Authorization"], 
}));
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/users", userRoutes);
app.use("/api/google-books", googleBooksRoutes);


// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("DB Connection Error:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
