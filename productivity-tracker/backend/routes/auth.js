const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "keyboardcat";

// register
router.post("/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).send({ error: "Missing" });
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).send({ error: "User exists" });
  const passwordHash = await bcrypt.hash(password, 10);
  const u = await User.create({ email, passwordHash });
  const token = jwt.sign({ id: u._id, email: u.email }, JWT_SECRET, {
    expiresIn: "30d",
  });
  res.send({ token });
});

// login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const u = await User.findOne({ email });
  if (!u) return res.status(400).send({ error: "Invalid" });
  const ok = await bcrypt.compare(password, u.passwordHash);
  if (!ok) return res.status(400).send({ error: "Invalid" });
  const token = jwt.sign({ id: u._id, email: u.email }, JWT_SECRET, {
    expiresIn: "30d",
  });
  res.send({ token });
});

module.exports = router;
