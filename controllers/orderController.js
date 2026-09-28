import prisma from "../config/prisma.js";
import { sendEmail } from "../services/emailService.js";

export const createOrder = async (req, res) => {
  try {
    const { fullName, phone, city, address, paymentMethod, items } = req.body;

    if (!fullName || !phone || !city || !address || !paymentMethod) {
      return res.status(400).json({
        message: "All checkout fields are required",
      });
    }

    if (paymentMethod !== "COD") {
      return res.status(400).json({
        message: "Invalid payment method",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Your cart is empty",
      });
    }

    const customer = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    const productIds = items.map((item) => Number(item.productId));

    if (
      productIds.some(
        (productId) => !Number.isInteger(productId) || productId <= 0
      )
    ) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    if (
      items.some(
        (item) =>
          !Number.isInteger(Number(item.quantity)) ||
          Number(item.quantity) <= 0
      )
    ) {
      return res.status(400).json({
        message: "Invalid product quantity",
      });
    }

    const uniqueProductIds = [...new Set(productIds)];

    if (uniqueProductIds.length !== productIds.length) {
      return res.status(400).json({
        message: "Duplicate products are not allowed",
      });
    }

    const products = await prisma.product.findMany({
      where: {
        id: {
          in: uniqueProductIds,
        },
        vendor: {
          approvalStatus: "APPROVED",
          storeStatus: "ACTIVE",
        },
      },
    });

    if (products.length !== uniqueProductIds.length) {
      return res.status(400).json({
        message: "One or more products are no longer available",
      });
    }

    const productMap = new Map(
      products.map((product) => [product.id, product])
    );

    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = productMap.get(Number(item.productId));
      const quantity = Number(item.quantity);

      if (quantity > product.stockQuantity) {
        return res.status(400).json({
          message: `${product.name} does not have enough stock`,
        });
      }

      const itemSubtotal = product.price * quantity;

      subtotal += itemSubtotal;

      orderItems.push({
        product,
        quantity,
        unitPrice: product.price,
        subtotal: itemSubtotal,
      });
    }

    const deliveryFee = 200;
    const totalAmount = subtotal + deliveryFee;

    const vendorGroups = new Map();

    for (const item of orderItems) {
      const vendorId = item.product.vendorId;

      if (!vendorGroups.has(vendorId)) {
        vendorGroups.set(vendorId, []);
      }

      vendorGroups.get(vendorId).push(item);
    }

    const orderNumber = `ZNT-${Date.now()}`;

    const order = await prisma.$transaction(
      async (tx) => {
        const createdOrder = await tx.order.create({
          data: {
            orderNumber,
            customerId: customer.id,
            customerName: fullName,
            customerEmail: customer.email,
            customerPhone: phone,
            city,
            shippingAddress: address,
            totalAmount,
            status: "PENDING",
          },
        });

        for (const [vendorId, vendorItems] of vendorGroups) {
          const orderVendor = await tx.orderVendor.create({
            data: {
              orderId: createdOrder.id,
              vendorId,
              status: "PENDING",
            },
          });

          await tx.orderItem.createMany({
            data: vendorItems.map((item) => ({
              orderId: createdOrder.id,
              orderVendorId: orderVendor.id,
              productId: item.product.id,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
            })),
          });
        }

        return createdOrder;
      },
      {
        timeout: 20000,
      }
    );

    const vendorOrders = await prisma.orderVendor.findMany({
      where: {
        orderId: order.id,
      },
      include: {
        vendor: {
          select: {
            businessName: true,
            userId: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        orderItems: {
          include: {
            product: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    for (const vendorOrder of vendorOrders) {
      try {
        await prisma.notification.create({
          data: {
            userId: vendorOrder.vendor.userId,
            title: "New Order Received",
            message: `You have received a new order ${order.orderNumber}`,
            type: "NEW_ORDER",
          },
        });
      } catch (error) {
        console.error("VENDOR NOTIFICATION ERROR:", error);
      }
    }

    void (async () => {
      for (const vendorOrder of vendorOrders) {
        try {
          await sendEmail({
            to: vendorOrder.vendor.user.email,
            subject: "New Order Received - Zentro",
            html: `
              <div style="margin:0;padding:30px 15px;background:#f4f7fa;font-family:Arial,sans-serif;">
                <div style="max-width:650px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">

                  <div style="background:#061525;padding:25px 30px;text-align:center;">
                    <h1 style="margin:0;color:#ffffff;font-size:26px;">Zentro</h1>
                    <p style="margin:8px 0 0;color:#dbe4ec;font-size:14px;">
                      New Order Received
                    </p>
                  </div>

                  <div style="padding:30px;">

                    <h2 style="margin:0 0 10px;color:#061525;font-size:21px;">
                      Hello ${vendorOrder.vendor.user.name},
                    </h2>

                    <p style="margin:0 0 25px;color:#555555;font-size:15px;line-height:1.6;">
                      You have received a new order through Zentro. Please review the order from your vendor dashboard.
                    </p>

                    <div style="background:#f4f7fa;border-radius:8px;padding:15px 18px;margin-bottom:25px;">
                      <p style="margin:0 0 6px;color:#555;font-size:14px;">
                        <strong>Order Number:</strong> ${order.orderNumber}
                      </p>

                      <p style="margin:0;color:#555;font-size:14px;">
                        <strong>Payment Method:</strong> Cash on Delivery
                      </p>
                    </div>

                    <h3 style="margin:0 0 15px;color:#061525;font-size:17px;">
                      Your Order Items
                    </h3>

                    ${vendorOrder.orderItems
                      .map(
                        (item) => `
                          <div style="border-bottom:1px solid #eeeeee;padding:15px 0;">

                            <div style="font-size:15px;font-weight:bold;color:#222222;margin-bottom:6px;">
                              ${item.product.name}
                            </div>

                            <div style="font-size:14px;color:#666666;">
                              Quantity: ${item.quantity}
                            </div>

                            <div style="font-size:14px;color:#666666;margin-top:4px;">
                              Unit Price: Rs. ${item.unitPrice.toLocaleString()}
                            </div>

                            <div style="font-size:14px;color:#222222;font-weight:bold;margin-top:4px;">
                              Subtotal: Rs. ${item.subtotal.toLocaleString()}
                            </div>

                          </div>
                        `
                      )
                      .join("")}

                    <div style="margin-top:25px;background:#fff7ed;border-radius:8px;padding:18px;">
                      <div style="font-size:14px;color:#666666;margin-bottom:6px;">
                        Your Order Total
                      </div>

                      <div style="font-size:24px;font-weight:bold;color:#061525;">
                        Rs. ${vendorOrder.orderItems
                          .reduce((total, item) => total + item.subtotal, 0)
                          .toLocaleString()}
                      </div>
                    </div>

                    <div style="margin-top:25px;padding-top:20px;border-top:1px solid #eeeeee;">
                      <h3 style="margin:0 0 12px;color:#061525;font-size:16px;">
                        Customer Details
                      </h3>

                      <p style="margin:5px 0;color:#555;font-size:14px;">
                        <strong>Name:</strong> ${order.customerName}
                      </p>

                      <p style="margin:5px 0;color:#555;font-size:14px;">
                        <strong>Phone:</strong> ${order.customerPhone}
                      </p>

                      <p style="margin:5px 0;color:#555;font-size:14px;">
                        <strong>City:</strong> ${order.city}
                      </p>

                      <p style="margin:5px 0;color:#555;font-size:14px;">
                        <strong>Address:</strong> ${order.shippingAddress}
                      </p>
                    </div>

                    <div style="margin-top:30px;text-align:center;">
                      <p style="margin:0;color:#666666;font-size:14px;line-height:1.6;">
                        Please log in to your Zentro vendor dashboard to review and process this order.
                      </p>
                    </div>

                  </div>

                  <div style="background:#f4f7fa;padding:18px 30px;text-align:center;">
                    <p style="margin:0;color:#888888;font-size:12px;">
                      © Zentro. All rights reserved.
                    </p>
                  </div>

                </div>
              </div>
            `,
          });
        } catch (error) {
          console.error("VENDOR EMAIL ERROR:", error);
        }
      }

      try {
        await sendEmail({
          to: customer.email,
          subject: `Order Confirmation - ${order.orderNumber}`,
          html: `
            <div style="margin:0;padding:30px 15px;background:#f4f7fa;font-family:Arial,sans-serif;color:#1f2937;">
              <div style="max-width:650px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;">

                <div style="background:#061525;padding:25px 30px;text-align:center;">
                  <h1 style="margin:0;color:#ffffff;font-size:26px;">Zentro</h1>

                  <p style="margin:8px 0 0;color:#dbe4ec;font-size:14px;">
                    Order Confirmation
                  </p>
                </div>

                <div style="padding:30px;">

                  <h2 style="margin:0 0 10px;color:#061525;font-size:22px;">
                    Order Placed Successfully
                  </h2>

                  <p style="margin:0 0 20px;color:#555;font-size:15px;">
                    Hello ${order.customerName},
                  </p>

                  <p style="color:#555;line-height:1.6;">
                    Thank you for shopping with Zentro. Your order has been successfully placed.
                    Here are your order details.
                  </p>

                  <div style="margin:25px 0;padding:18px;background:#f4f7fa;border-radius:8px;">
                    <p style="margin:0 0 8px;">
                      <strong>Order Number:</strong> ${order.orderNumber}
                    </p>

                    <p style="margin:0;">
                      <strong>Payment Method:</strong> Cash on Delivery
                    </p>
                  </div>

                  <h3 style="margin:30px 0 15px;color:#061525;">
                    Your Items
                  </h3>

                  <div>
                    ${vendorOrders
                      .flatMap((vendorOrder) => vendorOrder.orderItems)
                      .map(
                        (item) => `
                          <div style="padding:15px 0;border-bottom:1px solid #e5e7eb;">

                            <div style="font-size:16px;font-weight:bold;color:#061525;">
                              ${item.product.name}
                            </div>

                            <div style="margin-top:6px;color:#666;font-size:14px;">
                              Quantity: ${item.quantity}
                            </div>

                            <div style="margin-top:4px;color:#666;font-size:14px;">
                              Price: Rs. ${item.unitPrice.toLocaleString()}
                            </div>

                            <div style="margin-top:4px;color:#666;font-size:14px;">
                              Subtotal: Rs. ${item.subtotal.toLocaleString()}
                            </div>

                          </div>
                        `
                      )
                      .join("")}
                  </div>

                  <div style="margin-top:25px;padding:18px;background:#f8fafc;border-radius:8px;">

                    <div style="margin-bottom:10px;">
                      <span style="color:#555;">Items Subtotal</span>

                      <strong style="float:right;">
                        Rs. ${(order.totalAmount - 200).toLocaleString()}
                      </strong>
                    </div>

                    <div style="margin-bottom:15px;clear:both;">
                      <span style="color:#555;">Delivery Fee</span>

                      <strong style="float:right;">
                        Rs. 200
                      </strong>
                    </div>

                    <div style="border-top:1px solid #d1d5db;padding-top:15px;text-align:right;clear:both;">
                      <span style="font-size:15px;color:#555;">
                        Total Amount
                      </span>

                      <div style="margin-top:5px;font-size:24px;font-weight:bold;color:#061525;">
                        Rs. ${order.totalAmount.toLocaleString()}
                      </div>
                    </div>

                  </div>

                  <div style="margin-top:30px;padding:18px;background:#f4f7fa;border-radius:8px;">
                    <h3 style="margin:0 0 12px;color:#061525;">
                      Delivery Details
                    </h3>

                    <p style="margin:0 0 8px;">
                      <strong>Name:</strong> ${order.customerName}
                    </p>

                    <p style="margin:0 0 8px;">
                      <strong>Phone:</strong> ${order.customerPhone}
                    </p>

                    <p style="margin:0 0 8px;">
                      <strong>City:</strong> ${order.city}
                    </p>

                    <p style="margin:0;">
                      <strong>Address:</strong> ${order.shippingAddress}
                    </p>
                  </div>

                  <div style="margin-top:30px;text-align:center;">
                    <p style="color:#555;line-height:1.6;">
                      Thank you for choosing Zentro. We appreciate your order.
                    </p>
                  </div>

                </div>

                <div style="padding:20px 30px;background:#061525;text-align:center;">
                  <p style="margin:0;color:#dbe4ec;font-size:13px;">
                    Regards,<br>
                    <strong style="color:#ffffff;">Zentro Team</strong>
                  </p>
                </div>

              </div>
            </div>
          `,
        });
      } catch (error) {
        console.error("CUSTOMER EMAIL ERROR:", error);
      }
    })();

    return res.status(201).json({
      message: "Order placed successfully",
      vendorEmails: vendorOrders.map(
        (vendorOrder) => vendorOrder.vendor.user.email
      ),
      customerEmail: customer.email,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        status: order.status,
      },
    });
  } catch (error) {
    console.error("CREATE ORDER ERROR:", error);

    return res.status(500).json({
      message: "Failed to place order",
      error: error.message,
    });
  }
};