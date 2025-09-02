document.addEventListener("DOMContentLoaded", async () => {
  const s = await chrome.storage.local.get([
    "backendUrl",
    "authToken",
    "site_classification",
  ]);
  document.getElementById("backendUrl").value = s.backendUrl || "";
  document.getElementById("authToken").value = s.authToken || "";
  document.getElementById("classification").value = JSON.stringify(
    s.site_classification || {},
    null,
    2
  );

  document.getElementById("save").addEventListener("click", async () => {
    const backendUrl = document.getElementById("backendUrl").value.trim();
    const authToken = document.getElementById("authToken").value.trim();
    let site_classification = {};
    try {
      site_classification = JSON.parse(
        document.getElementById("classification").value
      );
    } catch (e) {
      alert("Invalid JSON in classification");
      return;
    }
    await chrome.storage.local.set({
      backendUrl,
      authToken,
      site_classification,
    });
    alert("Saved");
  });
});
