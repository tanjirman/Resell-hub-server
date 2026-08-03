const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const app = express();
const cors = require("cors");
const port = 5000;
require("dotenv").config();

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = client.db("Resell-Hub");
    const productCollection = db.collection("products");
    const orderCollection = db.collection("orders");
    const wishlistCollection = db.collection("wishlist");
    const userCollection = db.collection("user");
    const paymentCollection = db.collection("payments");


    app.get("/api/products/seller/:email", async (req, res) => {
      try {
        const { email } = req.params;

        const result = await productCollection
          .find({ sellerEmail: email })
          .toArray();

        res.send(result);
      } catch (error) {
        console.log(error);
        res.status(500).send({
          success: false,
          message: "Something went wrong",
        });
      }
      
    });

    // products page

    app.get("/api/products", async (req, res) => {
  const products = await productCollection.find().toArray();
  res.send(products);
});



    app.post("/api/products", async (req, res) => {
      try {
        const {
          title,
          image,
          description,
          category,
          condition,
          price,
          quantity,
          sellerId,
          sellerName,
          sellerEmail,
        } = req.body;

        const product = {
          title,
          category,
          condition,
          price: Number(price),
          quantity: Number(quantity),

          image,
          description,

          sellerId,
          sellerName,
          sellerEmail,

          createdAt: new Date(),
          status: "pending",
        };

        const result = await productCollection.insertOne(product);

        res.status(201).send(result);
      } catch (error) {
        console.log(error);
        res.status(500).send({
          success: false,
          message: "Failed to add product",
        });
      }
    });

    // product details

app.get("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid product id",
      });
    }

    const product = await productCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!product) {
      return res.status(404).send({
        message: "Product not found",
      });
    }

    res.send(product);
  } catch (error) {
    console.log(error);

    res.status(500).send({
      message: "Server Error",
    });
  }
});

    app.patch("/api/products/:id", async (req, res) => {
      try {
        const { id } = req.params;

        const updateData = {
          ...req.body,
          price: Number(req.body.price),
          quantity: Number(req.body.quantity),
          updatedAt: new Date(),
        };

        const result = await productCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData },
        );

        const updatedProduct = await productCollection.findOne({
          _id: new ObjectId(id),
        });

        console.log("Mongo Result:", result);
        console.log("Updated Product:", updatedProduct);

        res.send(updatedProduct);
      } catch (error) {
        console.log(error);
        res.status(500).send({
          success: false,
          message: "Failed to update product",
        });
      }
    });

    // delete product data
    app.delete("/api/products/:id", async (req, res) => {
      try {
        const { id } = req.params;

        const result = await productCollection.deleteOne({
          _id: new ObjectId(id),
        });

        res.send(result);
      } catch (error) {
        console.log(error);

        res.status(500).send({
          success: false,
          message: "Failed to delete product",
        });
      }
    });

    
// Create Order

app.post("/api/orders", async (req, res) => {
  try {
    const {
      buyerId,
      buyerName,
      buyerEmail,
      sellerId,
      sellerName,
      sellerEmail,
      productId,
      quantity = 1,
    } = req.body;

    const product = await productCollection.findOne({
      _id: new ObjectId(productId),
    });

    if (!product) {
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }

    if (product.quantity < quantity) {
      return res.status(400).send({
        success: false,
        message: "Product out of stock",
      });
    }

    const order = {
      buyerId,
      buyerName,
      buyerEmail,

      sellerId,
      sellerName,
      sellerEmail,

      productId: product._id,

      productTitle: product.title,
      productImage: product.image,

      quantity: Number(quantity),

      unitPrice: product.price,
      totalPrice: product.price * Number(quantity),

      status: "Pending",
      paymentStatus: "Pending",

      createdAt: new Date(),
    };

    const result = await orderCollection.insertOne(order);

    await productCollection.updateOne(
      { _id: product._id },
      {
        $inc: {
          quantity: -Number(quantity),
        },
      }
    );

    res.send({
      success: true,
      insertedId: result.insertedId,
      order,
    });
  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      message: "Failed to create order",
    });
  }
});

