chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason !== chrome.runtime.OnInstalledReason.INSTALL) {
    return;
  }

  openDemoTab();

  // Create an alarm so we have something to look at in the demo
  chrome.alarms.create("demo-default-alarm", {
    delayInMinutes: 1,
    periodInMinutes: 1,
  });
});

chrome.action.onClicked.addListener(openDemoTab);

function openDemoTab() {
  chrome.tabs.create({ url: "index.html" });
}
