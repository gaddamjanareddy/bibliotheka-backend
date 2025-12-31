import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Book from "../models/Book.js";

dotenv.config();

// ESM replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read JSON file
const books = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../../../../json/books.json"),
    "utf-8"
  )
);

const seedBooks = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);

    await Book.deleteMany();       // optional
    await Book.insertMany(books);  // BEST choice

    console.log("✅ Books seeded successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
};

seedBooks();
