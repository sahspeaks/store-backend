import axios from "axios";
import mongoose from "mongoose";
import Order from "../../models/Order.js";
import Product from "../../models/Product.js";
import qikinkTokenManager from "../../../tokenManager.js";
import Razorpay from "razorpay";

//COD order controller
//new order controller
export const createQikinkOrder = async (req, res) => {
  let session = null;

  try {
    session = await mongoose.startSession();

    const result = await session.withTransaction(async () => {
      const accessToken = await qikinkTokenManager.getToken();
      const {
        orderItems,
        deliveryAddress,
        customerId,
        customerName,
        totalAmount,
        gateway,
        box_packing = 0,
        gift_wrap = 0,
        rush_order = 0,
        orderType,
      } = req.body;

      if (!orderItems?.length) {
        throw new Error("Order items are required");
      }

      // First database operation to establish transaction
      const count = await Order.countDocuments().session(session);
      const orderNumber = `ORD${(count + 1).toString().padStart(4, "0")}`;

      // Function to create new SKU
      const createNewSku = (originalSku, color, size) => {
        const skuParts = originalSku.split("-");
        skuParts[1] = color;
        skuParts[2] = size;
        return skuParts.join("-");
      };

      // Sequential product lookup to avoid transaction conflicts
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

      // Now we can do parallel stock updates
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

      const qikinkOrderPayload = {
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
      };

      // console.log(qikinkOrderPayload);

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

      //chain order careation once qikink order is created
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
            paymentStatus: "COD",
            paymentMethod: "COD",
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
        message: "COD Order created successfully",
      };
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(400).json({
      success: false,
      error: "Failed to place order",
      message: error.message,
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

export const getQikinkOrderById = async (req, res) => {
  const accessToken = await qikinkTokenManager.getToken();
  const { qikinkOrderId } = req.body;
  // console.log("qikinkOrderId", qikinkOrderId);
  try {
    const config = {
      method: "get",
      maxBodyLength: Infinity,
      url: `https://api.qikink.com/api/order?id=${qikinkOrderId}`,
      headers: {
        ClientId: process.env.QIKINK_CLIENT_ID,
        Accesstoken: accessToken,
      },
    };
    // Send order to Qikink
    const qikinkResponse = await axios(config);
    const qikinkResponseData = qikinkResponse.data;
    // console.log("qikinkResponse", qikinkResponseData);

    res.status(200).json({ success: true, qikinkResponseData });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const postPayment = async (req, res) => {
  try {
    // Verify the Razorpay webhook signature
    const { orderId, paymentId, razorpayOrderId } = req.body;
    console.log("Received payment completion webhook:", req.body);
    // console.log("Received payment completion webhook:", req.body);

    // Find the order in the database
    const order = await Order.findOneAndUpdate(
      { qikinkOrderId: orderId }, // query
      {
        $set: {
          paymentId: paymentId,
          razorpayOrderId: razorpayOrderId,
        },
      }, // update
      { new: true } // options
    );
    // Create items summary for email body
    // const itemsSummary = order.orderItems
    //   .map(
    //     (item) =>
    //       `- ${item.productName} (Quantity: ${item.quantity}, Price: ₹${item.price})`
    //   )
    //   .join("\n");
    // //send email to admin
    // const transporter = nodemailer.createTransport({
    //   service: "gmail",
    //   host: "smtp.gmail.com",
    //   port: 465,
    //   secure: true,
    //   auth: {
    //     user: process.env.EMAIL_USER,
    //     pass: process.env.EMAIL_PASS,
    //   },
    // });

    // const mailOptions = {
    //   from: {
    //     name: "MY STB",
    //     address: process.env.EMAIL_USER,
    //   },
    //   to: process.env.EMAIL_USER,
    //   subject: `A New Order ${order.orderId} has been placed`,
    //   text:
    //     `A new order has been processed.\n\n` +
    //     `Order ID: ${orderId}\n` +
    //     `Items Ordered:\n${itemsSummary}\n\n` +
    //     `Total Amount: ₹${order.totalAmount}\n\n` +
    //     `Shipping Details:\n` +
    //     `${order.deliveryAddress.fullName}\n` +
    //     `${order.deliveryAddress.doorNo}, ${order.deliveryAddress.street}\n` +
    //     `${order.deliveryAddress.city}, ${order.deliveryAddress.state} - ${order.deliveryAddress.pincode}\n` +
    //     `Phone: ${order.deliveryAddress.phone}\n` +
    //     `Email: ${order.deliveryAddress.email}`,
    // };

    // await transporter.sendMail(mailOptions, (error, info) => {
    //   if (error) {
    //     return console.error("Error sending email:", error);
    //   }
    //   // console.log("Email sent:", info.response);
    // });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res
      .status(200)
      .json({ message: "Payment completed successfully", data: order });
  } catch (error) {
    console.error("Error processing payment:", error);
    res.status(500).json({
      error: "Error processing payment",
      details: error.message,
    });
  }
};

// create me a controller for getting all orders placed by a customer with specific orderId
export const getOrdersByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const orders = await Order.find({ customerId });
    res.status(200).json({
      success: true,
      message: "Orders fetched successfully",
      orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to get orders",
      message: error.message,
    });
  }
};

export const trackOrderStatus = async (req, res) => {
  const accessToken = await qikinkTokenManager.getToken();
  const { qikinkOrderId } = req.params;

  try {
    const config = {
      method: "get",
      maxBodyLength: Infinity,
      url: `https://api.qikink.com/api/order?id=${qikinkOrderId}`,
      headers: {
        ClientId: process.env.QIKINK_CLIENT_ID,
        Accesstoken: accessToken,
      },
    };

    // Send request to Qikink
    const qikinkResponse = await axios(config);
    const qikinkResponseData = qikinkResponse.data;

    // console.log(
    //   "Full API Response:",
    //   JSON.stringify(qikinkResponseData, null, 2)
    // );

    // Ensure the response is an array and access the first element
    const orderData = Array.isArray(qikinkResponseData)
      ? qikinkResponseData[0]
      : null;

    if (!orderData) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    const shipping = orderData.shipping;

    if (!shipping) {
      res.status(200).json({
        success: false,
        message: "Shipping information is unavailable",
      });
      return;
    }

    const trackingLink = shipping.tracking_link;
    const awb = shipping.awb;

    if (trackingLink && awb) {
      const fullTrackingLink = `${trackingLink}${awb}`;
      res.status(200).json({
        success: true,
        trackingLink: fullTrackingLink,
      });
    } else {
      res.status(200).json({
        success: false,
        message: "Tracking link or AWB not available",
        details: { trackingLink, awb },
      });
    }
  } catch (error) {
    console.error("Error fetching tracking link:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