app.get("/api/orders/buyer/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const orders = await orderCollection
      .find({
        buyerEmail: email,
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.send(orders);
  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      message: "Failed to fetch buyer orders",
    });
  }
});

app.get("/api/orders/seller/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const orders = await orderCollection
      .find({
        sellerEmail: email,
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.send(orders);
  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      message: "Failed to fetch seller orders",
    });
  }
});

app.patch("/api/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await orderCollection.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      }
    );

    res.send(result);
  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      message: "Failed to update order",
    });
  }
});

app.patch("/api/orders/cancel/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const order = await orderCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!order) {
      return res.status(404).send({
        success: false,
        message: "Order not found",
      });
    }

    if (order.status !== "Pending") {
      return res.status(400).send({
        success: false,
        message: "Only pending orders can be cancelled",
      });
    }

    await orderCollection.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: {
          status: "Cancelled",
          updatedAt: new Date(),
        },
      }
    );

    await productCollection.updateOne(
      {
        _id: new ObjectId(order.productId),
      },
      {
        $inc: {
          quantity: order.quantity,
        },
      }
    );

    res.send({
      success: true,
      message: "Order cancelled",
    });
  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      message: "Failed to cancel order",
    });
  }
});

// get user profile

app.get("/api/profile/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const user = await userCollection.findOne({ email });

    if (!user) {
      return res.status(404).send({
        success: false,
        message: "User not found",
      });
    }

    res.send(user);
  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      message: "Failed to fetch profile",
    });
  }
});

// update profile
app.patch("/api/profile/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const { name, image } = req.body;

    const result = await userCollection.updateOne(
      { email },
      {
        $set: {
          name,
          image,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({
        success: false,
        message: "User not found",
      });
    }

    const updatedUser = await userCollection.findOne({ email });

    res.send({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      message: "Failed to update profile",
    });
  }
});

// product wishlist
app.post("/api/wishlist", async (req, res) => {
  try {
    const {
      buyerId,
      buyerName,
      buyerEmail,
      productId,
    } = req.body;

    if (!buyerEmail || !productId) {
      return res.status(400).send({
        success: false,
        message: "Missing required fields",
      });
    }

    if (!ObjectId.isValid(productId)) {
      return res.status(400).send({
        success: false,
        message: "Invalid Product ID",
      });
    }

    const product = await productCollection.findOne({
      _id: new ObjectId(productId),
    });

    if (!product) {
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }

    const alreadyExists = await wishlistCollection.findOne({
      buyerEmail,
      productId,
    });

    if (alreadyExists) {
      return res.send({
        success: false,
        message: "Product already in wishlist",
      });
    }

    const wishlist = {
      buyerId,
      buyerName,
      buyerEmail,

      productId: product._id.toString(),

      productTitle: product.title,
      productImage: product.image,

      category: product.category,
      condition: product.condition,

      price: product.price,

      sellerId: product.sellerId,
      sellerName: product.sellerName,
      sellerEmail: product.sellerEmail,

      createdAt: new Date(),
    };
    

    const result = await wishlistCollection.insertOne(wishlist);

    res.send({
      success: true,
      insertedId: result.insertedId,
    });

  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      message: "Failed to add wishlist",
    });
  }
});


// buyer's wishlist
app.get("/api/wishlist/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const wishlist = await wishlistCollection
      .find({
        buyerEmail: email,
      })
      .sort({
        createdAt: -1,
      })
      .toArray();

    res.send(wishlist);

  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      message: "Failed to fetch wishlist",
    });
  }
});

// Remove Wishlist Item
app.delete("/api/wishlist/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid wishlist id",
      });
    }

    const result = await wishlistCollection.deleteOne({
      _id: new ObjectId(id),
    });

    res.send({
      success: true,
      deletedCount: result.deletedCount,
    });

  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      message: "Failed to remove wishlist item",
    });
  }
});

// Save Payment

