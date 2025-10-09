let connections = [];
let downloads = [];

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id) return;

    (async () => {
        switch (message.type) {
            case "DOWNLOAD_VIDEO": {
                const { data } = message;
                if (data.type === "lms") {
                    const openRequest = indexedDB.open("videos");

                    openRequest.onupgradeneeded = (event) => {
                        const db = event.target.result;

                        if (!db.objectStoreNames.contains("chunks")) db.createObjectStore("chunks", { keyPath: [ "hash", "index" ] });
                        if (!db.objectStoreNames.contains("videos")) db.createObjectStore("videos", { keyPath: "hash" });
                    };

                    openRequest.onsuccess = async (event) => {
                        const db = event.target.result;
                        const range = data.range;
                        const indexOffset = data.indexOffset;
                        delete data.range;
                        delete data.indexOffset;

                        const transaction = db.transaction("videos", "readwrite");
                        const store = transaction.objectStore("videos");

                        const saved = await new Promise((resolve, reject) => {
                            const request = store.put({ ...data, status: "downloading" });
                            request.onsuccess = () => {
                                resolve(true);
                            };
                            request.onerror = (event) => {
                                console.error("Error on <IDBObjectStore>.put():", event.target.error);
                                reject();
                            };
                        }).catch(() => false);
                        if (!saved) {
                            return;
                        }

                        const controller = new AbortController();
                        const videoResponse = await fetch(data.url, {
                            headers: {
                                Range: "bytes=" + (range ?? "0-")
                            },
                            signal: controller.signal
                        }).catch(() => null);
                        if (!videoResponse) {
                            // probably aborted?
                            return;
                        }

                        const mediaSize = parseInt(videoResponse.headers.get("content-range").split("/")[1]);
                        const reader = videoResponse.body.getReader();

                        sendResponse({ type: "DOWNLOAD_VIDEO_START" });

                        let i = indexOffset ? (indexOffset * 100) : 0, received = range ? parseInt(range.split("-")[0]) : 0, aborted = false;

                        downloads.push({
                            hash: data.hash,
                            index: received,
                            length: mediaSize,
                            status: "downloading"
                        });

                        const chunks = [];
                        while (true) {
                            const download = downloads.find(download => download.hash === data.hash);
                            if (!download) {
                                // download canceled by user
                                aborted = true;
                                controller.abort("Download canceled by user");
                                connections.forEach(connection => connection.postMessage({ type: "DOWNLOAD_VIDEO_CANCEL", data: { hash: data.hash } }));
                                break;
                            }

                            const { done, value } = await reader.read();
                            if (done) break;

                            chunks.push(value);
                            received += value.length;

                            // save by 100 chunks
                            i++;
                            if (i % 100 === 0) {
                                const videoBlob = new Blob(chunks, { type: videoResponse.headers.get("content-type") });
                                chunks.length = 0; // let the gc pick it up

                                const saved = await saveChunk(db, "chunks", { hash: data.hash, index: (i / 100) - 1, data: videoBlob })
                                    .catch(() => false);
                                if (!saved) {
                                    aborted = true;
                                    break;
                                }

                                connections.forEach(connection => connection.postMessage({ type: "DOWNLOAD_VIDEO_PROGRESS", data: { hash: data.hash, index: received, length: mediaSize } }));
                                download.index = received;
                            }
                        }

                        if (!aborted) {
                            // i % 100 === 0 이라면 이미 마지막 청크까지 저장을 완료한 상태라 나머지를 저장할 필요 X
                            if (i % 100 !== 0) {
                                const videoBlob = new Blob(chunks, { type: videoResponse.headers.get("content-type") });

                                const final = await saveChunk(db, "chunks", { hash: data.hash, index: Math.floor(i / 100), data: videoBlob })
                                    .catch(() => false);
                                if (!final) {
                                    aborted = true;
                                }
                            }

                            connections.forEach(connection => connection.postMessage({ type: "DOWNLOAD_VIDEO_FINISH", data: { hash: data.hash, type: data.type } }));
                            saveVideoInfo({ ...data, status: "downloaded" });
                            const download = downloads.findIndex(download => download.hash === data.hash);
                            if (download !== -1) downloads.splice(download, 1);
                        }
                    };

                    openRequest.onerror = (event) => {
                        console.error("Error on indexedDB.open():", event.target.error);
                        saveVideoInfo({ ...data, status: "canceled" });
                    }
                } else if (data.type === "cms") {
                    const openRequest = indexedDB.open("videos");

                    openRequest.onupgradeneeded = (event) => {
                        const db = event.target.result;

                        if (!db.objectStoreNames.contains("chunks")) db.createObjectStore("chunks", { keyPath: [ "hash", "index" ] });
                        if (!db.objectStoreNames.contains("videos")) db.createObjectStore("videos", { keyPath: "hash" });
                    };

                    openRequest.onsuccess = async (event) => {
                        const db = event.target.result;
                        const baseUrl = data.url.split("/");
                        baseUrl.pop();

                        const transaction = db.transaction("videos", "readwrite");
                        const store = transaction.objectStore("videos");

                        const saved = await new Promise((resolve, reject) => {
                            const request = store.put({ ...data, status: "downloading" });
                            request.onsuccess = () => {
                                resolve(true);
                            };
                            request.onerror = (event) => {
                                console.error("Error on <IDBObjectStore>.put():", event.target.error);
                                reject();
                            };
                        }).catch(() => false);
                        if (!saved) {
                            return;
                        }

                        sendResponse({ type: "DOWNLOAD_VIDEO_START" });
                        downloads.push({
                            hash: data.hash,
                            index: data.chunks.findIndex(chunk => chunk !== null),
                            length: data.chunks.length,
                            status: "downloading"
                        });

                        let i = 0, aborted = false;
                        for (const chunk of data.chunks) {
                            const currentIndex = i++;
                            if (!chunk) continue; // chunk가 null이면 skip (이미 다운로드 완료한 청크)

                            const download = downloads.find(download => download.hash === data.hash);
                            if (!download) {
                                // download canceled by user
                                aborted = true;
                                connections.forEach(connection => connection.postMessage({ type: "DOWNLOAD_VIDEO_CANCEL", data: { hash: data.hash } }));
                                break;
                            }

                            const videoResponse = await fetch(chunk.startsWith("http") ? chunk : [ ...baseUrl, chunk ].join("/"));
                            const videoBlob = await videoResponse.blob();

                            const saved = await saveChunk(db, "chunks", { hash: data.hash, index: currentIndex, data: videoBlob })
                                .catch(() => false);
                            if (!saved) {
                                aborted = true;
                                break;
                            }

                            connections.forEach(connection => connection.postMessage({ type: "DOWNLOAD_VIDEO_PROGRESS", data: { hash: data.hash, index: currentIndex, length: data.chunks.length } }));
                            download.index = currentIndex;
                        }

                        if (!aborted) {
                            connections.forEach(connection => connection.postMessage({ type: "DOWNLOAD_VIDEO_FINISH", data: { hash: data.hash, type: data.type } }));
                            saveVideoInfo({ ...data, status: "downloaded" });
                            const download = downloads.findIndex(download => download.hash === data.hash);
                            if (download !== -1) downloads.splice(download, 1);
                        }
                    };

                    openRequest.onerror = (event) => {
                        console.error("Error on indexedDB.open():", event.target.error);
                        saveVideoInfo({ ...data, status: "canceled" });
                    }
                }
                break;
            }
        }
    })();

    // keep the connection alive
    return true;
});

