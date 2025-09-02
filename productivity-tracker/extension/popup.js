document.addEventListener("DOMContentLoaded", async () => {
  const status = document.getElementById("status");
  const backendConfig = await chrome.storage.local.get([
    "backendUrl",
    "authToken",
    "site_classification",
  ]);
  status.textContent = backendConfig.backendUrl
    ? `Backend: ${backendConfig.backendUrl}`
    : "No backend configured";

  document.getElementById("openDashboard").addEventListener("click", () => {
    const url = backendConfig.backendUrl || "https://localhost:3000";
    chrome.tabs.create({ url });
  });

  document.getElementById("openOptions").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  document.getElementById("syncNow").addEventListener("click", async () => {
    chrome.runtime.sendMessage({ action: "forceSync" }, (r) => {
      alert("Sync requested.");
    });
  });
});
