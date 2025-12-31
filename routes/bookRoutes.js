import express from "express";
import Book from "../models/Book.js";
import upload from "../middleware/upload.js";
import mongoose from "mongoose";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
  try {
    // 1. Get the User ID from the token (added by middleware)
    const userId = req.user.id; // or req.user._id depending on your middleware

    // 2. Filter: Only find books added by THIS user
    const books = await Book.find({ addedBy: userId })
      .sort({ createdAt: -1 }); // Optional: Newest first

    res.json(books);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a book (student or admin)
// router.post(
//   "/",
//   authenticateToken,
//   authorizeRoles("admin", "student"),
//   async (req, res) => {
//     try {
//       const {
//         coverUrl,
//         title,
//         author,
//         year,
//         genre,
//         description,
//         tags,
//         status,
//       } = req.body;

//       if (!title || !author) {
//         return res.status(400).json({ error: "Title and author are required" });
//       }

//       const newBook = new Book({
//         coverUrl,
//         title,
//         author,
//         year,
//         genre,
//         description,
//         tags,
//         status,
//         addedBy: req.user._id,
//       });

//       await newBook.save();
//       res.status(201).json(newBook);
//     } catch (err) {
//       res.status(400).json({ error: err.message });
//     }
//   }
// );

// Update a book (any logged-in user)
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { coverUrl, title, author, year, genre, description, tags, status } =
      req.body;

    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: "Book not found" });

    book.coverUrl = coverUrl ?? book.coverUrl;
    book.title = title ?? book.title;
    book.author = author ?? book.author;
    book.year = year ?? book.year;
    book.genre = genre ?? book.genre;
    book.description = description ?? book.description;
    book.tags = tags ?? book.tags;
    book.status = status ?? book.status;

    await book.save();
    res.json(book);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Bulk Delete Books
router.delete("/bulk-delete", authenticateToken, async (req, res) => {
  try {
    const { ids } = req.body; // Getting the list of IDs from the request

    // 1. Validation
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No book IDs provided" });
    }

    // 2. Perform Delete
    // We use $in to match any ID that is inside the 'ids' array
    const result = await Book.deleteMany({
      _id: { $in: ids },
      addedBy: req.user.id // Security: Ensure user only deletes THEIR OWN books
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "No matching books found to delete" });
    }

    res.json({ 
      message: "Books deleted successfully", 
      count: result.deletedCount 
    });

  } catch (err) {
    console.error("Bulk Delete Error:", err);
    res.status(500).json({ error: "Server error during deletion" });
  }
});

// Delete a book (any logged-in user)
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: "Book not found" });

    await book.deleteOne();
    res.json({ message: "Book deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});



// Upload image file
router.post(
  "/upload-image",
  authenticateToken,
  upload.single("cover"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const imageUrl = `http://localhost:5000/${req.file.path}`;
    res.json({ url: imageUrl });
  }
);


// router.get('/stats/details', authenticateToken, async (req, res) => {
//   try {
//     const userId = new mongoose.Types.ObjectId(req.user.id);

//     // 1. Get Genre Distribution
//     const genreStats = await Book.aggregate([
//       { $match: { addedBy: userId } },
//       { $group: { _id: "$genre", count: { $sum: 1 } } },
//       { $project: { genre: { $ifNull: ["$_id", "Uncategorized"] }, count: 1, _id: 0 } }
//     ]);

//     // 2. Get Growth over months
//     const monthlyStats = await Book.aggregate([
//       { $match: { addedBy: userId } },
//       {
//         $group: {
//           _id: { $month: "$createdAt" },
//           booksAdded: { $sum: 1 }
//         }
//       },
//       { $sort: { "_id": 1 } },
//       { 
//         $project: { 
//           month: { 
//             $arrayElemAt: [
//               ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], 
//               "$_id"
//             ] 
//           }, 
//           booksAdded: 1, _id: 0 
//         } 
//       }
//     ]);

//     // 3. Top Genre calculation
//     const topGenre = genreStats.length > 0 ? genreStats.sort((a,b) => b.count - a.count)[0].genre : "None";

//     res.json({ genreStats, monthlyStats, topGenre });
//   } catch (err) {
//     res.status(500).json({ error: "Analytics engine failed: " + err.message });
//   }
// });

// Example Backend Route

router.get('/stats/details', authenticateToken, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    // 1. Get Basic Metrics (Total and Completed)
    const totalBooks = await Book.countDocuments({ addedBy: userId });
    
    // NOTE: Change 'status: "Completed"' to match whatever field you use to track finished books
    const completedBooks = await Book.countDocuments({ addedBy: userId, status: "Completed" });
    
    const completionRate = totalBooks > 0 ? Math.round((completedBooks / totalBooks) * 100) : 0;

    // 2. Get Genre Distribution
    const genreStats = await Book.aggregate([
      { $match: { addedBy: userId } },
      { $group: { _id: "$genre", count: { $sum: 1 } } },
      { $project: { genre: { $ifNull: ["$_id", "Uncategorized"] }, count: 1, _id: 0 } }
    ]);

    // 3. Get Growth over months (Raw Aggregation)
    const rawMonthlyStats = await Book.aggregate([
      { $match: { addedBy: userId } },
      {
        $group: {
          _id: { $month: "$createdAt" },
          booksAdded: { $sum: 1 }
        }
      },
      { 
        $project: { 
          month: { 
            $arrayElemAt: [
              ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], 
              "$_id"
            ] 
          }, 
          booksAdded: 1, _id: 0 
        } 
      }
    ]);

    // 4. GAP FILLER: Ensure the last 6 months are always present
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyStats = [];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mName = monthNames[d.getMonth()];

      // Check if the database gave us data for this month
      const existingMonth = rawMonthlyStats.find(item => item.month === mName);
      
      monthlyStats.push({
        month: mName,
        booksAdded: existingMonth ? existingMonth.booksAdded : 0
      });
    }

    // 5. Top Genre calculation
    const topGenre = genreStats.length > 0 
      ? genreStats.sort((a,b) => b.count - a.count)[0].genre 
      : "None";

    // 6. Final Response Object
    res.json({ 
      totalBooks, 
      completionRate, 
      topGenre, 
      genreStats, 
      monthlyStats 
    });

  } catch (err) {
    res.status(500).json({ error: "Analytics engine failed: " + err.message });
  }
});



