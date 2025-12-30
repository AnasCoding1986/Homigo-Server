const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");

const port = process.env.PORT || 8000;

/* =======================
   MIDDLEWARE
======================= */

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

/* =======================
   VERIFY TOKEN MIDDLEWARE
======================= */

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

/* =======================
   MONGODB CONNECTION
======================= */

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.n6rvadf.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const roomCollection = client.db("homegoDB").collection("rooms");

    /* =======================
       AUTH APIs
    ======================= */

    // Create JWT & set cookie
    app.post("/jwt", async (req, res) => {
      const user = req.body;

      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "365d",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false, // DEV MODE
          sameSite: "lax", // DEV MODE
        })
        .send({ success: true });
    });

    // Logout
    app.get("/logout", async (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: false,
          sameSite: "lax",
        })
        .send({ success: true });

      console.log("Logout successful");
    });

    /* =======================
       ROOMS APIs
    ======================= */

    //Save a room data to DB
    app.post("/rooms", async (req, res) => {
      const room = req.body;
      const result = await roomCollection.insertOne(room);
      res.send(result);
    });

    // Get all rooms (with category filter)
    app.get("/rooms", async (req, res) => {
      const category = req.query.category;
      let query = {};

      if (category && category !== "null") {
        query.category = category;
      }

      const result = await roomCollection.find(query).toArray();
      res.send(result);
    });

    // Get single room by ID
    app.get("/rooms/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const room = await roomCollection.findOne(query);
      res.send(room);
    });

    //Get rooms by host email
    app.get("/my-listings", async (req, res) => {
      const email = req.query.email;
      const query = { "host.email": email };
      const rooms = await roomCollection.find(query).toArray();
      res.send(rooms);
    });

    // Delete room by ID
    app.delete("/rooms/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await roomCollection.deleteOne(query);
      res.send(result);
    });

    /* =======================
       DB PING
    ======================= */

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged MongoDB successfully!");
  } catch (error) {
    console.error(error);
  }
}

run().catch(console.dir);

/* =======================
   ROOT
======================= */

app.get("/", (req, res) => {
  res.send("Hello from StayVista Server");
});

/* =======================
   START SERVER
======================= */

app.listen(port, () => {
  console.log(`StayVista server running on port ${port}`);
});
