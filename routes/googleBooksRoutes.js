import express from "express";
import axios from "axios";

const router = express.Router();

// 🔍 Search books by query (title, author, keyword)
router.get("/search", async (req, res) => {
  try {
    const { q, startIndex = 0 } = req.query;

    if (!q) {
      return res.status(400).json({ message: "Query is required" });
    }

    const response = await axios.get(
      "https://www.googleapis.com/books/v1/volumes",
      {
        params: {
          q,
          startIndex,
          maxResults: 15,
          key: process.env.GOOGLE_BOOKS_KEY,
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error("Google Books Search Error:", error.message);
    res.status(500).json({ message: "Failed to fetch books" });
  }
});

// 📘 Search book by ISBN (Auto-fill)
router.get("/isbn/:isbn", async (req, res) => {
  try {
    const { isbn } = req.params;

    const response = await axios.get(
      "https://www.googleapis.com/books/v1/volumes",
      {
        params: {
          q: `isbn:${isbn}`,
          key: process.env.GOOGLE_BOOKS_KEY,
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error("Google Books ISBN Error:", error.message);
    res.status(500).json({ message: "Failed to fetch ISBN details" });
  }
});

export default router;
