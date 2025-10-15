if (location.pathname.startsWith("/em/")) {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("scripts/lms/iframe.js");
    document.documentElement.appendChild(script);
    script.remove();

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        (async () => {
            switch (message.type) {
                case "VIDEO_INFO":
                    const info = await awaitVideoInfo();
                    sendResponse({ data: info, type: "lms" });
                    break;
                case "VIDEO_ATTEND":
                    const attended = await attendVideo();
                    sendResponse({ data: attended });
            }
        })();

        // keep alive
        return true;
    });

    function awaitVideoInfo() {
        return new Promise((resolve) => {
            function onMessage(event) {
                const { data } = event;
                if (data.from !== "page") return;

                if (data.type === "VIDEO_INFO" && event.origin === "https://canvas.knu.ac.kr") {
                    resolve(true);
                    window.removeEventListener("message", onMessage);
                }
            }

            window.addEventListener("message", onMessage);

            window.postMessage({ from: "contentScript", type: "VIDEO_INFO" }, "https://lcms.knu.ac.kr");
        });
    }

    // Popup -> [ IFrame ContentScript (iframe_injector.js) ] -> IFrame Page (iframe.js) -> Main ContentScript (injector.js) -> IFrame ContentScript (iframe_injector.js) -> Popup
    function attendVideo() {
        return new Promise((resolve) => {
            async function onMessage(event) {
                const { data } = event;
                if (data.from !== "contentScript") return;

                if (data.type === "VIDEO_ATTEND" && event.origin === "https://canvas.knu.ac.kr") {
                    // Popup -> IFrame ContentScript (iframe_injector.js) -> IFrame Page (iframe.js) -> Main ContentScript (injector.js) -> [ IFrame ContentScript (iframe_injector.js) ] -> Popup
                    resolve(true);
                    window.removeEventListener("message", onMessage);
                }
            }

            window.addEventListener("message", onMessage);

            window.postMessage({ from: "contentScript", type: "VIDEO_ATTEND" }, "https://lcms.knu.ac.kr");
        });
    }
}
