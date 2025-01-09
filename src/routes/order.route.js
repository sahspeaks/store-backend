import express from "express";
import {
  createQikinkOrder,
  getQikinkOrderById,
  getOrdersByCustomer,
  trackOrderStatus,
  postPayment,
} from "../controllers/orders/orders.controller.js";
import {
  initializePayment,
  processRazorpayOrder,
} from "../controllers/orders/razorpay.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

// Create a new Qikink order
router.post("/qikink/order", verifyToken, createQikinkOrder);
router.get("/qikink/getorder", verifyToken, getQikinkOrderById);
router.get("/orders/:customerId", verifyToken, getOrdersByCustomer);
router.get("/track-order/:qikinkOrderId", verifyToken, trackOrderStatus);
router.post("/qikink/payment-complete", verifyToken, postPayment);
// Razorpay payment routes
router.post("/razorpay/initiate-payment", verifyToken, initializePayment);
router.post("/razorpay/process-order", verifyToken, processRazorpayOrder);

export default router;
