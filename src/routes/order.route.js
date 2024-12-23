import express from "express";
import {
  createQikinkOrder,
  getQikinkOrderById,
  getOrdersByCustomer,
  trackOrderStatus,
} from "../controllers/orders/orders.controller.js";
const router = express.Router();

// Create a new Qikink order
router.post("/qikink/order", createQikinkOrder);
router.get("/qikink/getorder", getQikinkOrderById);
router.get("/orders/:customerId", getOrdersByCustomer);
router.get("/track-order/:qikinkOrderId", trackOrderStatus);

export default router;
