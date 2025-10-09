getSettings().then((settings) => {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("scripts/information/index.js");
    document.documentElement.appendChild(script);
    script.remove();
});
