const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const SessionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  domain: String,
  url: String,
  start: Date,
  end: Date,
  duration_ms: Number,
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Session", SessionSchema);
