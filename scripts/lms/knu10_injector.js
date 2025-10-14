getSettings().then((settings) => {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("scripts/lms/knu10.js");
    document.documentElement.appendChild(script);
    script.remove();

    if (location.pathname === "/ctl/mainHome") {
        if (document.getElementById("ssStudentId")) return; // 이미 로그인되어 있음

        if (settings.account.passkeyLogin) { // 패스키
            const loginButton = document.getElementsByClassName("lonin_btn")[0]; // ?

            loginButton.style.fontSize = "14px"; // fixed size
            loginButton.outerHTML = `
                <div id="knuplus_login_container" style="display: flex; height: 36px; gap: 8px;">
                    ${loginButton.outerHTML}
                </div>
            `;

            const frame = document.createElement("iframe");
            frame.src = chrome.runtime.getURL("scripts/lms/tab.html");
            frame.allow = "publickey-credentials-get *";
            frame.style.width = "calc(50% - 4px)";
            frame.style.height = "36px";
            frame.style.borderRadius = "2px";
            document.getElementById("knuplus_login_container").appendChild(frame);
        } else if (settings.account.knu10AutoLogin) { // 패스키 X 자동 로그인 O
            chrome.storage.local.get("credentials").then(async ({ credentials }) => {
                if (!credentials) return;

                if (credentials.type === "idp") {
                    const [ key, iv ] = credentials.key.split(":");
                    const password = await decryptPassword(credentials.data, key, iv);

                    login(credentials.id, password);
                }
            });
        }
    }
});

function login(id, password, univCode) {
    univCode = univCode ?? "CO00005"; // 경북대학교는 univCode가 CO00005

    fetch("https://www.knu10.or.kr/login/doLogin", {
        headers: {
            "content-type": "application/x-www-form-urlencoded"
        },
        method: "POST",
        body: new URLSearchParams({
            univCd: univCode,
            userId: id,
            userPw: password
        })
    }).then(async (res) => {
        // 로그인 완료
        if (res.status === 200 && res.headers.get("content-type").includes("text/html")) {
            const parser = new DOMParser();
            const newPage = parser.parseFromString(await res.text(), "text/html");

            // update dom
            document.getElementsByClassName("inner")[0].innerHTML = newPage.getElementsByClassName("inner")[0].innerHTML;
        }
    });
}

async function decryptPassword(text, key, iv) {
    key = atob(key.replace(/-/g, "+").replace(/_/g, "/"));

    key = await crypto.subtle.importKey("raw", Uint8Array.from(key, c => c.charCodeAt(0)), "AES-CBC", false, [ "decrypt" ]);
    iv = new Uint8Array(new Uint8Array(iv.match(/.{2}/g).map(byte => parseInt(byte, 16))));

    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-CBC", iv },
        key,
        new Uint8Array(text.match(/.{2}/g).map(byte => parseInt(byte, 16)))
    );

    return new TextDecoder().decode(decrypted);
}

const videoInfo = { url: null, title: null, type: null };
if (location.pathname === "/lesson/lessonLect/Form/creLessonCntsView") {
    videoInfo.title = document.getElementsByClassName("field")[1].childNodes[2].data.trim();
    const videoUrl = document.getElementsByClassName("flex")[0].getElementsByTagName("span")[0].innerText;

    if (videoUrl) {
        videoInfo.url = videoUrl;
        if (videoUrl.includes("educdn.kr")) {
            videoInfo.type = "cms";
        } else if (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")) {
            videoInfo.type = "youtube";
        } else {
            videoInfo.type = "unknown";
        }
    }
} else if (location.pathname === "/lesson/lessonLect/Form/mainLesson") {
    videoInfo.title = document.getElementsByClassName("page-title")[0].innerText;
    const scriptElements = document.getElementsByTagName("script");
    for (const scriptElement of scriptElements) {
        // 플레이어 셋업 스크립트
        if (scriptElement.type === "module") {
            const scriptSrc = scriptElement.innerText;
            const videoUrl = scriptSrc.match(/let videoUrl = '([^']+)';/)?.[1];
            const gubun = scriptSrc.match(/let gubun = '(\w+)';/)?.[1]?.toLowerCase();
            if (!videoUrl || !gubun) continue;

            videoInfo.url = videoUrl;
            if (videoUrl.includes("educdn.kr")) {
                videoInfo.type = "cms";
            } else if (gubun === "url") {
                videoInfo.type = "youtube";
            } else {
                videoInfo.type = gubun;
            }
        }
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case "VIDEO_INFO":
            if (videoInfo.type === "cms") {
                const baseUrl = videoInfo.url.split("/");
                baseUrl.pop();

                (async function() {
                    const playlist = await fetch(videoInfo.url).then(res => res.text());
                    const chunks = playlist.split("\n")
                        .filter(video => !video.startsWith("#") && video.length !== 0);

                    const data = {};
                    for (let i = 0; i < chunks.length; i++) {
                        const chunk = chunks[i];
                        if (chunk.includes(".m3u8")) {
                            const subPlaylist = await fetch([ ...baseUrl, chunk ].join("/")).then(res => res.text());
                            const subChunks = subPlaylist.split("\n")
                                .filter(video => !video.startsWith("#") && video.length !== 0);
                            data[chunk] = subChunks;
                        } else {
                            data[chunk] = [ chunk ];
                        }
                    }

                    sendResponse({
                        data: {
                            chunks: data,
                            url: videoInfo.url,
                            title: videoInfo.title
                        },
                        type: "cms"
                    });
                })();
            } else {
                sendResponse({
                    data: {
                        url: videoInfo.url,
                        title: videoInfo.title
                    },
                    type: videoInfo.type
                });
            }
            break;
    }
    return true;
});
