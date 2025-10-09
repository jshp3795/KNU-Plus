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

                switch (data.type) {
                    case "VIDEO_INFO":
                        resolve(data.data);
                        window.removeEventListener("message", onMessage);
                        break;
                }
            }

            window.addEventListener("message", onMessage);

            window.postMessage({ from: "contentScript", type: "VIDEO_INFO" }, { targetOrigin: "https://lcms.knu.ac.kr" });
        });
    }
}
