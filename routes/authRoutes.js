import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

// Signup route
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Check if user or email already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser)
      return res.status(400).json({ error: "Username or email already exists" });

    const hashedPassword = await bcrypt.hash(password, 8);
    const newUser = new User({ username, email, password: hashedPassword, role });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login route
// router.post("/login", async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     const user = await User.findOne({ email });
//     if (!user) return res.status(400).json({ error: "Invalid email or password" });

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch)
//       return res.status(400).json({ error: "Invalid email or password" });

//     const token = jwt.sign(
//       { id: user._id, role: user.role },
//       process.env.JWT_SECRET,
//       { expiresIn: "2h" }
//     );

//     res.json({ message: "Login successful", token, role: user.role });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });
router.post("/login", async (req, res) => {
  console.time("LOGIN_TOTAL");

  try {
    const { email, password } = req.body;

    console.time("DB_FIND_USER");
    const user = await User.findOne({ email });
    console.timeEnd("DB_FIND_USER");

    if (!user) {
      console.timeEnd("LOGIN_TOTAL");
      return res.status(400).json({ error: "Invalid email or password" });
    }

    console.time("BCRYPT_COMPARE");
    const isMatch = await bcrypt.compare(password, user.password);
    console.timeEnd("BCRYPT_COMPARE");

    if (!isMatch) {
      console.timeEnd("LOGIN_TOTAL");
      return res.status(400).json({ error: "Invalid email or password" });
    }

    console.time("JWT_SIGN");
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );
    console.timeEnd("JWT_SIGN");

    console.timeEnd("LOGIN_TOTAL");

    res.json({ message: "Login successful", token, role: user.role });
  } catch (err) {
    console.timeEnd("LOGIN_TOTAL");
    res.status(500).json({ error: err.message });
  }
});


export default router;