app.post("/api/payments", async (req, res) => {
  try {
    const {
      orderId,
      buyerId,
      buyerEmail,
      transactionId,
      amount,
      paymentMethod,
      paymentStatus,
    } = req.body;

    const payment = {
      orderId,
      buyerId,
      buyerEmail,
      transactionId,
      amount: Number(amount),

      paymentMethod: paymentMethod || "Card",
      paymentStatus: paymentStatus || "Paid",

      paymentDate: new Date(),
    };

    const result = await paymentCollection.insertOne(payment);

    // Update order payment status

    await orderCollection.updateOne(
      {
        _id: new ObjectId(orderId),
      },
      {
        $set: {
          paymentStatus: "Paid",
          status: "Confirmed",
          transactionId,
        },
      }
    );

    res.send({
      success: true,
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      message: "Failed to save payment",
    });
  }
});

// Payment History

app.get("/api/payments/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const payments = await paymentCollection
      .find({
        buyerEmail: email,
      })
      .sort({
        paymentDate: -1,
      })
      .toArray();

    res.send(payments);
  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      message: "Failed to fetch payments",
    });
  }
});

// All Payments

app.get("/api/payments", async (req, res) => {
  try {
    const payments = await paymentCollection
      .find()
      .sort({
        paymentDate: -1,
      })
      .toArray();

    res.send(payments);
  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      message: "Failed to fetch payments",
    });
  }
});

// get  single payment
app.get("/api/payment/:id", async (req, res) => {
  try {
    const payment = await paymentCollection.findOne({
      _id: new ObjectId(req.params.id),
    });

    if (!payment) {
      return res.status(404).send({
        success: false,
        message: "Payment not found",
      });
    }

    res.send(payment);
  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      message: "Server Error",
    });
  }
});

// Admin dashboard
// ================= Dashboard Overview =================

app.get("/api/admin/dashboard", async (req, res) => {
  try {
    const totalUsers = await userCollection.countDocuments();

    const totalProducts = await productCollection.countDocuments();

    const totalOrders = await orderCollection.countDocuments();

    const totalPayments = await paymentCollection.countDocuments();

    const totalRevenueResult = await paymentCollection
      .aggregate([
        {
          $group: {
            _id: null,
            revenue: {
              $sum: "$amount",
            },
          },
        },
      ])
      .toArray();

    const totalRevenue =
      totalRevenueResult.length > 0
        ? totalRevenueResult[0].revenue
        : 0;

    const recentOrders = await orderCollection
      .find()
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    res.send({
      success: true,

      totalUsers,
      totalProducts,
      totalOrders,
      totalPayments,
      totalRevenue,

      recentOrders,
    });
  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      message: "Failed to load dashboard",
    });
  }
});

// manage user
app.get("/api/admin/users", async (req, res) => {
  try {
    const users = await userCollection
      .find()
      .sort({ createdAt: -1 })
      .toArray();

    res.send(users);
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to fetch users",
    });
  }
});
// get user
app.get("/api/users", async (req, res) => {
  try {
    const users = await userCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    res.send(users);
  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      message: "Failed to fetch users",
    });
  }
});

// Block / Unblock User
app.patch("/api/admin/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { isBlocked } = req.body;

    const result = await userCollection.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: {
          isBlocked,
        },
      }
    );

    res.send({
      success: true,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to update user",
    });
  }
});
// delete user
app.delete("/api/admin/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await userCollection.deleteOne({
      _id: new ObjectId(id),
    });

    res.send({
      success: true,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to delete user",
    });
  }
});

// manage product
app.get("/api/admin/products", async (req, res) => {
  try {
    const products = await productCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    res.send(products);
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to fetch products",
    });
  }
});

app.patch("/api/admin/products/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;

    await productCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: "approved",
          approvedAt: new Date(),
        },
      }
    );

    res.send({
      success: true,
      message: "Product approved",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to approve product",
    });
  }
});

app.patch("/api/admin/products/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;

    await productCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: "rejected",
          rejectedAt: new Date(),
        },
      }
    );

    res.send({
      success: true,
      message: "Product rejected",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to reject product",
    });
  }
});

app.delete("/api/admin/products/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await productCollection.deleteOne({
      _id: new ObjectId(id),
    });

    res.send({
      success: true,
      message: "Product deleted",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to delete product",
    });
  }
});

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
