const Session = require("../models/Session");

/**
 * Example: compute total time per domain and productivity breakdown
 */
async function generateWeeklyReport(userId, since) {
  const now = new Date();
  const start = since
    ? new Date(since)
    : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  // fetch sessions
  const sessions = await Session.find({
    userId,
    start: { $gte: start },
  }).lean();

  // default classification (can be overridden by dashboard per-user)
  const defaultClass = {
    "github.com": "productive",
    "stackoverflow.com": "productive",
    "leetcode.com": "productive",
    "youtube.com": "unproductive",
    "facebook.com": "unproductive",
    "twitter.com": "unproductive",
  };

  let byDomain = {};
  let totalMs = 0;
  for (const s of sessions) {
    const d = s.domain;
    byDomain[d] = (byDomain[d] || 0) + (s.duration_ms || 0);
    totalMs += s.duration_ms || 0;
  }

  // classification summary
  let productiveMs = 0,
    unproductiveMs = 0,
    neutralMs = 0;
  for (const domain in byDomain) {
    const cls = defaultClass[domain] || "neutral";
    if (cls === "productive") productiveMs += byDomain[domain];
    else if (cls === "unproductive") unproductiveMs += byDomain[domain];
    else neutralMs += byDomain[domain];
  }

  // convert to minutes
  const toMin = (ms) => Math.round(ms / 60000);

  return {
    total_minutes: toMin(totalMs),
    productive_minutes: toMin(productiveMs),
    unproductive_minutes: toMin(unproductiveMs),
    neutral_minutes: toMin(neutralMs),
    byDomain: Object.entries(byDomain).map(([domain, ms]) => ({
      domain,
      minutes: toMin(ms),
    })),
    since: start,
  };
}

module.exports = { generateWeeklyReport };
