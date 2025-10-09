document.oncontextmenu = (event) => false;

document.getElementById("navigate-back").addEventListener("click", (event) => {
    location.href = "/popup/index.html";
});

document.getElementById("navigate-open").addEventListener("click", (event) => {
    window.open("https://lms1.knu.ac.kr/");
});

// SETTINGS_DEFAULTS
const defaults = {
    notification: true,
    knu10ForceEnable: true,
    knu10AutoLogin: false
};

class Settings {
    _category;
    constructor(category) {
        this._category = category;
    }

    get(name) {
        return new Promise((resolve) => {
            chrome.storage.sync.get(this._category, async (items) => {
                items = items[this._category] || {};

                const settings = { ...defaults };
                for (const setting of Object.keys(settings)) {
                    // 기존 설정이 있다면 사용, 없다면 기본값
                    if (setting in items) {
                        settings[setting] = items[setting];
                    }
                }

                if (name !== undefined) {
                    // name을 지정하였다면 해당 값 반환
                    resolve(settings[name]);
                } else {
                    // name을 지정하지 않았다면 전체 값 반환
                    resolve(settings);
                }
            });
        });
    }

    set(name, value) {
        return new Promise(async (resolve) => {
            if (!(name in defaults)) return resolve(false);

            const settings = await this.get();
            settings[name] = value;
            chrome.storage.sync.set({ [this._category]: settings }, () => {
                resolve(true);
            });
        });
    }
}

const settings = new Settings(location.pathname.split("/")[2]);

settings.get().then(set => {
    for (const element of document.getElementsByClassName("toggle-item")) {
        const name = element.getAttribute("data-name");
        let enabled = set[name];
        element.setAttribute("data-enabled", enabled.toString());

        const box = element.getElementsByClassName("item-togglebox")[0];
        box.addEventListener("click", (event) => {
            enabled = !enabled;
            element.setAttribute("data-enabled", enabled.toString());
            settings.set(name, enabled);
        });
    }
});

const downloadButton = document.getElementById("knuplus_downloadbutton");

const videoInfo = { chunks: null, url: null, title: null, type: null };
for (const element of document.getElementsByClassName("downloader-item")) {
    let angle = 0;
    const box = element.getElementsByClassName("item-refreshbox")[0];
    box.addEventListener("mousedown", (event) => {
        angle += 360;
        box.style.transform = `rotate(${angle}deg)`;

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { type: "VIDEO_INFO" }, (response) => {
                const downloadTitle = document.getElementById("knuplus_downloadtitle");
                const downloadDescription = document.getElementById("knuplus_downloaddescription");
                downloadDescription.style.display = "inherit";

                if (chrome.runtime.lastError) {
                    // 강의 페이지가 아님
                    downloadTitle.innerText = "새로고침 버튼을 눌러 콘텐츠를 불러와주세요";
                    downloadDescription.innerText = "페이지와 연결에 실패하였습니다. 강의 페이지에서 다시 시도해주세요";
                    downloadButton.style.display = "none";
                    videoInfo.url = null;
                    videoInfo.data = null;
                    videoInfo.title = null;
                    videoInfo.type = null;
                    return;
                }

                const { data, type } = response;
                videoInfo.chunks = data.chunks ?? null;
                videoInfo.url = data.url;
                videoInfo.title = data.title;
                videoInfo.type = type;

                if (type === null) {
                    // 페이지에 동영상이 없음
                    downloadTitle.innerText = "새로고침 버튼을 눌러 콘텐츠를 불러와주세요";
                    downloadDescription.innerText = "현재 탭에 다운로드 가능한 콘텐츠가 없습니다";
                    downloadButton.style.display = "none";
                    return;
                }

                switch (type) {
                    case "lms":
                        downloadTitle.innerText = videoInfo.title;
                        downloadDescription.innerText = videoInfo.url.split("/").pop();
                        downloadButton.style.display = "inherit";
                        break;
                    case "cms":
                        downloadTitle.innerText = videoInfo.title;
                        downloadDescription.innerText = Object.keys(videoInfo.chunks)[0];
                        downloadButton.style.display = "inherit";
                        break;
                    case "youtube":
                        console.log("youtube", response);
                        break;
                    default:
                        console.log("TODO: Unknown video type", response.type);
                }
            });
        });
    });
}

