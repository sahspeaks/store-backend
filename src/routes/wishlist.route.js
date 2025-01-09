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
router.use(verifyToken);

// Routes
router.get("/wishlist", getWishlist);
router.post("/wishlist/add", addToWishlist);
router.delete("/wishlist/remove/:productId", removeFromWishlist);
router.delete("/wishlist/clear", clearWishlist);

export default router;
