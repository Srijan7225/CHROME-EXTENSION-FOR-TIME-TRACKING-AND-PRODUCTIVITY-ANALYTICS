// service_worker.js
const STORAGE_KEY = "tracker_buffer_v1";
const SYNC_INTERVAL_MIN = 1; // minutes

let current = {
  tabId: null,
  url: null,
  start: null, // timestamp ms when this tab became active
};

// default classification map (user can change in options)
const DEFAULT_CLASSIFICATION = {
  "github.com": "productive",
  "stackoverflow.com": "productive",
  "leetcode.com": "productive",
  "youtube.com": "unproductive",
  "facebook.com": "unproductive",
  "twitter.com": "unproductive",
  "instagram.com": "unproductive",
};

async function getBuffer() {
  const data = await chrome.storage.local.get([STORAGE_KEY]);
  return data[STORAGE_KEY] || [];
}
async function setBuffer(buf) {
  await chrome.storage.local.set({ [STORAGE_KEY]: buf });
}

async function pushRecord(record) {
  const buf = await getBuffer();
  buf.push(record);
  await setBuffer(buf);
}

// helper to extract domain
function extractDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch (e) {
    return null;
  }
}

// start tracking when active tab changes or window focus changes
async function startTracking(tabId, url) {
  stopTrackingIfAny();

  current.tabId = tabId;
  current.url = url;
  current.start = Date.now();
}

function stopTrackingIfAny() {
  if (current.start && current.url) {
    const end = Date.now();
    const duration = end - current.start;
    const domain = extractDomain(current.url);
    if (domain && duration > 1000) {
      // ignore very short blips
      pushRecord({
        domain,
        url: current.url,
        start: current.start,
        end,
        duration_ms: duration,
        created_at: new Date().toISOString(),
      });
    }
  }
  current = { tabId: null, url: null, start: null };
}

// listen for tab switched
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab && tab.url) {
    startTracking(tab.id, tab.url);
  } else {
    stopTrackingIfAny();
  }
});

// when tab updated (navigation)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && changeInfo.url) {
    // active tab navigated
    startTracking(tabId, changeInfo.url);
  }
});

// window focus changed
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // lost focus (desktop locked or switched)
    stopTrackingIfAny();
    return;
  }
  const [tab] = await chrome.tabs.query({ active: true, windowId });
  if (tab) startTracking(tab.id, tab.url);
});

// idle state detection (user away)
chrome.idle.onStateChanged.addListener((newState) => {
  if (newState === "idle" || newState === "locked") {
    stopTrackingIfAny();
  } else if (newState === "active") {
    // resume tracking the currently active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) startTracking(tabs[0].id, tabs[0].url);
    });
  }
});

chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (msg && msg.action === "forceSync") {
    chrome.alarms.get("syncToBackend", (a) => {
      // trigger sync logic by calling alarm handler manually
      chrome.alarms.onAlarm.dispatch({ name: "syncToBackend" });
    });
    respond({ ok: true });
  }
});

// on install/open, initialize classification if not present
chrome.runtime.onInstalled.addListener(async () => {
  const { site_classification } = await chrome.storage.local.get([
    "site_classification",
  ]);
  if (!site_classification) {
    await chrome.storage.local.set({
      site_classification: DEFAULT_CLASSIFICATION,
    });
  }
  // start tracking active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) startTracking(tabs[0].id, tabs[0].url);
  });
});

// Periodic flush: send buffer to backend if user configured backend + auth
chrome.alarms.create("syncToBackend", { periodInMinutes: SYNC_INTERVAL_MIN });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "syncToBackend") return;
  await stopTrackingIfAny();
  const buf = await getBuffer();
  if (!buf.length) return;

  const { backendUrl, authToken } = await chrome.storage.local.get([
    "backendUrl",
    "authToken",
  ]);

  // If backend is configured, send; otherwise keep buffer local
  if (backendUrl && authToken) {
    try {
      const response = await fetch(
        `${backendUrl.replace(/\/$/, "")}/api/data/bulk`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ records: buf }),
        }
      );
      if (response.ok) {
        await setBuffer([]); // clear buffer on success
      } else {
        // keep buffer, maybe server down
        console.warn("Failed to sync data", response.status);
      }
    } catch (err) {
      console.warn("Sync error", err);
    }
  }
});