downloadButton.addEventListener("click", async () => {
    if (videoInfo.type === "lms") {
        const chunkId = videoInfo.url.split("/").pop();
        const videoHashBuffer = await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(videoInfo.url)
        );
        const videoHashArray = Array.from(new Uint8Array(videoHashBuffer));
        const videoHash = videoHashArray.map(b => b.toString(16).padStart(2, "0")).join("");

        chrome.runtime.sendMessage({ type: "DOWNLOAD_VIDEO", data: { ...videoInfo, chunkId, hash: videoHash } }, (message) => {
            if (chrome.runtime.lastError) {
                console.error("Error on chrome.runtime.sendMessage():", chrome.runtime.lastError.message);
                return;
            }

            console.log("[LMS] Received response from service worker:", message);
            setItemStatus("downloading", videoHash, videoInfo.title, chunkId);
        });
    } else if (videoInfo.type === "cms") {
        const chunkId = Object.keys(videoInfo.chunks)[0];
        const videoHashBuffer = await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode([ videoInfo.url, chunkId ].join(":"))
        );
        const videoHashArray = Array.from(new Uint8Array(videoHashBuffer));
        const videoHash = videoHashArray.map(b => b.toString(16).padStart(2, "0")).join("");

        chrome.runtime.sendMessage({ type: "DOWNLOAD_VIDEO", data: { ...videoInfo, chunkId, chunks: videoInfo.chunks[chunkId], hash: videoHash } }, (message) => {
            if (chrome.runtime.lastError) {
                console.error("Error on chrome.runtime.sendMessage():", chrome.runtime.lastError.message);
                return;
            }

            console.log("[LMS] Received response from service worker:", message);
            setItemStatus("downloading", videoHash, videoInfo.title, chunkId);
        });
    } else {
        if (confirm(`지원되지 않는 포맷 '${videoInfo.type}' 입니다. 직접 다운로드해 주세요.\n\n다운로드를 위해 링크를 복사하시겠습니까?`)) {
            navigator.clipboard.writeText(videoInfo.url);
        }
    }
});

const port = chrome.runtime.connect({ name: "lms" });

port.onDisconnect.addListener(() => {
    console.log("[LMS] Service worker connection lost.");
});

port.onMessage.addListener(async (message) => {
    console.log("[LMS] Received message from service worker:", message);

    const { data, type } = message;
    switch (type) {
        case "DOWNLOAD_VIDEO_PROGRESS": {
            let foundItem = null;
            for (const item of document.getElementsByClassName("button-item")) {
                if (item.getAttribute("data-hash") === data.hash) {
                    foundItem = item;
                    break;
                }
            }

            if (foundItem) {
                setItemStatus("downloading", data.hash);
            } else {
                // cba to do it here again
                const videoInfos = await loadItems();
                const info = videoInfos.find(video => video.hash === data.hash);
                if (!info) return; // ???

                setItemStatus("downloading", data.hash, info.title, info.chunkId);
            }

            const percentText = (Math.floor((data.index / data.length) * 1000) / 10).toString();
            foundItem.getElementsByClassName("item-progress")[0].style.width = percentText + "%";
            foundItem.getElementsByClassName("item-progresstext")[0].innerText = percentText + " %";
            break;
        }
        case "DOWNLOAD_VIDEO_CANCEL": {
            setItemStatus("canceled", data.hash);
            break;
        }
        case "DOWNLOAD_VIDEO_FINISH": {
            for (const item of document.getElementsByClassName("button-item")) {
                if (item.getAttribute("data-hash") === data.hash) {
                    setItemStatus(data.type === "cms" ? "downloaded-ts" : "downloaded", data.hash);
                }
            }
            break;
        }
    }
});

