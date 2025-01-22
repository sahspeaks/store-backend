import express from "express";
import {
  fetchAllProducts,
  fetchProductById,
  fetchProductByCategory,
  fetchProductBySubcategory,
  fetchProductsByCategoryAndSubcategoryName,
  fetchProductsByCategoryAndSubcategoryId,
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
// Fetch Products by Category and Subcategory Name
router.get(
  "/products/:categoryName/:subcategoryName",
  fetchProductsByCategoryAndSubcategoryName
);
// Fetch Products by Category and Subcategory ID
router.get(
  "/products/id/:categoryId/:subcategoryId",
  fetchProductsByCategoryAndSubcategoryId
);

export default router;
