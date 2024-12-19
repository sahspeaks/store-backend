import express from "express";
import {
  fetchTopLevelCategories,
  fetchSubcategoriesWithCategories,
  fetchAllSubcategories,
  findSubcategoriesByCategory,
  findSubcategoriesByCategoryId,
} from "../controllers/Category/category.controller.js";

const router = express.Router();

router.get("/top-categories", fetchTopLevelCategories);
router.get("/subcategories", fetchSubcategoriesWithCategories);
router.get("/all-subcategories", fetchAllSubcategories);
// Find subcategories by category name
router.get("/subcategories/:categoryName", findSubcategoriesByCategory);
// Find subcategories by category ID
router.get("/subcategories/id/:categoryId", findSubcategoriesByCategoryId);

export default router;
