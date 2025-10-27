// models/Counter.js
const mongoose = require("mongoose");

const CounterSchema = new mongoose.Schema(
  {
    _id: { type: String },          // e.g. "order-20251023"
    seq: { type: Number, default: 0 },
  },
  { versionKey: false }
);

module.exports = mongoose.model("Counter", CounterSchema);
