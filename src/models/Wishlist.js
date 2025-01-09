import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for faster lookups
wishlistSchema.index({ user: 1 });

// Method to check if product exists in wishlist
wishlistSchema.methods.hasProduct = function (productId) {
  return this.products.some(
    (item) => item.product.toString() === productId.toString()
  );
};

// Method to add product to wishlist
wishlistSchema.methods.addProduct = function (productId) {
  if (!this.hasProduct(productId)) {
    this.products.push({ product: productId });
  }
};

// Method to remove product from wishlist
wishlistSchema.methods.removeProduct = function (productId) {
  this.products = this.products.filter(
    (item) => item.product.toString() !== productId.toString()
  );
};

const Wishlist = mongoose.model("Wishlist", wishlistSchema);

export { Wishlist };
