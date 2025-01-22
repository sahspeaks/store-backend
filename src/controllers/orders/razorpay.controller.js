import axios from "axios";
import mongoose from "mongoose";
import Order from "../../models/Order.js";
import Product from "../../models/Product.js";
import qikinkTokenManager from "../../../tokenManager.js";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Step 1: Initialize Razorpay payment
export const initializePayment = async (req, res) => {
  try {
    const { amount } = req.body;
    const count = 1;
    const rzrId = `RAZ${(count + 1).toString().padStart(4, "0")}`;
    // Create Razorpay order
    const razorpayResponse = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: `receipt_order_${rzrId}`,
    });

    res.status(200).json({
      success: true,
      razorpayOrderId: razorpayResponse.id,
      message: "Payment initialized successfully",
    });
  } catch (error) {
    console.error("Payment initialization failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to initialize payment",
    });
  }
};

// Step 2: Process order after successful payment
export const processRazorpayOrder = async (req, res) => {
  let session = null;
  try {
    session = await mongoose.startSession();

    const result = await session.withTransaction(async () => {
      const {
        orderItems,
        deliveryAddress,
        customerId,
        customerName,
        totalAmount,
        gateway,
        paymentId,
        razorpayOrderId,
        box_packing = 0,
        gift_wrap = 0,
        rush_order = 0,
        orderType,
      } = req.body;

      // Verify payment
      const payment = await razorpay.payments.fetch(paymentId);
      if (payment.status !== "captured") {
        throw new Error("Payment verification failed");
      }

      // Check and update inventory
      const inventoryChecks = await checkAndUpdateInventory(
        orderItems,
        session
      );

      // Create Qikink order
      const count = await Order.countDocuments().session(session);
      const orderNumber = `ORD${(count + 1).toString().padStart(4, "0")}`;

      const qikinkOrderPayload = createQikinkOrderPayload(
        orderNumber,
        inventoryChecks,
        deliveryAddress,
        totalAmount,
        gateway,
        box_packing,
        gift_wrap,
        rush_order
      );

      const accessToken = await qikinkTokenManager.getToken();
      const qikinkResponse = await axios({
        method: "post",
        url: "https://api.qikink.com/api/order/create",
        headers: {
          ClientId: process.env.QIKINK_CLIENT_ID,
          Accesstoken: accessToken,
          "Content-Type": "application/json",
        },
        data: qikinkOrderPayload,
      });

      // Create local order
      const order = await Order.create(
        [
          {
            items: inventoryChecks.map((product) => ({
              productId: product._id,
              productName: product.name,
              quantity: product.requestedQuantity,
              price: product.price,
              size: product.size,
              color: product.color,
              sku: product.sku,
            })),
            deliveryAddress: {
              fullName: `${deliveryAddress.firstName} ${deliveryAddress.lastName}`,
              email: deliveryAddress.email,
              phone: deliveryAddress.phone,
              doorNo: deliveryAddress.doorNo,
              street: deliveryAddress.address,
              city: deliveryAddress.city,
              state: deliveryAddress.state,
              pincode: deliveryAddress.pincode,
            },
            customerId,
            customerName,
            totalAmount,
            orderId: orderNumber,
            qikinkOrderId: qikinkResponse.data.order_id,
            status: "CONFIRMED",
            paymentStatus: "PAID",
            paymentMethod: "RAZORPAY",
            paymentId,
            razorpayOrderId,
            orderType,
            awbNo: qikinkResponse.data.awb_number || null,
          },
        ],
        { session }
      );

      return {
        success: true,
        orderId: order[0].orderId,
        qikinkOrderId: qikinkResponse.data.order_id,
        message: "Razorpay order created successfully",
      };
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(400).json({
      success: false,
      error: "Failed to create Razorpay order",
      message: error.message,
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

// Check and update inventory
const checkAndUpdateInventory = async (orderItems, session) => {
  const createNewSku = (originalSku, color, size) => {
    const skuParts = originalSku.split("-");
    skuParts[1] = color;
    skuParts[2] = size;
    return skuParts.join("-");
  };

  const inventoryChecks = [];
  for (const item of orderItems) {
    const product = await Product.findById(item.productId)
      .session(session)
      .select("id name price stock sku")
      .lean();

    if (!product) {
      throw new Error(`Product not found: ${item.productId}`);
    }

    if (product.stock < parseInt(item.quantity)) {
      throw new Error(`Insufficient stock for ${product.name}`);
    }

    inventoryChecks.push({
      ...product,
      color: item.color,
      size: item.size,
      requestedQuantity: parseInt(item.quantity),
      sku: createNewSku(product.sku, item.color, item.size),
    });
  }

  await Promise.all(
    inventoryChecks.map((product) =>
      Product.findOneAndUpdate(
        {
          _id: product._id,
          stock: { $gte: product.requestedQuantity },
        },
        { $inc: { stock: -product.requestedQuantity } },
        { session, new: true }
      )
    )
  );

  return inventoryChecks;
};

const createQikinkOrderPayload = (
  orderNumber,
  inventoryChecks,
  deliveryAddress,
  totalAmount,
  gateway,
  box_packing,
  gift_wrap,
  rush_order
) => ({
  order_number: orderNumber,
  qikink_shipping: "1",
  gateway,
  total_order_value: totalAmount.toString(),
  line_items: inventoryChecks.map((product) => ({
    search_from_my_products: 1,
    quantity: product.requestedQuantity.toString(),
    price: product.price.toString(),
    sku: product.sku,
  })),
  add_ons: [
    {
      box_packing,
      gift_wrap,
      rush_order,
      custom_letter: 0,
    },
  ],
  shipping_address: {
    first_name: deliveryAddress.firstName,
    last_name: deliveryAddress.lastName || "",
    address1: `${deliveryAddress.doorNo} ${deliveryAddress.address}`,
    phone: deliveryAddress.phone,
    email: deliveryAddress.email,
    city: deliveryAddress.city,
    zip: deliveryAddress.pincode,
    province: deliveryAddress.state,
    country_code: "IN",
  },
});
