import { Router } from "express";
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
} from "../controllers/Wishlist/wishlist.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

// Apply authentication middleware to all wishlist routes

// Routes
router.post("/wishlist", verifyToken, getWishlist);
router.post("/wishlist/add", verifyToken, addToWishlist);
router.delete("/wishlist/remove/:productId", verifyToken, removeFromWishlist);
router.delete("/wishlist/clear", verifyToken, clearWishlist);

export default router;