// get precise item status from service worker
function getItemStatus(hash) {
    return new Promise((resolve, reject) => {
        let fulfilled = false;
        function onMessage(message) {
            if (message.type === "VIDEO_STATUS" && message.data.hash === hash) {
                fulfilled = true;
                resolve(message.data);
                port.onMessage.removeListener(onMessage);
            }
        }

        port.onMessage.addListener(onMessage);

        port.postMessage({
            type: "VIDEO_STATUS",
            data: {
                hash
            }
        });

        // 1초 안에 답장이 오지 않으면 연결에 문제가 생긴 것으로 간주하고 reject
        setTimeout(() => {
            if (!fulfilled) {
                console.error("Error on getItemStatus(): timed out");
                reject();
            }
        }, 1000);
    });
}

// title and description are optional
async function setItemStatus(status, hash, title, description) {
    let foundItem = null;
    for (const item of document.getElementsByClassName("button-item")) {
        if (hash.includes(item.getAttribute("data-hash"))) {
            foundItem = item;
            break;
        }
    }

    if (!foundItem) {
        const container = document.createElement("div");
        container.classList.add("button-item");
        container.setAttribute("data-hash", hash);
        container.innerHTML = `
            <div class="item-info">
                <span class="item-title"></span>
                <span class="item-description"></span>
            </div>
        `;
        container.getElementsByClassName("item-title")[0].innerText = title;
        container.getElementsByClassName("item-description")[0].innerText = description;

        const divider = document.createElement("div");
        divider.classList.add("divider-item");

        document.getElementById("knuplus_downloadbox").appendChild(divider);
        document.getElementById("knuplus_downloadbox").appendChild(container);
        foundItem = container;
    }

    if (foundItem.getAttribute("data-status") !== status) {
        const container = document.createElement("div");

        switch (status) {
            case "downloading":
                container.classList.add("item-progressbox");
                container.classList.add("item-cancel"); // for click event handling
                container.innerHTML = `
                    <div class="item-progress"></div>
                    <span class="item-progresstext">0 %</span>
                `;
                break;
            case "canceled":
                container.classList.add("item-buttonboxcontainer");
                container.innerHTML = `
                    <div class="item-buttonbox item-resume">
                        <span class="item-button">계속 다운로드</span>
                    </div>
                    <div class="item-buttonbox item-delete">
                        <span class="item-button">파일 삭제</span>
                    </div>
                `;
                break;
            case "downloaded":
                container.classList.add("item-buttonboxcontainer");
                container.innerHTML = `
                    <div class="item-buttonbox item-save">
                        <span class="item-button">파일 저장</span>
                    </div>
                    <div class="item-buttonbox item-delete">
                        <span class="item-button">파일 삭제</span>
                    </div>
                `;
                break;
            case "downloaded-ts":
                container.classList.add("item-buttonboxcontainer");
                container.innerHTML = `
                    <div class="item-buttonbox item-save item-tssave">
                        <span class="item-button">.TS 저장</span>
                    </div>
                    <div class="item-buttonbox item-convert">
                        <span class="item-button">.MP4 저장</span>
                    </div>
                    <div class="item-buttonbox item-delete">
                        <span class="item-button">파일 삭제</span>
                    </div>
                `;
                break;
        }

        if (foundItem.childElementCount === 2) foundItem.removeChild(foundItem.lastElementChild);
        foundItem.appendChild(container);
        foundItem.setAttribute("data-status", status);

        // register click events
        for (const button of foundItem.getElementsByClassName("item-cancel")) {
            button.addEventListener("click", onItemCancel);
        }
        for (const button of foundItem.getElementsByClassName("item-resume")) {
            button.addEventListener("click", onItemResume);
        }
        for (const button of foundItem.getElementsByClassName("item-save")) {
            button.addEventListener("click", onItemSave);
        }
        for (const button of foundItem.getElementsByClassName("item-delete")) {
            button.addEventListener("click", onItemDelete);
        }
        for (const button of foundItem.getElementsByClassName("item-convert")) {
            button.addEventListener("click", onItemConvert);
        }
    }
}

