const express = require("express");
const jwt = require("jsonwebtoken");
const Session = require("../models/Session");
const { generateWeeklyReport } = require("../utils/reports");
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "keyboardcat";

// Auth middleware
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).send({ error: "No auth" });
  const token = auth.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).send({ error: "Invalid token" });
  }
}

router.post("/bulk", authMiddleware, async (req, res) => {
  const records = req.body.records || [];
  if (!Array.isArray(records))
    return res.status(400).send({ error: "Bad records" });
  const docs = records.map((r) => ({
    userId: req.user.id,
    domain: r.domain,
    url: r.url,
    start: new Date(r.start),
    end: new Date(r.end),
    duration_ms: r.duration_ms,
    created_at: r.created_at ? new Date(r.created_at) : new Date(),
  }));
  await Session.insertMany(docs);
  res.send({ ok: true, inserted: docs.length });
});

// get weekly report
router.get("/report/weekly", authMiddleware, async (req, res) => {
  const since = req.query.since ? new Date(req.query.since) : undefined;
  const report = await generateWeeklyReport(req.user.id, since);
  res.send(report);
});

module.exports = router;
