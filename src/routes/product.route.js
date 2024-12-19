import express from "express";
import {
  fetchAllProducts,
  fetchProductById,
  fetchProductByCategory,
  fetchProductBySubcategory,
} from "../controllers/Products/product.controller.js";
import e from "express";
const router = express.Router();
// Fetch All Products
router.get("/products", fetchAllProducts);
// Fetch Product by ID
router.get("/product/:id", fetchProductById);
// Fetch Products by Category
router.get("/products/category/:categoryId", fetchProductByCategory);
// Fetch Products by Subcategory
router.get("/products/subcategory/:subcategoryId", fetchProductBySubcategory);

export default router;