async function saveChunk(db, storeName, data) {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
        const request = store.put(data);
        request.onsuccess = () => {
            resolve(true);
        };
        request.onerror = (event) => {
            console.error("Error on <IDBObjectStore>.put():", event.target.error);
            reject(event.target.error);
        };
    });
}

chrome.runtime.onConnect.addListener((port) => {
    console.log("[SW] Popup connected:", port.name);
    connections.push(port);

    port.onMessage.addListener((message) => {
        console.log(`[SW] Received message from ${port.name}:`, message);

        switch (message.type) {
            case "VIDEO_STATUS":
                port.postMessage({
                    type: "VIDEO_STATUS",
                    data: {
                        hash: message.data.hash,
                        ...downloads.find(download => download.hash === message.data.hash)
                    }
                });
                break;
            case "DOWNLOAD_VIDEO_CANCEL":
                const index = downloads.findIndex(download => download.hash === message.data.hash);
                if (index !== -1) downloads.splice(index, 1);
                break;
        }
    });

    port.onDisconnect.addListener(() => {
        console.log("[SW] Popup disconnected:", port.name);
        connections.splice(connections.indexOf(port), 1);
    });
});

function saveVideoInfo(data) {
    return new Promise((resolve, reject) => {
        const openRequest = indexedDB.open("videos");

        openRequest.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains("chunks")) db.createObjectStore("chunks", { keyPath: [ "hash", "index" ] });
            if (!db.objectStoreNames.contains("videos")) db.createObjectStore("videos", { keyPath: "hash" });
        };

        openRequest.onsuccess = async (event) => {
            const db = event.target.result;

            const transaction = db.transaction("videos", "readwrite");
            const store = transaction.objectStore("videos");

            const request = store.put(data);
            request.onsuccess = () => {
                resolve(true);
            };
            request.onerror = (event) => {
                console.error("Error on <IDBObjectStore>.put():", event.target.error);
                reject(event.target.error);
            };
        };
    });
}

// https://stackoverflow.com/questions/72736806/use-declarativenetrequest-to-set-the-referer-header-when-using-fetch-in-a-ch
// Fix Referer header issues for LMS contents
chrome.runtime.onInstalled.addListener(() => {
    const rules = [{
        id: 1,
        action: {
            type: "modifyHeaders",
            requestHeaders: [{
                header: "Referer",
                operation: "set",
                value: "https://lcms.knu.ac.kr/"
            }]
        },
        condition: {
            domains: [ chrome.runtime.id ],
            urlFilter: "https://kyungpook-cms.edge.naverncp.com/*",
            resourceTypes: [ "xmlhttprequest" ]
        }
    }];

    chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: rules.map(r => r.id),
        addRules: rules
    });
});
