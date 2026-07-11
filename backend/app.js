const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api", routes);
app.get("/health", (req, res) => res.json({ status: "ok" }));
app.use(errorHandler);

module.exports = app;
