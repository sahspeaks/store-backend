import mongoose from "mongoose";
import Category from "./src/models/Category.js";
import Product from "./src/models/Product.js";
import dotenv from "dotenv";

async function populateCategories() {
  dotenv.config({
    path: "./.env",
  });
  // Connect to MongoDB (replace with your connection string)
  console.log("Connecting to database...", process.env.DATABASE_URL);
  await mongoose.connect(process.env.DATABASE_URL);

  try {
    // Check if categories already exist
    const existingCategories = await Category.countDocuments();
    if (existingCategories > 0) {
      console.log("Categories already populated. Skipping initialization.");
      return;
    }
    // Create top-level categories
    const menClothing = await Category.createCategory("Men's Clothing");
    const womenClothing = await Category.createCategory("Women's Clothing");
    const kidsClothing = await Category.createCategory("Kid's Clothing");
    const newlyAdded = await Category.createCategory("Newly Added");

    //Newly Added Subcategories
    const newlyAddedSubcategories = [
      "Varsity Jacket",
      "Acid Wash Oversized Classic Tshirt",
      "Acid wash hooded Sweatshirt",
      "Women’s Raglan T-shirt",
      "Unisex Supima T-shirt ",
    ];
    const newlyAddedSubcategoriesDocs = await Promise.all(
      newlyAddedSubcategories.map((subcategory) =>
        Category.createCategory(subcategory, "Newly Added")
      )
    );
    // Men's Clothing Subcategories
    const menSubcategories = [
      "Unisex T-Shirt Classic",
      "Oversized Classic T-Shirt",
      "Hooded SweatShirt",
      "Oversized Standard T Shirt",
      "Polo T-Shirts",
      "Unisex Sweatshirt",
      "Unisex Standard T-Shirt",
      "Unisex Joggers",
      "Longline Curved T-Shirt",
      "Full Sleeve T-Shirt",
    ];

    const menSubcategoryDocs = await Promise.all(
      menSubcategories.map((subcategory) =>
        Category.createCategory(subcategory, "Men's Clothing")
      )
    );

    // Women's Clothing Subcategories
    const womenSubcategories = [
      "Women's T-Shirts",
      "Crop Tops",
      "Crop Tank",
      "Crop Hoodies",
      "T-Shirt Dress",
      "Maternity T-Shirts",
      "Women's Tank Top",
      "3/4th Sleeve T-Shirt",
    ];

    const womenSubcategoryDocs = await Promise.all(
      womenSubcategories.map((subcategory) =>
        Category.createCategory(subcategory, "Women's Clothing")
      )
    );

    // Kids' Clothing Subcategories
    const kidsSubcategories = [
      "Boys T-Shirt",
      "Girls T-Shirt",
      "Kids Sweatshirt",
      "Kids Rompers",
    ];

    const kidsSubcategoryDocs = await Promise.all(
      kidsSubcategories.map((subcategory) =>
        Category.createCategory(subcategory, "Kid's Clothing")
      )
    );

    console.log("Categories populated successfully");

    // Function to create sample products (you'll want to customize this)
    // async function createSampleProducts(subcategories, topLevelCategory) {
    //   for (let subcategory of subcategories) {
    //     await Product.create({
    //       id: `PROD-${subcategory.replace(/\s+/g, "-").toUpperCase()}`,
    //       name: subcategory,
    //       details: ["Sample detail 1", "Sample detail 2"],
    //       description: `${subcategory} - High-quality comfortable clothing`,
    //       category: subcategory._id,
    //       price: Math.floor(Math.random() * 50) + 10, // Random price between 10-60
    //       size: "M", // Default size
    //       stock: Math.floor(Math.random() * 100), // Random stock between 0-100
    //       image: "sample-image-url.jpg",
    //       addImages: ["additional-image-1.jpg", "additional-image-2.jpg"],
    //     });
    //   }
    // }

    // // Create sample products for each category
    // await createSampleProducts(menSubcategoryDocs, menClothing);
    // await createSampleProducts(womenSubcategoryDocs, womenClothing);
    // await createSampleProducts(kidsSubcategoryDocs, kidsClothing);
    // await createSampleProducts(newlyAddedSubcategoriesDocs, newlyAdded);

    // console.log("Sample products created successfully");
  } catch (error) {
    console.error("Error populating categories and products:", error);
  } finally {
    await mongoose.connection.close();
  }
}

// Run the population script
populateCategories();

export default populateCategories;
