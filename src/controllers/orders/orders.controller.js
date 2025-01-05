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

// export const createQikinkOrder = async (req, res) => {
//   const accessToken = await qikinkTokenManager.getToken();
//   let session = null;

//   try {
//     // Ensure database connection is ready
//     if (!mongoose.connection.readyState === 1) {
//       throw new Error("Database connection not ready");
//     }

//     // Start session and transaction
//     session = await mongoose.startSession();
//     session.startTransaction({
//       readConcern: { level: "snapshot" },
//       writeConcern: { w: "majority" },
//       readPreference: "primary",
//     });

//     const {
//       orderItems, // Array of items
//       deliveryAddress,
//       customerId,
//       customerName,
//       totalAmount,
//       gateway, // COD or Prepaid
//       shippingCost = 0,
//       box_packing = 0,
//       gift_wrap = 0,
//       rush_order = 0,
//       orderType, // BUY_NOW or CART_CHECKOUT
//     } = req.body;

//     // Validate and check inventory for all products
//     const inventoryChecks = await Promise.all(
//       orderItems.map(async (item) => {
//         console.log("item.productId", item.productId);
//         // Validate product ID
//         if (!mongoose.Types.ObjectId.isValid(item.productId)) {
//           throw new Error(`Invalid product ID format: ${item.productId}`);
//         }

//         // Find product with lean for performance
//         const product = await Product.findById(item.productId)
//           .session(session)
//           .select("id name price stock sku")
//           .lean();
//         // console.log("product", product);
//         if (!product) {
//           throw new Error(`Product with ID ${item.productId} not found`);
//         }

//         // Parse color and size from product SKU
//         const { color, size } = parseColorAndSize(product.sku);

//         // Check stock
//         if (product.stock < item.quantity) {
//           throw new Error(
//             `Insufficient stock for product ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`
//           );
//         }

//         // Verify price matches
//         if (product.price !== item.price) {
//           throw new Error(
//             `Price mismatch for product ${product.name}. Expected: ${product.price}, Received: ${item.price}`
//           );
//         }

//         return {
//           ...product,
//           color,
//           size,
//           requestedQuantity: item.quantity,
//           sku: product.sku,
//         };
//       })
//     );

//     // Update stock for all products
//     await Promise.all(
//       inventoryChecks.map(async (product) => {
//         const result = await Product.updateOne(
//           {
//             _id: product._id,
//             stock: { $gte: product.requestedQuantity },
//           },
//           {
//             $inc: { stock: -product.requestedQuantity },
//           },
//           { session }
//         );

//         if (result.modifiedCount !== 1) {
//           throw new Error(`Failed to update stock for product ${product.name}`);
//         }
//       })
//     );
//     const count = await mongoose.model("Order").countDocuments();
//     // Prepare Qikink order payload
//     const qikinkOrderPayload = {
//       order_number: `ORD${(count + 1).toString().padStart(2, "0")}`,
//       qikink_shipping: "1", // Qikink handles shipping
//       gateway: gateway, // COD or PREPAID
//       total_order_value: totalAmount.toString(),
//       line_items: inventoryChecks.map((product) => ({
//         search_from_my_products: 1,
//         quantity: product.requestedQuantity.toString(),
//         sku: product.sku,
//         price: product.price.toString(),
//       })),
//       add_ons: [
//         {
//           box_packing: box_packing,
//           gift_wrap: gift_wrap,
//           rush_order: rush_order,
//           custom_letter: 0,
//         },
//       ],
//       shipping_address: {
//         first_name: deliveryAddress.firstName,
//         last_name: deliveryAddress.lastName || "",
//         address1: `${deliveryAddress.doorNo} ${deliveryAddress.address}`,
//         phone: deliveryAddress.phone,
//         email: deliveryAddress.email,
//         city: deliveryAddress.city,
//         zip: deliveryAddress.zipCode,
//         province: deliveryAddress.state,
//         country_code: "IN",
//       },
//     };

//     // Log the Qikink order payload
//     console.log("Qikink Order Payload:", qikinkOrderPayload);
//     // Qikink API configuration
//     const config = {
//       method: "post",
//       maxBodyLength: Infinity,
//       url: "https://api.qikink.com/api/order/create",
//       headers: {
//         ClientId: process.env.QIKINK_CLIENT_ID,
//         Accesstoken: accessToken,
//         "Content-Type": "application/json", // Explicitly set content type
//       },
//       data: JSON.stringify(qikinkOrderPayload),
//     };

//     // Send order to Qikink
//     const qikinkResponse = await axios(config);