// Add a book (Corrected endpoint)
router.post(
  "/add",
  authenticateToken,
  authorizeRoles("admin", "student", "super_admin"),
  async (req, res) => {
    try {
      console.log("Incoming Book Data:", req.body); // DEBUG: See what frontend is sending
      console.log("User from Token:", req.user);    // DEBUG: Ensure user ID exists

      const { coverUrl, title, author, year, genre, description, tags, googleId } = req.body;

      // 1. Validation check
      if (!title || !author) {
        return res.status(400).json({ error: "Title and author are required" });
      }

      // 2. Create the document
      const newBook = new Book({
        coverUrl,
        title,
        author,
        year: year || new Date().getFullYear(),
        genre: genre || "General",
        description: description || "",
        tags: tags || [],
        googleId: googleId || null,
        isPublic: true, 
        // IMPORTANT: Ensure this matches how your middleware stores user info
        addedBy: req.user._id || req.user.id, 
      });

      const savedBook = await newBook.save();
      console.log("Book saved successfully!");
      res.status(201).json(savedBook);

    } catch (err) {
      console.error("SAVE ERROR:", err.message); // This will tell you EXACTLY why it failed
      res.status(400).json({ error: err.message });
    }
  }
);

// Export Books to CSV
router.post("/export", authenticateToken, async (req, res) => {
  try {
    const { search, genre, status, sort, tags } = req.body;
    const userId = new mongoose.Types.ObjectId(req.user.id);

    // 1. REUSE THE SAME FILTER LOGIC
    const listQuery = { addedBy: userId };

    if (search) {
      listQuery.$or = [
        { title: { $regex: search, $options: "i" } },
        { author: { $regex: search, $options: "i" } },
        { isbn: { $regex: search, $options: "i" } } // Added ISBN search too
      ];
    }

    if (tags?.length > 0) listQuery.tags = { $in: tags };
    if (genre && genre !== "all") listQuery.genre = genre;
    if (status && status !== "all") listQuery.status = status;
    else listQuery.status = { $ne: 'wishlist' };

    // 2. SORT LOGIC
    const sortMap = {
      title_asc: { title: 1 },
      title_desc: { title: -1 },
      year_desc: { year: -1 },
      created_desc: { createdAt: -1 },
    };
    const sortQuery = sortMap[sort] || { createdAt: -1 };

    // 3. FETCH ALL DATA (No Pagination/Limit)
    const books = await Book.find(listQuery).sort(sortQuery);

    // 4. CONVERT TO CSV FORMAT MANUALLY
    // Define columns
    const fields = ["Title", "Author", "Genre", "Status", "Year", "ISBN"];
    
    // Create the header row
    let csv = fields.join(",") + "\n";

    // Loop through books and create rows
    books.forEach((book) => {
      
      // Helper to handle commas/quotes inside data (e.g., "Harry Potter, The")
      const escape = (text) => {
        if (!text) return "";
        const stringText = String(text);
        // If text contains comma or quote, wrap in quotes and escape internal quotes
        if (stringText.includes(",") || stringText.includes('"')) {
          return `"${stringText.replace(/"/g, '""')}"`;
        }
        return stringText;
      };

      const row = [
        escape(book.title),
        escape(book.author),
        escape(book.genre),
        escape(book.status),
        escape(book.year),
        escape(book.isbn || "N/A"),
      ];

      csv += row.join(",") + "\n";
    });

    // 5. SEND AS FILE
    res.header("Content-Type", "text/csv");
    res.header("Content-Disposition", "attachment; filename=library_export.csv");
    res.status(200).send(csv);

  } catch (err) {
    console.error("Export Error:", err);
    res.status(500).json({ error: "Failed to generate CSV" });
  }
});