async function onItemCancel(event) {
    if (confirm("정말로 다운로드를 취소하시겠습니까?")) {
        let target = event.target;
        if (!target.classList.contains("item-cancel")) target = target.parentElement; // item-progress일 수도 있어서 체크
 
        const hash = target.parentElement.getAttribute("data-hash");

        port.postMessage({
            type: "DOWNLOAD_VIDEO_CANCEL",
            data: {
                hash
            }
        });
    }
}

async function onItemResume(event) {
    let target = event.target;
    if (!target.classList.contains("item-resume")) target = target.parentElement; // item-button일 수도 있어서 체크

    const element = target.parentElement.parentElement;
    const hash = element.getAttribute("data-hash");

    const openRequest = indexedDB.open("videos");

    openRequest.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("chunks")) db.createObjectStore("chunks", { keyPath: [ "hash", "index" ] });
        if (!db.objectStoreNames.contains("videos")) db.createObjectStore("videos", { keyPath: "hash" });
    };

    openRequest.onsuccess = async (event) => {
        const db = event.target.result;

        const transaction = db.transaction("videos", "readonly");
        const store = transaction.objectStore("videos");

        const request = store.get(hash);
        request.onsuccess = async (event) => {
            const info = event.target.result;
            if (!info) return; // ???

            if (info.type === "lms") {
                // read all chunks and start from their size sum
                const transaction = db.transaction("chunks", "readonly");
                const store = transaction.objectStore("chunks");

                const [ size, count ] = await new Promise((resolve, reject) => {
                    let size = 0, count = 0;
                    const request = store.openCursor(IDBKeyRange.bound([ hash, 0 ], [ hash, Infinity ]));
                    request.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (cursor) {
                            const blob = cursor.value.data;
                            size += blob.size;
                            count++;
                            cursor.continue();
                        } else {
                            resolve([ size, count ]);
                        }
                    };

                    request.onerror = (event) => {
                        console.error("Error on <IDBObjectStore>.openCursor():", event.target.error);
                        reject(event.target.error);
                    }
                });

                // send range and index offset to skip chunks
                chrome.runtime.sendMessage({ type: "DOWNLOAD_VIDEO", data: { range: size + "-", indexOffset: count, url: info.url, title: info.title, type: info.type, chunkId: info.chunkId, hash: info.hash } }, (message) => {
                    if (chrome.runtime.lastError) {
                        console.error("Error on chrome.runtime.sendMessage():", chrome.runtime.lastError.message);
                        return;
                    }

                    console.log("[LMS] Received response from service worker:", message);
                    setItemStatus("downloading", info.hash, info.title, info.chunkId);
                });
            } else if (info.type === "cms") {
                // videos are saved in chunks; we can skip the saved chunks
                const transaction = db.transaction("chunks", "readonly");
                const store = transaction.objectStore("chunks");

                const request = store.count(IDBKeyRange.bound([ hash, 0 ], [ hash, Infinity ]));
                request.onsuccess = (event) => {
                    const count = event.target.result;

                    // send null to skip chunks
                    const chunks = info.chunks.map((chunk, i) => i < count ? null : chunk);
                    chrome.runtime.sendMessage({ type: "DOWNLOAD_VIDEO", data: { chunks, url: info.url, title: info.title, type: info.type, chunkId: info.chunkId, hash } }, (message) => {
                        if (chrome.runtime.lastError) {
                            console.error("Error on chrome.runtime.sendMessage():", chrome.runtime.lastError.message);
                            return;
                        }

                        console.log("[LMS] Received response from service worker:", message);
                        setItemStatus("downloading", hash, info.title, info.chunkId);
                    });
                };
            }
        };
    };
}

