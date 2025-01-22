import componentLoader from "./component-loader.js";
import { User, Admin } from "../models/User.js";
import { dark, light, noSidebar } from "@adminjs/themes";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import Category from "../models/Category.js";
import Reviews from "../models/Reviews.js";
import { Wishlist } from "../models/Wishlist.js";
const options = {
  componentLoader,
  rootPath: "/admin",
  defaultTheme: dark.id,
  availableThemes: [dark, light, noSidebar],
  resources: [
    {
      resource: User,
      options: {
        listProperties: ["email", "firstName", "lastName"],
        filterProperties: ["email", "firstName", "lastName"],
      },
    },
    {
      resource: Admin,
      options: {
        listProperties: ["email"],
        filterProperties: ["email"],
      },
    },
    {
      resource: Product,
      options: {
        listProperties: ["name", "size", "price", "stock", "category"],
        filterProperties: ["stock", "size", "price", "category"],
      },
    },
    {
      resource: Order,
      options: {
        listProperties: [
          "items",
          "customerName",
          "totalAmount",
          "orderId",
          "paymentId",
          "awbNo",
          "status",
          "paymentStatus",
          "paymentMethod",
        ],
        filterProperties: ["createdAt", "status"],
        editProperties: ["status", "paymentStatus"],
        properties: {
          status: {
            type: "string",
            availableValues: [
              { value: "CREATED", label: "CREATED" },
              { value: "CONFIRMED", label: "CONFIRMED" },
              { value: "PAYMENT_FAILED", label: "PAYMENT_FAILED" },
              { value: "PROCESSING", label: "PROCESSING" },
              { value: "SHIPPED", label: "SHIPPED" },
              { value: "DELIVERED", label: "DELIVERED" },
              { value: "CANCELLED", label: "CANCELLED" },
              { value: "DISPUTED", label: "DISPUTED" },
              { value: "REFUNDED", label: "REFUNDED" },
            ],
          },
          paymentStatus: {
            type: "string",
            availableValues: [
              { value: "PENDING", label: "PENDING" },
              { value: "PAID", label: "PAID" },
              { value: "FAILED", label: "FAILED" },
              { value: "REFUNDED", label: "REFUNDED" },
              { value: "COD", label: "COD" },
            ],
          },
        },
        sort: { direction: "asc", sortBy: "createdAt" },
      },
    },
    {
      resource: Category,
      options: {
        listProperties: [
          "name",
          "description",
          "parentCategory",
          "subcategories",
          "level",
        ],
        filterProperties: ["name", "description", "parentCategory", "level"],
      },
    },
    {
      resource: Reviews,
      options: {
        listProperties: ["user", "rating", "comment", "product"],
        filterProperties: ["rating", "comment", "product"],
      },
    },
    {
      resource: Wishlist,
      options: {
        listProperties: ["user", "products"],
        filterProperties: ["user", "products"],
      },
    },
  ],
  databases: [],
  branding: {
    companyName: "My E-commerce",
    withMadeWithLove: false,
    favicon: "https://www.iconpacks.net/icons/2/free-store-icon-2017-thumb.png",
  },
};
export default options;
