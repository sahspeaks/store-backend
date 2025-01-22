import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    thumbnail: {
      type: String,
    },
    description: {
      type: String,
      trim: true,
    },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    subcategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    level: {
      type: Number,
      default: 1,
      min: 1,
      max: 3,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to validate category hierarchy
categorySchema.pre("save", function (next) {
  // Ensure subcategories are only added to top-level categories
  if (this.level > 1 && this.subcategories && this.subcategories.length > 0) {
    return next(new Error("Only top-level categories can have subcategories"));
  }
  next();
});

// Static method to create category with optional parent
categorySchema.statics.createCategory = async function (
  name,
  parentName = null,
  description = ""
) {
  try {
    let parentCategory = null;
    let level = 1;

    // If parent category is specified, find it
    if (parentName) {
      parentCategory = await this.findOne({ name: parentName });
      if (!parentCategory) {
        throw new Error(`Parent category "${parentName}" not found`);
      }
      level = parentCategory.level + 1;
    }

    // Create new category
    const category = new this({
      name,
      description,
      parentCategory: parentCategory ? parentCategory._id : null,
      level,
    });

    // If parent exists, add this category to its subcategories
    if (parentCategory) {
      parentCategory.subcategories.push(category._id);
      await parentCategory.save();
    }

    return await category.save();
  } catch (error) {
    throw error;
  }
};

const Category = mongoose.model("Category", categorySchema);
export default Category;
