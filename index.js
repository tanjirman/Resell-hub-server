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
