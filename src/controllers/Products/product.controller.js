import Product from "../../models/Product.js";
import Category from "../../models/Category.js";
import mongoose from "mongoose";

// Fetch All Products with Advanced Filtering and Sorting
export const fetchAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
      minPrice,
      maxPrice,
      searchQuery,
      inStock,
    } = req.query;

    // Build filter object
    const filter = {};

    // Price range filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // In-stock filter
    if (inStock === "true") {
      filter.stock = { $gt: 0 };
    } else if (inStock === "false") {
      filter.stock = 0;
    }

    // Search query filter
    if (searchQuery) {
      filter.$or = [
        { name: { $regex: searchQuery, $options: "i" } },
        { description: { $regex: searchQuery, $options: "i" } },
        { sku: { $regex: searchQuery, $options: "i" } },
      ];
    }

    // Pagination and sorting
    const pageNumber = Math.max(1, Number(page));
    const limitNumber = Math.max(1, Number(limit));
    const sortOptions = {
      [sortBy]: sortOrder === "asc" ? 1 : -1,
    };

    // Fetch products with advanced filtering
    const products = await Product.find(filter)
      .sort(sortOptions)
      .populate("category", "name description level")
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    // Get total count for pagination metadata
    const totalProducts = await Product.countDocuments(filter);

    res.status(200).json({
      success: true,
      products,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalProducts / limitNumber),
      totalProducts,
      totalFiltered: products.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching products",
      error: error.message,
    });
  }
};

// Fetch Product by ID with Comprehensive Details
export const fetchProductById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    // Find product and populate related data with more details
    const product = await Product.findById(id)
      .populate({
        path: "category",
        select: "name description level parentCategory",
        populate: {
          path: "parentCategory",
          select: "name",
        },
      })
      .populate({
        path: "reviews",
        select: "rating comment user createdAt",
        options: { limit: 5, sort: { createdAt: -1 } },
      });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching product",
      error: error.message,
    });
  }
};

// Fetch Products by Category with Advanced Options
export const fetchProductByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
      minPrice,
      maxPrice,
    } = req.query;

    // Validate MongoDB ObjectId for category
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    // Verify top-level category exists
    const topLevelCategory = await Category.findOne({
      _id: categoryId,
      level: 1,
    });

    if (!topLevelCategory) {
      return res.status(404).json({
        success: false,
        message: "Top-level category not found",
      });
    }

    // Find all subcategories under this top-level category
    const subcategories = await Category.find({
      parentCategory: categoryId,
    }).select("_id");

    // Create an array of subcategory IDs (including the top-level category)
    const categoryIds = [
      categoryId,
      ...subcategories.map((subcat) => subcat._id),
    ];

    // Build filter object
    const filter = { category: { $in: categoryIds } };

    // Price range filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // Pagination and sorting
    const pageNumber = Math.max(1, Number(page));
    const limitNumber = Math.max(1, Number(limit));
    const sortOptions = {
      [sortBy]: sortOrder === "asc" ? 1 : -1,
    };

    // Find products in the specified category and its subcategories
    const products = await Product.find(filter)
      .sort(sortOptions)
      .populate({
        path: "category",
        populate: {
          path: "parentCategory",
          select: "name",
        },
      })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    // Get total count for pagination metadata
    const totalProducts = await Product.countDocuments(filter);

    res.status(200).json({
      success: true,
      category: {
        id: topLevelCategory._id,
        name: topLevelCategory.name,
        description: topLevelCategory.description,
      },
      subcategoryCount: subcategories.length,
      products,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalProducts / limitNumber),
      totalProducts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching products by top-level category",
      error: error.message,
    });
  }
};

// Fetch Products by Subcategory
export const fetchProductBySubcategory = async (req, res) => {
  try {
    const { subcategoryId } = req.params;
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Validate MongoDB ObjectId for subcategory
    if (!mongoose.Types.ObjectId.isValid(subcategoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subcategory ID",
      });
    }

    // Verify subcategory exists
    const subcategory = await Category.findOne({
      _id: subcategoryId,
      level: { $gt: 1 },
    });

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found",
      });
    }

    // Pagination and sorting
    const pageNumber = Math.max(1, Number(page));
    const limitNumber = Math.max(1, Number(limit));
    const sortOptions = {
      [sortBy]: sortOrder === "asc" ? 1 : -1,
    };

    // Find products in the specified subcategory
    const products = await Product.find({ category: subcategoryId })
      .sort(sortOptions)
      .populate({
        path: "category",
        populate: {
          path: "parentCategory",
          select: "name",
        },
      })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    // Get total count for pagination metadata
    const totalProducts = await Product.countDocuments({
      category: subcategoryId,
    });

    res.status(200).json({
      success: true,
      subcategory: {
        id: subcategory._id,
        name: subcategory.name,
        parentCategory: subcategory.parentCategory,
      },
      products,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalProducts / limitNumber),
      totalProducts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching products by subcategory",
      error: error.message,
    });
  }
};