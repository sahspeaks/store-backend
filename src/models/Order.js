import mongoose from "mongoose";

//orderItem schema
const orderItemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  size: { type: String, required: true },
  color: { type: String, required: true },
  sku: { type: String, required: true },
});

//delivery address schema
const deliveryAddressSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String },
  phone: { type: String, required: true },
  doorNo: { type: String, required: true },
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  landmark: { type: String },
});

// Order schema and model
const orderSchema = new mongoose.Schema(
  {
    items: [orderItemSchema],
    deliveryAddress: deliveryAddressSchema,
    customerId: {
      type: String,
      required: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    totalAmount: { type: Number, required: true },
    orderId: { type: String, unique: true, required: true },
    qikinkOrderId: { type: String },
    razorpayOrderId: { type: String },
    paymentId: { type: String },
    awbNo: { type: String },
    status: {
      type: String,
      enum: ["pending", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    orderType: {
      type: String,
      enum: ["BUY_NOW", "CART_CHECKOUT"],
    },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;
