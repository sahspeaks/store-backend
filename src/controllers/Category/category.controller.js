import Category from "../../models/Category.js";
import mongoose from "mongoose";
// Fetch Top-Level Categories
export const fetchTopLevelCategories = async (req, res) => {
  try {
    // Find categories with level 1 (top-level categories)
    const topLevelCategories = await Category.find({
      level: 1,
    }).select("name description");

    res.status(200).json({
      success: true,
      count: topLevelCategories.length,
      data: topLevelCategories,
    });
  } catch (error) {
    console.error("Error fetching top-level categories:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch top-level categories",
      error: error.message,
    });
  }
};

// Find Subcategories for a Given Category
export const findSubcategoriesByCategory = async (req, res) => {
  try {
    const { categoryName } = req.params;

    // Find the parent category
    const parentCategory = await Category.findOne({ name: categoryName });

    // If parent category doesn't exist, return 404
    if (!parentCategory) {
      return res.status(404).json({
        success: false,
        message: `Category "${categoryName}" not found`,
      });
    }

    // Find all subcategories of this category
    const subcategories = await Category.find({
      parentCategory: parentCategory._id,
    }).select("name description thumbnail");

    res.status(200).json({
      success: true,
      parentCategory: {
        name: parentCategory.name,
        id: parentCategory._id,
      },
      count: subcategories.length,
      subcategories: subcategories,
    });
  } catch (error) {
    console.error("Error finding subcategories:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch subcategories",
      error: error.message,
    });
  }
};
// Alternative method to find subcategories by category ID
export const findSubcategoriesByCategoryId = async (req, res) => {
  try {
    const { categoryId } = req.params;

    // Validate category ID
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    // Find the parent category
    const parentCategory = await Category.findById(categoryId);

    // If parent category doesn't exist, return 404
    if (!parentCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Find all subcategories of this category
    const subcategories = await Category.find({
      parentCategory: categoryId,
    }).select("name description");

    res.status(200).json({
      success: true,
      parentCategory: {
        name: parentCategory.name,
        id: parentCategory._id,
      },
      count: subcategories.length,
      subcategories: subcategories,
    });
  } catch (error) {
    console.error("Error finding subcategories:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch subcategories",
      error: error.message,
    });
  }
};
// Fetch Subcategories with Their Parent Categories
export const fetchSubcategoriesWithCategories = async (req, res) => {
  try {
    // Find all categories that have a parent category (level > 1)
    const subcategories = await Category.find({
      level: { $gt: 1 },
    })
      .populate("parentCategory", "name")
      .select("name parentCategory level thumbnail");

    // Group subcategories by their parent category
    const categorizedSubcategories = subcategories.reduce(
      (acc, subcategory) => {
        const parentName = subcategory.parentCategory.name;

        if (!acc[parentName]) {
          acc[parentName] = [];
        }

        acc[parentName].push({
          name: subcategory.name,
          level: subcategory.level,
          thumbnail: subcategory.thumbnail,
        });

        return acc;
      },
      {}
    );

    res.status(200).json({
      success: true,
      data: categorizedSubcategories,
    });
  } catch (error) {
    console.error("Error fetching subcategories:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch subcategories",
      error: error.message,
    });
  }
};

// Fetch All Subcategories
export const fetchAllSubcategories = async (req, res) => {
  try {
    // Find categories with level greater than 1 (subcategories)
    const allSubcategories = await Category.find({
      level: { $gt: 1 },
    })
      .populate("parentCategory", "name")
      .select("name parentCategory level");

    res.status(200).json({
      success: true,
      count: allSubcategories.length,
      data: allSubcategories,
    });
  } catch (error) {
    console.error("Error fetching all subcategories:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch subcategories",
      error: error.message,
    });
  }
};
