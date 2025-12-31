import mongoose from "mongoose";

const bookSchema = new mongoose.Schema(
  {
    coverUrl: { type: String },
    title: { type: String, required: true },
    author: { type: String, required: true },
    year: { type: Number },
    genre: { type: String },
    description: { type: String },
    tags: { type: [String], default: [] },
    rating: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["unread", "reading", "completed"],
      default: "unread",
    },
    infoLink: { type: String },
    // --- NEW FIELDS ADDED HERE ---
    googleId: { type: String }, // Optional: used for Google API matching
    isPublic: { type: Boolean, default: true }, // Set to true so they show in Explore
    // ----------------------------
    addedBy: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
     },
  },
  { timestamps: true }
);

export default mongoose.model("Book", bookSchema);