function onItemSave(event) {
    let target = event.target;
    if (!target.classList.contains("item-save")) target = target.parentElement; // item-button일 수도 있어서 체크

    const element = target.parentElement.parentElement;
    const hash = element.getAttribute("data-hash");

    // 일부러 고장내는 억울한 상황이 아닌 이상 모든 청크가 다 다운로드 되었는지 굳이 확인 안 해도 되니 생략
    const openRequest = indexedDB.open("videos");

    openRequest.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("chunks")) db.createObjectStore("chunks", { keyPath: [ "hash", "index" ] });
        if (!db.objectStoreNames.contains("videos")) db.createObjectStore("videos", { keyPath: "hash" });
    };

    openRequest.onsuccess = async (event) => {
        const db = event.target.result;

        const transaction = db.transaction("chunks", "readonly");
        const store = transaction.objectStore("chunks");

        const chunks = [];
        const request = store.openCursor(IDBKeyRange.bound([ hash, 0 ], [ hash, Infinity ]));
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                const { index, data } = cursor.value;
                chunks.push({ index, blob: data });
                cursor.continue();
            } else {
                const video = new Blob(chunks.sort((a, b) => a.index - b.index).map(c => c.blob), { type: chunks[0].blob.type });
                const blob = URL.createObjectURL(video);

                const extensions = {
                    "video/mp4": "mp4",
                    "video/mp2t": "ts"
                };
                chrome.downloads.download({
                    url: blob,
                    filename: element.getElementsByClassName("item-title")[0].innerText + "." + (extensions[chunks[0].blob.type] ?? element.getElementsByClassName("item-description")[0].innerText.split(".").pop())
                }, (id) => {
                    if (chrome.runtime.lastError) {
                        URL.revokeObjectURL(blob);
                        return;
                    }

                    function onChanged(delta) {
                        if (delta.id === id && delta.state?.current === "complete") {
                            // i dont think this is needed but just in case
                            URL.revokeObjectURL(blob);
                            chrome.downloads.onChanged.removeListener(onChanged);
                        }
                    }
                    chrome.downloads.onChanged.addListener(onChanged);
                });
            }
        };
    };
}

function onItemDelete(event) {
    if (confirm("정말로 파일을 삭제하시겠습니까?")) {
        let target = event.target;
        if (!target.classList.contains("item-delete")) target = target.parentElement; // item-button일 수도 있어서 체크
 
        const element = target.parentElement.parentElement;
        const hash = element.getAttribute("data-hash");

        port.postMessage({
            type: "DOWNLOAD_VIDEO_CANCEL",
            data: {
                hash
            }
        });

        const openRequest = indexedDB.open("videos");

        openRequest.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains("chunks")) db.createObjectStore("chunks", { keyPath: [ "hash", "index" ] });
            if (!db.objectStoreNames.contains("videos")) db.createObjectStore("videos", { keyPath: "hash" });
        };

        openRequest.onsuccess = async (event) => {
            const db = event.target.result;

            const transaction = db.transaction("chunks", "readwrite");
            const store = transaction.objectStore("chunks");

            const request = store.openCursor(IDBKeyRange.bound([ hash, 0 ], [ hash, Infinity ]));
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };

            transaction.oncomplete = () => {
                const transaction = db.transaction("videos", "readwrite");
                const store = transaction.objectStore("videos");

                const request = store.delete(hash);
                request.onsuccess = () => {
                    element.previousElementSibling.remove(); // remove divider
                    element.remove();
                };
            };
        };
    }
}

