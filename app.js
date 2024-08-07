const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const dotenv = require("dotenv");
const app = express();
dotenv.config();

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(
  cors({
    origin: ["http://localhost:5173", "https://workmanagerweb.netlify.app"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// Request Rate Limit
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 3000 });
app.use(limiter);

// Mongo DB Database Connection
let URL = `mongodb+srv://${process.env.USER}:${process.env.PASS}@cluster0.nakaabb.mongodb.net/${process.env.DB}?retryWrites=true&w=majority`;
let CONFIG = {
  user: process.env.USER,
  pass: process.env.PASS,
  autoIndex: true,
};

try {
  mongoose.connect(URL, CONFIG);
  console.log("DB Connected!");
} catch (err) {
  console.error(err);
}

// Routing
const router = require("./src/routes/api");
app.use("/api/v1", router);

// Default route
app.get("/", (req, res) => {
  res.json({ message: "Hello From Express App!" });
});

// Undefined Route
app.use((req, res) => {
  res.status(404).json({ status: "fail", data: "Not Found" });
});

// Set Access Controll Header by Default to resolve CORS issues
app.use((req, res, next) => {
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

module.exports = app;
