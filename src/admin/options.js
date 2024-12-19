import componentLoader from "./component-loader.js";
import { User, Admin } from "../models/User.js";
import { dark, light, noSidebar } from "@adminjs/themes";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import Category from "../models/Category.js";
import Reviews from "../models/Reviews.js";
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
        ],
        filterProperties: ["createdAt", "status"],
        editProperties: ["status"],
        properties: {
          status: {
            type: "string",
            availableValues: [
              { value: "pending", label: "Pending" },
              { value: "shipped", label: "Shipped" },
              { value: "delivered", label: "Delivered" },
              { value: "cancelled", label: "Canceled" },
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
  ],
  databases: [],
  branding: {
    companyName: "My E-commerce",
    withMadeWithLove: false,
    favicon: "https://www.iconpacks.net/icons/2/free-store-icon-2017-thumb.png",
  },
};
export default options;
