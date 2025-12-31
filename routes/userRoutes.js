import Express from "express";
import User from "../models/User.js";
import { authenticateToken as authMiddleware } from "../middleware/authMiddleware.js";

const router = Express.Router();

// GET ALL USERS
router.get("/", authMiddleware, async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get("/profile", authMiddleware, async (req, res) => {
  try {
    // CHANGE: Added .populate("wishlist")
    // This turns the array of IDs ['65a...'] into array of Objects [{googleId: '...', ...}]
    // This allows the Frontend to check wishlist items against googleIds.
    const user = await User.findById(req.user.id)
      .select("-password")
      .populate("wishlist");
      
    res.json(user);
  } catch (error) {
    console.error("Profile Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT profile
router.put("/profile", authMiddleware, async (req, res) => {
  try {
    const { username, email, role } = req.body;
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) return res.status(404).json({ message: "User not found" });

    // Role update restrictions
    if (role) {
      if (currentUser.role === "student") {
        return res.status(403).json({ message: "Students cannot change role" });
      }

      if (
        currentUser.role === "admin" &&
        !["admin", "student"].includes(role)
      ) {
        return res.status(403).json({
          message: "Admin can only change role to admin or student",
        });
      }

      // super_admin can change any role
      currentUser.role = role;
    }

    // Update username/email
    if (username) currentUser.username = username;
    if (email) currentUser.email = email;

    const updatedUser = await currentUser.save();

    res.json({
      username: updatedUser.username,
      email: updatedUser.email,
      role: updatedUser.role,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE USER ROLE — Admin / Super Admin Only
router.put("/:id/role", authMiddleware, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const newRole = req.body.role;

    const requester = await User.findById(req.user.id); // logged-in user
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // STUDENTS CANNOT CHANGE ANY ROLE
    if (requester.role === "student") {
      return res.status(403).json({ message: "You do not have permission" });
    }

    // ADMIN CAN CHANGE ONLY STUDENTS
    if (requester.role === "admin") {
      if (targetUser.role !== "student") {
        return res.status(403).json({
          message: "Admins can modify only student roles",
        });
      }

      if (!["student", "admin"].includes(newRole)) {
        return res.status(403).json({
          message: "Admins cannot assign super_admin role",
        });
      }
    }

    // SUPER_ADMIN can change anyone EXCEPT themselves
    if (requester.role === "super_admin") {
      if (requester._id.toString() === targetUserId) {
        return res.status(403).json({
          message: "Super Admin cannot change their own role",
        });
      }
    }

    // APPLY ROLE UPDATE
    targetUser.role = newRole;
    await targetUser.save();

    res.json({
      message: "Role updated successfully",
      updatedUser: {
        id: targetUser._id,
        username: targetUser.username,
        role: targetUser.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// 1. GET USER WISHLIST (Full Book Details)
router.get("/wishlist/all", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("wishlist");
    res.json(user.wishlist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. TOGGLE SINGLE BOOK (Add or Remove)
router.post("/wishlist/toggle/:bookId", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const { bookId } = req.params;

    if (user.wishlist.includes(bookId)) {
      user.wishlist.pull(bookId); // Remove if exists
    } else {
      user.wishlist.push(bookId); // Add if not exists
    }
    
    await user.save();
    res.json({ message: "Wishlist updated", wishlist: user.wishlist });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. BULK ADD TO WISHLIST
router.post("/wishlist/bulk", authMiddleware, async (req, res) => {
  try {
    const { bookIds } = req.body; // Expecting ["id1", "id2"]
    
    // $addToSet ensures we don't add the same book twice
    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { wishlist: { $each: bookIds } }
    });

    res.json({ message: "Books added to wishlist successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. BULK REMOVE FROM WISHLIST
router.post("/wishlist/bulk-remove", authMiddleware, async (req, res) => {
  try {
    const { bookIds } = req.body; // Array of IDs to remove

    // $pull + $in: "Find the wishlist and pull out any ID that is inside the bookIds list"
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { wishlist: { $in: bookIds } }
    });

    res.json({ message: "Books removed from wishlist" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