// Get Explore Books (Corrected)
// router.get('/explore', async (req, res) => {
//     try {
//         // Find books that are public AND not added by the current user (optional)
//         // If your DB is empty, this returns [], which is why you see "No books found"
//         const books = await Book.find({ isPublic: true }).limit(20); 
//         res.json({ books });
//     } catch (err) {
//         res.status(500).json({ message: err.message });
//     }
// });


router.get('/explore', async (req, res) => {
    try {
        const { genre, page = 0, q } = req.query;
        const limit = 15;
        const skip = parseInt(page) * limit;

        // 1. MATCH STAGE
        // REMOVED: googleId: { $exists: true, $ne: null }
        // Now we only check if it is public.
        let matchStage = { isPublic: true };

        // Search Logic
        if (q) {
            matchStage.$or = [
                { title: { $regex: q, $options: 'i' } },
                { author: { $regex: q, $options: 'i' } }
            ];
        }

        // Genre Logic
        if (genre && genre !== 'All') {
            matchStage.genre = genre;
        }

        const books = await Book.aggregate([
            // Step 1: Filter
            { $match: matchStage },

            // Step 2: Grouping (The Fix)
            {
                $group: {
                    // LOGIC: If 'googleId' exists, use it to group (deduplicate).
                    // If 'googleId' is missing (null), use the book's unique '_id'.
                    // This ensures books without googleId are NOT hidden, but displayed individually.
                    _id: { $ifNull: [ "$googleId", "$_id" ] },
                    
                    title: { $first: "$title" },
                    author: { $first: "$author" },
                    coverUrl: { $first: "$coverUrl" },
                    genre: { $first: "$genre" },
                    // Pass the googleId if it exists, otherwise it might be null
                    googleId: { $first: "$googleId" }, 
                    originalId: { $first: "$_id" } 
                }
            },

            // Step 3: Sort (Newest first)
            { $sort: { _id: -1 } }, 

            // Step 4: Pagination
            { $skip: skip },
            { $limit: limit }
        ]);

        const hasMore = books.length === limit;

        res.json({ books, hasMore });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});



router.post("/filter", authenticateToken, async (req, res) => {
  try {
    const { search, genre, status, sort, tags } = req.body;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    
    const userId = new mongoose.Types.ObjectId(req.user.id);
    

    /*  LIST QUERY  */
    const listQuery = { addedBy: userId };

    if (search) {
      listQuery.$or = [
        { title: { $regex: search, $options: "i" } },
        { author: { $regex: search, $options: "i" } },
      ];
    }

    if (tags?.length > 0) {
      listQuery.tags = { $in: tags };
    }

    if (genre && genre !== "all") {
      listQuery.genre = genre;
    }

    if (status && status !== "all") {
      listQuery.status = status;
    }else {
    listQuery.status = { $ne: 'wishlist' }; 
}


    const overallTotal = await Book.countDocuments({ addedBy: userId });

    /*  TOTAL COUNT  */
    const filteredTotal  = await Book.countDocuments(listQuery);

    /*  STATS   */
    const statusCounts = await Book.aggregate([
      { $match: { addedBy: userId } }, 
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const stats = { unread: 0, reading: 0, completed: 0 };

    statusCounts.forEach((item) => {
      stats[item._id] = item.count;
    });

    const test = await Book.aggregate([
  { $match: {} },
  { $group: { _id: "$addedBy", count: { $sum: 1 } } }
]);

console.log(test);


    /*  SORT  */
    const sortMap = {
      title_asc: { title: 1 },
      title_desc: { title: -1 },
      year_desc: { year: -1 },
      created_desc: { createdAt: -1 },
    };

    const sortQuery = sortMap[sort] || { createdAt: -1 };

    /*  BOOK LIST  */
    const books = await Book.find(listQuery)
      .sort(sortQuery)
      .skip(skip)
      .limit(limit);

    res.json({
      books,
      overallTotal,
      filteredTotal,
      totalPages: Math.ceil(filteredTotal  / limit),
      currentPage: page,
      stats,
    });
  } catch (error) {
    console.error("Filter API Error:", error);
    res.status(500).json({ error: error.message });
  }
});



export default router;
