const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");

require("dotenv").config();
require("colors");
// server variables
const app = express();
const port = process.env.PORT || 5000;
// middleware functions
app.use(cors());
app.use(express.json());

function verifyToken(req, res, next) {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send("access  denied");
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send("invalid token");
    }
    req.decoded = decoded;
    next();
  });
}
async function verifyRole(req, res, next) {
  const currentUser = req.decoded;
  const isUser = await users.findOne({ email: currentUser.email });
  if (isUser.role === "admin") {
    req.role = "admin";
    next();
  } else if (isUser.role === "seller") {
    req.role = "seller";
    next();
  } else if (!isUser.role) {
    req.role = "buyer";
    next();
  }
}

// DataBase Connection
const url = process.env.DB_URL;
const client = new MongoClient(url);
async function connect() {
  try {
    await client.connect();
    console.log("DataBase connection established successfully".cyan.bold);
  } catch (err) {
    console.log(err.message.red.bold);
  }
}
connect();
// DataBase Collection
const users = client.db("PrimeMotors").collection("users");
const bookings = client.db("PrimeMotors").collection("bookings");
const products = client.db("PrimeMotors").collection("products");
const categories = client.db("PrimeMotors").collection("categories");
// Route for the server
app.get("/", async (req, res) => {
  res.send(" server is  running");
});
app.get("/products", verifyToken, verifyRole, async (req, res) => {
  if (req.role === "admin") {
    const result = await products.find({}).toArray();
    return res.send(result);
  }
  if (req.role === "seller") {
    const result = await products.find({ "posted_by.email": req.decoded.email }).toArray();
    return res.send(result);
  }

  res.status(401).send(" You are not admin or seller");
});

app.get("/products/:ID", async (req, res) => {
  const ID = req.params.ID;
  const filter = { category: ID };
  console.log(filter);
  const result = await products.find(filter).toArray();
  res.send(result);
});
app.post("/product", async (req, res) => {
  const getProduct = req.body.product;
  const result = await products.insertOne(getProduct);
  if (result.acknowledged) {
    return res.send(result);
  }
  res.status(500).send("Sometihng went wrong");
});
app.delete("/product/:ID", verifyToken, verifyRole, async (req, res) => {
  const productID = req.params.ID;
  console.log(productID);
  if (req.role === "admin") {
    const result = products.deleteOne({ _id: ObjectId(productID) });
    return res.send(result);
  } else if (req.role === "seller") {
    const product = await products.findOne({ _id: ObjectId(productID) });
    console.log(product);
    if (product.posted_by.email === req.decoded.email) {
      const result = products.deleteOne({ _id: ObjectId(productID) });
      return res.send(result);
    }

    res.status(401).send(" you are not owner of this product");
  }
});
app.get("/categories", async (req, res) => {
  const result = await categories.find({}).toArray();
  res.send(result);
});
app.get("/booking", verifyToken, async (req, res) => {
  const email = req.query.email;
  const result = await bookings.find({ email: email }).toArray();
  res.send(result);
});

app.post("/booking", async (req, res) => {
  const bookingData = req.body.bookingData;
  products.updateOne({ _id: ObjectId(bookingData.product_id) }, { $set: { booked: true } }, { upsert: true });
  bookings.insertOne(bookingData);
  res.send(" booked successfully");
});
app.get("/advertise", async (req, res) => {
  const result = await products.find({ $and: [{ advertise: { $eq: true } }, { booked: { $ne: true } }] }).toArray();
  res.send(result);
});
app.post("/advertise/:ID", async (req, res) => {
  const productID = req.params.ID;
  const result = await products.updateOne(
    { _id: ObjectId(productID) },
    { $set: { advertise: true } },
    { upsert: true }
  );
  res.send(result);
});

app.get("/buyers", verifyToken, verifyRole, async (req, res) => {
  if (req.role === "admin") {
    const result = await users.find({ $and: [{ role: { $ne: "admin" } }, { role: { $ne: "seller" } }] }).toArray();
    return res.send(result);
  }
});
app.get("/sellers", verifyToken, verifyRole, async (req, res) => {
  if (req.role === "admin") {
    const result = await users.find({ role: "seller" }).toArray();
    return res.send(result);
  }
});
app.post("/verify-user/:ID", verifyToken, verifyRole, async (req, res) => {
  const UserID = req.params.ID;
  if (req.role === "admin") {
    const getUser = users.updateOne({ _id: ObjectId(UserID) }, { $set: { verified: true } }, { upsert: true });
  }
});
app.delete("/user/:ID", verifyToken, verifyRole, async (req, res) => {
  const UserID = req.params.ID;
  if (req.role === "admin") {
    const result = await users.deleteOne({ _id: ObjectId(UserID) });
    res.send(result);
  }
});
app.post("/get-token", async (req, res) => {
  try {
    const user = req.body.user;
    await users.updateOne({ email: user.email }, { $set: user }, { upsert: true });
    const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);
    res.send({ token });
  } catch (error) {}
});

app.get("/get-user-role", verifyToken, async (req, res) => {
  const email = req.query.email;
  const result = await users.findOne({ email: email });
  res.send(result);
});
app.put("/user", verifyToken, async (req, res) => {
  const email = req.query.email;
  const result = await users.updateOne({ email: email }, { $set: req.body });
  res.send(result);
});

// Server RunCommandOperation
app.listen(port, () => {
  console.log(` server listening on port ${port}`);
});
