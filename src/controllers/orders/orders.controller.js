import axios from "axios";
import mongoose from "mongoose";
import Order from "../../models/Order.js";
import Product from "../../models/Product.js";
import qikinkTokenManager from "../../../tokenManager.js";
// Function to parse SKU for color and size
function parseColorAndSize(sku) {
  // Assuming SKU format: ProductName-Color-ClothMaterial-Size-DesignCode-PrintLocation-PrintType
  // Example: MRnHs-Pu-S-Floral_A_1-Bk-dtf
  const skuParts = sku.split("-");
  return {
    color: skuParts[1],
    size: skuParts[2],
  };
}

export const createQikinkOrder = async (req, res) => {
  const accessToken = await qikinkTokenManager.getToken();
  let session = null;

  try {
    // Ensure database connection is ready
    if (!mongoose.connection.readyState === 1) {
      throw new Error("Database connection not ready");
    }

    // Start session and transaction
    session = await mongoose.startSession();
    session.startTransaction({
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" },
      readPreference: "primary",
    });

    const {
      orderItems, // Array of items
      deliveryAddress,
      customerId,
      customerName,
      totalAmount,
      gateway, // COD or Prepaid
      shippingCost = 0,
      gift_wrap = 0,
      rush_order = 0,
      orderType, // BUY_NOW or CART_CHECKOUT
    } = req.body;

    // Validate and check inventory for all products
    const inventoryChecks = await Promise.all(
      orderItems.map(async (item) => {
        console.log("item.productId", item.productId);
        // Validate product ID
        if (!mongoose.Types.ObjectId.isValid(item.productId)) {
          throw new Error(`Invalid product ID format: ${item.productId}`);
        }

        // Find product with lean for performance
        const product = await Product.findById(item.productId)
          .session(session)
          .select("id name price stock sku")
          .lean();
        // console.log("product", product);
        if (!product) {
          throw new Error(`Product with ID ${item.productId} not found`);
        }

        // Parse color and size from product SKU
        const { color, size } = parseColorAndSize(product.sku);

        // Check stock
        if (product.stock < item.quantity) {
          throw new Error(
            `Insufficient stock for product ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`
          );
        }

        // Verify price matches
        if (product.price !== item.price) {
          throw new Error(
            `Price mismatch for product ${product.name}. Expected: ${product.price}, Received: ${item.price}`
          );
        }

        return {
          ...product,
          color,
          size,
          requestedQuantity: item.quantity,
          sku: product.sku,
        };
      })
    );

    // Update stock for all products
    await Promise.all(
      inventoryChecks.map(async (product) => {
        const result = await Product.updateOne(
          {
            _id: product._id,
            stock: { $gte: product.requestedQuantity },
          },
          {
            $inc: { stock: -product.requestedQuantity },
          },
          { session }
        );

        if (result.modifiedCount !== 1) {
          throw new Error(`Failed to update stock for product ${product.name}`);
        }
      })
    );
    const count = await mongoose.model("Order").countDocuments();
    // Prepare Qikink order payload
    const qikinkOrderPayload = {
      order_number: "ORD001", //`ORD${(count + 1).toString().padStart(2, "0")}`,
      qikink_shipping: "1", // Qikink handles shipping
      gateway: gateway, // COD or PREPAID
      total_order_value: totalAmount.toString(),
      line_items: inventoryChecks.map((product) => ({
        search_from_my_products: 0,
        quantity: product.requestedQuantity.toString(),
        print_type_id: 17, //required only if search_from_my_products is 0
        sku: product.sku,
        price: product.price.toString(),
        designs: [
          {
            design_code: "Floral_A_1", // You might want to dynamically generate this
            width_inches: "", // Default values, adjust as needed
            height_inches: "",
            placement_sku: "bk",
            design_link: "", // Add design link if available
            mockup_link:
              "https://res.cloudinary.com/dra8tbz4z/image/upload/v1734156258/mock_floral_a.png", // Add mockup link if available
          },
        ],
      })),
      add_ons: [
        {
          box_packing: 0,
          gift_wrap: gift_wrap,
          rush_order: rush_order,
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
        zip: deliveryAddress.zipCode,
        province: deliveryAddress.state,
        country_code: "IN",
      },
    };

    // Log the Qikink order payload
    console.log("Qikink Order Payload:", qikinkOrderPayload);
    // Qikink API configuration
    const config = {
      method: "post",
      maxBodyLength: Infinity,
      url: "https://api.qikink.com/api/order/create",
      headers: {
        ClientId: process.env.QIKINK_CLIENT_ID,
        Accesstoken: accessToken,
        "Content-Type": "application/json", // Explicitly set content type
      },
      data: JSON.stringify(qikinkOrderPayload),
    };

    // Send order to Qikink
    const qikinkResponse = await axios(config);

    // Create and save the order
    const order = new Order({
      items: inventoryChecks.map((product) => ({
        productId: product.id,
        productName: product.name,
        quantity: product.requestedQuantity,
        price: product.price,
        size: product.size,
      })),
      deliveryAddress: {
        fullName: `${deliveryAddress.firstName} ${deliveryAddress.lastName}`,
        email: deliveryAddress.email,
        phone: deliveryAddress.phone,
        doorNo: deliveryAddress.doorNo,
        street: deliveryAddress.address,
        city: deliveryAddress.city,
        state: deliveryAddress.state,
        pincode: deliveryAddress.zipCode,
      },
      customerId,
      customerName,
      totalAmount,
      orderId: qikinkOrderPayload.order_number,
      qikinkOrderId: qikinkResponse.data.order_id,
      status: "pending",
      orderType,
      awbNo: qikinkResponse.data.awb_number || null,
    });

    await order.save({ session });

    // Commit the transaction
    await session.commitTransaction();

    res.status(201).json({
      success: true,
      orderId: order.orderId,
      qikinkOrderId: qikinkResponse.data.order_id,
      message: "Order created successfully",
      //   qikinkResponse: qikinkResponse.data,
    });
  } catch (error) {
    // Abort transaction if it exists
    if (session && session.inTransaction()) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error("Error aborting transaction:", abortError);
      }
    }

    // Error response
    console.error("Error placing order:", error);
    res.status(error.response?.status || 400).json({
      success: false,
      error: "Failed to place order",
      message: error.response?.data?.message || error.message,
    });
  } finally {
    // End session if it exists
    if (session) {
      try {
        await session.endSession();
      } catch (endSessionError) {
        console.error("Error ending session:", endSessionError);
      }
    }
  }
};

export const getQikinkOrderById = async (req, res) => {
  const accessToken = await qikinkTokenManager.getToken();
  const { qikinkOrderId } = req.body;
  console.log("qikinkOrderId", qikinkOrderId);
  try {
    const config = {
      method: "get",
      maxBodyLength: Infinity,
      url: `https://sandbox.qikink.com/api/order?id=${qikinkOrderId}`,
      headers: {
        ClientId: process.env.QIKINK_CLIENT_ID,
        Accesstoken: accessToken,
      },
    };
    // Send order to Qikink
    const qikinkResponse = await axios(config);
    const qikinkResponseData = JSON.stringify(qikinkResponse.data);
    console.log("qikinkResponse", qikinkResponseData);

    res.status(200).json({ success: true, qikinkResponseData });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
