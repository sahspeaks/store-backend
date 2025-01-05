import express from "express";
import {
  createQikinkOrder,
  getQikinkOrderById,
  getOrdersByCustomer,
  trackOrderStatus,
} from "../controllers/orders/orders.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

// Create a new Qikink order
router.post("/qikink/order", verifyToken, createQikinkOrder);
router.get("/qikink/getorder", verifyToken, getQikinkOrderById);
router.get("/orders/:customerId", verifyToken, getOrdersByCustomer);
router.get("/track-order/:qikinkOrderId", verifyToken, trackOrderStatus);

export default router;
