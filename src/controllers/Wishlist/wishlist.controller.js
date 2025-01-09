import { Wishlist } from "../../models/Wishlist.js";

// Get user's wishlist
const getWishlist = async (req, res) => {
  try {
    const { userId } = req.body;
    const wishlist = await Wishlist.findOne({ user: userId }).populate({
      path: "products.product",
      select: "name price image description details", // adjust fields based on your Product model
    });

    if (!wishlist) {
      // If no wishlist exists, create one
      const newWishlist = await Wishlist.create({
        user: userId,
        products: [],
      });

      return res.status(200).json({
        success: true,
        data: newWishlist,
        message: "Wishlist created successfully",
      });
    }

    return res.status(200).json({
      success: true,
      data: wishlist,
      message: "Wishlist fetched successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Add product to wishlist
const addToWishlist = async (req, res) => {
  try {
    const { productId, userId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    let wishlist = await Wishlist.findOne({ user: userId });

    if (!wishlist) {
      wishlist = await Wishlist.create({
        user: userId,
        products: [{ product: productId }],
      });
    } else {
      if (wishlist.hasProduct(productId)) {
        return res.status(400).json({
          success: false,
          message: "Product already in wishlist",
        });
      }

      wishlist.addProduct(productId);
      await wishlist.save();
    }

    // Fetch updated wishlist with populated products
    wishlist = await Wishlist.findById(wishlist._id).populate({
      path: "products.product",
      select: "name price image description details", // adjust fields based on your Product model
    });

    return res.status(200).json({
      success: true,
      data: wishlist,
      message: "Product added to wishlist",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Remove product from wishlist
const removeFromWishlist = async (req, res) => {
  try {
    const { productId, userId } = req.params;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    const wishlist = await Wishlist.findOne({ user: userId });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found",
      });
    }

    if (!wishlist.hasProduct(productId)) {
      return res.status(404).json({
        success: false,
        message: "Product not found in wishlist",
      });
    }

    wishlist.removeProduct(productId);
    await wishlist.save();

    return res.status(200).json({
      success: true,
      message: "Product removed from wishlist",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Clear wishlist
const clearWishlist = async (req, res) => {
  try {
    const { userId } = req.body;
    const wishlist = await Wishlist.findOne({ user: userId });

    if (!wishlist) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Wishlist not found"));
    }

    wishlist.products = [];
    await wishlist.save();

    return res
      .status(200)
      .json({ success: true, message: "Wishlist cleared successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export { getWishlist, addToWishlist, removeFromWishlist, clearWishlist };
