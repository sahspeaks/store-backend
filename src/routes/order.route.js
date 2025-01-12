import express from "express";
import {
  createQikinkOrder,
  getQikinkOrderById,
} from "../controllers/orders/orders.controller.js";
const router = express.Router();

// Create a new Qikink order
router.post("/qikink/order", createQikinkOrder);
router.get("/qikink/getorder", getQikinkOrderById);

export default router;
