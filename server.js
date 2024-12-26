//admin js
import express from "express";
import AdminJS from "adminjs";
import { buildAuthenticatedRouter } from "@adminjs/express";
import provider from "./src/admin/auth-provider.js";
import options from "./src/admin/options.js";
import initializeDb from "./src/config/db.js";
import ConnectMongoDBSession from "connect-mongodb-session";
import session from "express-session";

//import packages
import * as dotenv from "dotenv";
import { PORT } from "./src/constants/env.contants.js";
import cors from "cors";
import qikinkTokenManager from "./tokenManager.js";
//import routes
import userRoutes from "./src/routes/user.route.js";
import categoryRoutes from "./src/routes/category.route.js";
import productRoutes from "./src/routes/product.route.js";
import orderRoutes from "./src/routes/order.route.js";

const start = async () => {
  // Initialize Token Manager for Qikink
  await qikinkTokenManager.initialize();

  const app = express();
  // CORS configuration
  const corsOptions = {
    origin: "http://localhost:5173", // Your frontend URL ""  http://localhost:3000
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    optionsSuccessStatus: 200,
  };
  app.use(cors(corsOptions));
  dotenv.config();
  // Initialize AdminJS
  await initializeDb();
  const admin = new AdminJS(options);
  if (process.env.NODE_ENV === "production") {
    await admin.initialize();
  } else {
    admin.watch();
  }
  const MongoDBStore = ConnectMongoDBSession(session);
  console.log(process.env.DATABASE_URL);

  const sessionStore = new MongoDBStore({
    uri: process.env.DATABASE_URL,
    collection: "sessions",
  });
  sessionStore.on("error", (error) => {
    console.log("Session store error", error);
  });
  const isProduction =
    process.env.RENDER === "true" || process.env.NODE_ENV === "production";
  const cookieConfig = {
    cookie: {
      httpOnly: isProduction,
      secure: isProduction,
    },
  };
  const router = buildAuthenticatedRouter(
    admin,
    {
      cookiePassword: process.env.COOKIE_SECRET,
      cookieName: "adminjs",
      provider,
    },
    null,
    {
      store: sessionStore,
      secret: process.env.COOKIE_SECRET,
      saveUninitialized: true,
      resave: true,
      cookieConfig,
      name: "adminjs",
    }
  );
  app.use(admin.options.rootPath, router);
  //middlewares
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  //middlewares
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  //routes
  app.get("/", (req, res) => {
    res.send("Hello World!");
  });
  app.use("/api/v1", userRoutes);
  app.use("/api/v1", categoryRoutes);
  app.use("/api/v1", productRoutes);
  app.use("/api/v1", orderRoutes);
  //start server
  app.listen(PORT, () => {
    console.log(
      `AdminJS available at http://localhost:${PORT}${admin.options.rootPath}`
    );
  });
};

start();