function onItemConvert(event) {
    let target = event.target;
    if (!target.classList.contains("item-convert")) target = target.parentElement; // item-button일 수도 있어서 체크
    if (target.classList.contains("item-converting")) return; // 이미 변환 중인 상태

    const element = target.parentElement.parentElement;
    const hash = element.getAttribute("data-hash");
    target.classList.add("item-converting");
    target.getElementsByClassName("item-button")[0].innerText = "변환중";

    const { FFmpeg } = FFmpegWASM;
    const ffmpeg = new FFmpeg();

    const transmuxer = new muxjs.mp4.Transmuxer();
    transmuxer.on("data", async (segment) => {
        const concatenated = new Uint8Array(segment.initSegment.length + segment.data.length);
        concatenated.set(segment.initSegment, 0);
        concatenated.set(segment.data, segment.initSegment.length);

        target.getElementsByClassName("item-button")[0].innerText = "처리중";

        await ffmpeg.load({ coreURL: "ffmpeg-core.js" });
        await ffmpeg.writeFile("input.mp4", concatenated);
        await ffmpeg.exec([ "-i", "input.mp4", "-c", "copy", "output.mp4" ]);

        const data = await ffmpeg.readFile("output.mp4");
        const blob = new Blob([ data.buffer ], { type: "video/mp4" });
        const url = URL.createObjectURL(blob);

        chrome.downloads.download({
            url,
            filename: element.getElementsByClassName("item-title")[0].innerText + ".mp4"
        }, (id) => {
            if (chrome.runtime.lastError) {
                URL.revokeObjectURL(url);
                target.classList.remove("item-converting");
                target.getElementsByClassName("item-button")[0].innerText = ".MP4 저장";
                return;
            }

            function onChanged(delta) {
                if (delta.id === id && delta.state?.current === "complete") {
                    // i dont think this is needed but just in case
                    URL.revokeObjectURL(url);
                    target.classList.remove("item-converting");
                    target.getElementsByClassName("item-button")[0].innerText = ".MP4 저장";
                    chrome.downloads.onChanged.removeListener(onChanged);
                }
            }
            chrome.downloads.onChanged.addListener(onChanged);
        });
    });

    const openRequest = indexedDB.open("videos");
    openRequest.onsuccess = async (e) => {
        const db = e.target.result;

        const tx = db.transaction("chunks", "readonly");
        const store = tx.objectStore("chunks");

        const chunks = [];
        const request = store.openCursor(IDBKeyRange.bound([ hash, 0 ], [ hash, Infinity ]));
        request.onsuccess = async (event) => {
            const cursor = event.target.result;
            if (cursor) {
                const { data } = cursor.value;
                chunks.push(data);
                cursor.continue();
            } else {
                for (let i = 0; i < chunks.length; i++) {
                    transmuxer.push(new Uint8Array(await chunks[i].arrayBuffer()));
                }
                transmuxer.flush();
            }
        };
        request.onerror = (event) => {
            console.error("Error on indexedDB.open():", event.target.error);
        };
    };
}

// load video items
function loadItems() {
    return new Promise((resolve, reject) => {
        const openRequest = indexedDB.open("videos");

        openRequest.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains("chunks")) db.createObjectStore("chunks", { keyPath: [ "hash", "index" ] });
            if (!db.objectStoreNames.contains("videos")) db.createObjectStore("videos", { keyPath: "hash" });
        };

        openRequest.onsuccess = async (event) => {
            const db = event.target.result;

            const transaction = db.transaction("videos", "readonly");
            const store = transaction.objectStore("videos");

            const request = store.getAll();
            request.onsuccess = async (event) => {
                for (const item of event.target.result) {
                    if (item.status === "downloading") {
                        const data = await getItemStatus(item.hash);
                        if (!data.status) {
                            // download was canceled; cannot be found in service worker
                            // (usually due to closing browser before download has finished)
                            item.status = "canceled";
                            setItemStatus("canceled", item.hash, item.title, item.chunkId);
                            continue;
                        }

                        // download is ongoing
                        setItemStatus(item.status, item.hash, item.title, item.chunkId);

                        const percentText = (Math.floor((data.index / data.length) * 1000) / 10).toString();
                        for (const button of document.getElementsByClassName("button-item")) {
                            if (button.getAttribute("data-hash") === item.hash) {
                                button.getElementsByClassName("item-progress")[0].style.width = percentText + "%";
                                button.getElementsByClassName("item-progresstext")[0].innerText = percentText + " %";
                            }
                        }
                    } else if (item.status === "canceled") {
                        setItemStatus(item.status, item.hash, item.title, item.chunkId);
                    } else if (item.status === "downloaded") {
                        setItemStatus(
                            item.type === "cms" ? "downloaded-ts" : "downloaded",
                            item.hash,
                            item.title,
                            item.chunkId
                        );
                    }
                }
                resolve(event.target.result);
            };
            request.onerror = (event) => {
                console.error("Error on <IDBObjectStore>.getAll():", event.target.error);
                reject();
            };
        };
    });
}
loadItems();