//     // Create and save the order
//     const order = new Order({
//       items: inventoryChecks.map((product) => ({
//         productId: product.id,
//         productName: product.name,
//         quantity: product.requestedQuantity,
//         price: product.price,
//         size: product.size,
//       })),
//       deliveryAddress: {
//         fullName: `${deliveryAddress.firstName} ${deliveryAddress.lastName}`,
//         email: deliveryAddress.email,
//         phone: deliveryAddress.phone,
//         doorNo: deliveryAddress.doorNo,
//         street: deliveryAddress.address,
//         city: deliveryAddress.city,
//         state: deliveryAddress.state,
//         pincode: deliveryAddress.zipCode,
//       },
//       customerId,
//       customerName,
//       totalAmount,
//       orderId: qikinkOrderPayload.order_number,
//       qikinkOrderId: qikinkResponse.data.order_id,
//       status: "pending",
//       orderType,
//       awbNo: qikinkResponse.data.awb_number || null,
//     });

//     await order.save({ session });

//     // Commit the transaction
//     await session.commitTransaction();

//     res.status(201).json({
//       success: true,
//       orderId: order.orderId,
//       qikinkOrderId: qikinkResponse.data.order_id,
//       message: "Order created successfully",
//       //   qikinkResponse: qikinkResponse.data,
//     });
//   } catch (error) {
//     // Abort transaction if it exists
//     if (session && session.inTransaction()) {
//       try {
//         await session.abortTransaction();
//       } catch (abortError) {
//         console.error("Error aborting transaction:", abortError);
//       }
//     }

//     // Error response
//     console.error("Error placing order:", error);
//     res.status(error.response?.status || 400).json({
//       success: false,
//       error: "Failed to place order",
//       message: error.response?.data?.message || error.message,
//     });
//   } finally {
//     // End session if it exists
//     if (session) {
//       try {
//         await session.endSession();
//       } catch (endSessionError) {
//         console.error("Error ending session:", endSessionError);
//       }
//     }
//   }
// };

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

    if (!orderItems || !Array.isArray(orderItems)) {
      throw new Error("Order items are required and must be an array");
    }

    // Function to create new SKU with given color and size
    const createNewSku = (originalSku, color, size) => {
      const skuParts = originalSku.split("-");
      // Replace color (2nd part) and size (3rd part)
      skuParts[1] = color;
      skuParts[2] = size;
      return skuParts.join("-");
    };

    // Validate and check inventory for all products
    const inventoryChecks = await Promise.all(
      orderItems.map(async (item) => {
        // Validate product ID
        if (!mongoose.Types.ObjectId.isValid(item.productId)) {
          throw new Error(`Invalid product ID format: ${item.productId}`);
        }

        // Find base product
        const product = await Product.findById(item.productId)
          .session(session)
          .select("id name price stock sku")
          .lean();

        if (!product) {
          throw new Error(`Product with ID ${item.productId} not found`);
        }

        // Create new SKU using color and size from frontend
        const newSku = createNewSku(product.sku, item.color, item.size);
        console.log(`Original SKU: ${product.sku}, New SKU: ${newSku}`);

        // Check stock
        if (product.stock < parseInt(item.quantity)) {
          throw new Error(
            `Insufficient stock for product ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`
          );
        }

        return {
          ...product,
          color: item.color,
          size: item.size,
          requestedQuantity: parseInt(item.quantity),
          sku: newSku,
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

    // Create order number
    const orderNumber = `ORD${(count + 1).toString().padStart(4, "0")}`;

    // Transform inventoryChecks into Qikink line_items format
    const line_items = inventoryChecks.map((product) => ({
      search_from_my_products: 1,
      quantity: product.requestedQuantity.toString(),
      price: product.price.toString(),
      sku: product.sku,
    }));

    // Prepare Qikink order payload
    const qikinkOrderPayload = {
      order_number: orderNumber,
      qikink_shipping: "1",
      gateway,
      total_order_value: totalAmount.toString(),
      line_items,
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
        zip: deliveryAddress.zipCode,
        province: deliveryAddress.state,
        country_code: "IN",
      },
    };

    // Log the Qikink order payload for debugging
    console.log(
      "Qikink Order Payload:",
      JSON.stringify(qikinkOrderPayload, null, 2)
    );

    // Send order to Qikink
    const config = {
      method: "post",
      maxBodyLength: Infinity,
      url: "https://api.qikink.com/api/order/create",
      headers: {
        ClientId: process.env.QIKINK_CLIENT_ID,
        Accesstoken: accessToken,
        "Content-Type": "application/json",
      },
      data: JSON.stringify(qikinkOrderPayload),
    };

    const qikinkResponse = await axios(config);

    // Create and save the order
    const order = new Order({
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
        pincode: deliveryAddress.zipCode,
      },
      customerId,
      customerName,
      totalAmount,
      orderId: orderNumber,
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

    console.error("Error placing order:", error);
    res.status(error.response?.status || 400).json({
      success: false,
      error: "Failed to place order",
      message: error.response?.data?.message || error.message,
    });
  } finally {
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
