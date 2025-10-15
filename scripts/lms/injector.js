getSettings().then((settings) => {
    const font = document.createElement("link");
    font.rel = "stylesheet";
    font.href = chrome.runtime.getURL("popup/pretendard.css");
    document.documentElement.appendChild(font);
    const style = document.createElement("link");
    style.rel = "stylesheet";
    style.href = chrome.runtime.getURL("scripts/lms/index.css");
    document.documentElement.appendChild(style);

    const notificationContainer = document.createElement("div");
    notificationContainer.classList.add("notification-container");
    document.documentElement.appendChild(notificationContainer);

    async function fetchUnreadConversations() {
        const conversationsResponse = await fetch("https://canvas.knu.ac.kr/api/v1/conversations?scope=unread&per_page=5")
            .then(res => res.text());
        const conversations = JSON.parse(conversationsResponse.replace("while(1);", ""));
        return conversations;
    }

    async function pollConversations() {
        const oldConversations = await fetchUnreadConversations();
        if (oldConversations.status === "인증되지 않음") {
            return false;
        }

        // 30초 이내에 수신된 메시지는 표시, 최근 것부터 순서대로 알림을 보내야하기 때문에 메시지 순서를 뒤집어서 확인
        for (const conversation of oldConversations.toReversed()) {
            if (Date.now() - Date.parse(conversation.last_message_at) < 300000) {
                notifyConversation(conversation, false);
            }
        }
        const cachedIds = oldConversations.map(convo => convo.id);

        // 5초에 한 번씩 메시지 동기화
        const pollInterval = setInterval(async () => {
            const conversations = await fetchUnreadConversations();
            if (conversations.status === "인증되지 않음") {
                clearInterval(pollInterval);
                return;
            }

            // 읽은 메시지가 있다면 알림에서 삭제하기
            for (const notification of document.getElementsByClassName("notification")) {
                if (conversations.every(convo => convo.id !== parseInt(notification.getAttribute("data-id")))) {
                    notification.style.transform = "";
                    setTimeout(() => {
                        notification.parentElement.remove();
                    }, 700);
                }
            }

            // 최근 것부터 순서대로 알림을 보내야하기 때문에 메시지 순서를 뒤집어서 확인
            let i = 0;
            for (const conversation of conversations.toReversed()) {
                if (cachedIds.includes(conversation.id)) continue;
                cachedIds.push(conversation.id);

                // 알림마다 1초 대기 (why not?)
                setTimeout(() => {
                    notifyConversation(conversation, true);
                }, 1000 * (i++));
            }
        }, 5000);
        return pollInterval;
    }

    function notifyConversation(conversation, live) {
        console.log("New conversation: ", conversation);

        let notificationType = 3;
        if (conversation.audience[0] === 1 && conversation.subject.endsWith("스마트 출결이 시작되었습니다.")) {
            notificationType = 0; // 스마트출결
        } else if (conversation.audience[0] === 1 && conversation.subject.includes("'강의자료실' 에 새로운 글이 등록되었습니다. - New post registered")) {
            notificationType = 1; // 강의자료실 업로드
        } else if (conversation.audience[0] === 96268) {
            notificationType = 1; // 강의실 업로드
        } else if (conversation.audience[0] === 139185) {
            notificationType = 2; // 과제 마감 전 스마트 알림
        }

        // 이미 확인한 메시지 (알림을 눌러서 들어간 경우)
        if (!live && notificationType === 3 && location.href === "https://canvas.knu.ac.kr/conversations#filter=type=unread") return;

        const colors = [ "green", "red", "fire", "orange" ];
        const icons = [
            `<svg class="notification-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.25 4.533A9.707 9.707 0 0 0 6 3a9.735 9.735 0 0 0-3.25.555.75.75 0 0 0-.5.707v14.25a.75.75 0 0 0 1 .707A8.237 8.237 0 0 1 6 18.75c1.995 0 3.823.707 5.25 1.886V4.533ZM12.75 20.636A8.214 8.214 0 0 1 18 18.75c.966 0 1.89.166 2.75.47a.75.75 0 0 0 1-.708V4.262a.75.75 0 0 0-.5-.707A9.735 9.735 0 0 0 18 3a9.707 9.707 0 0 0-5.25 1.533v16.103Z" />
            </svg>`,
            `<svg class="notification-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path fill-rule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625ZM7.5 15a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 15Zm.75 2.25a.75.75 0 0 0 0 1.5H12a.75.75 0 0 0 0-1.5H8.25Z" clip-rule="evenodd" />
                <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
            </svg>`,
            `<svg class="notification-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path fill-rule="evenodd" d="M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.176 7.547 7.547 0 0 1-1.705-1.715.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248ZM15.75 14.25a3.75 3.75 0 1 1-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 0 1 1.925-3.546 3.75 3.75 0 0 1 3.255 3.718Z" clip-rule="evenodd" />
            </svg>`,
            `<svg class="notification-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path fill-rule="evenodd" d="M4.804 21.644A6.707 6.707 0 0 0 6 21.75a6.721 6.721 0 0 0 3.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 0 1-.814 1.686.75.75 0 0 0 .44 1.223ZM8.25 10.875a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25ZM10.875 12a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Zm4.875-1.125a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25Z" clip-rule="evenodd" />
            </svg>`
        ];

        const notification = document.createElement("div");
        notification.innerHTML = `
            <div class="notification" data-id="">
                %ICON%
                <div class="notification-info">
                    <span class="notification-title"></span>
                    <span class="notification-description"></span>
                </div>
            </div>
        `.replace("%ICON%", icons[notificationType]);

        const notif = notification.getElementsByClassName("notification")[0];
        notif.classList.add("notification-" + colors[notificationType]);
        notif.setAttribute("data-id", conversation.id);
        notification.getElementsByClassName("notification-title")[0].textContent = conversation.subject;
        notification.getElementsByClassName("notification-description")[0].textContent = conversation.last_message;

        // 새로운 알림이 들어올 때 기존 알림이 아래로 부드럽게 내려가는 애니메이션
        if (live) {
            const translatedNotifications = [];
            for (const noti of document.getElementsByClassName("notification")) {
                noti.style.transition = "transform 0ms cubic-bezier(0.22, 1, 0.36, 1)";
                noti.style.transform = "translateY(-76px)";
                translatedNotifications.push(noti);
            }

            setTimeout(() => {
                for (const noti of translatedNotifications) {
                    noti.style.transition = "";
                    noti.style.transform = "translateX(0px)";
                }
            }, 300);
        }

        notificationContainer.appendChild(notification);
        
        notification.addEventListener("click", async (event) => {
            notification.getElementsByClassName("notification")[0].style.transform = "";

            switch (notificationType) {
                case 0:
                    // 스마트출결
                    fetch("https://canvas.knu.ac.kr/api/v1/conversations/" + conversation.id);
                    location.href = `https://canvas.knu.ac.kr/courses/${conversation.context_code.split("_")[1]}/external_tools/54`;
                    break;
                case 1:
                    if (conversation.audience[0] === 1) {
                        // 강의자료실 업로드
                        fetch("https://canvas.knu.ac.kr/api/v1/conversations/" + conversation.id);
                        location.href = `https://canvas.knu.ac.kr/courses/${conversation.context_code.split("_")[1]}/external_tools/28`;
                    } else {
                        // 강의실 업로드
                        const convoString = await fetch("https://canvas.knu.ac.kr/api/v1/conversations/" + conversation.id).then(res => res.text());
                        const convo = JSON.parse(convoString.replace("while(1);", ""));
                        location.href = convo.messages[0].body.split("- 학습요소 바로가기 : \n    ")[1];
                    }
                    break;
                case 2:
                    // 과제 마감 전 스마트 알림
                    const convoString = await fetch("https://canvas.knu.ac.kr/api/v1/conversations/" + conversation.id).then(res => res.text());
                    const convo = JSON.parse(convoString.replace("while(1);", ""));
                    location.href = convo.messages[0].body.split("- 학습 요소 바로가기: ")[1].replace("\n", "");
                    break;
                case 3:
                    if (location.href === "https://canvas.knu.ac.kr/conversations#filter=type=unread") {
                        // 현재 읽지 않은 메시지함에 있는 경우 새로고침
                        location.reload();
                    } else {
                        // 현재 메시지함에 있는 경우 알림이 사라지는 애니메이션이 모두 재생된 이후 읽지 않은 메시지 페이지로 이동
                        setTimeout(() => {
                            location.href = "https://canvas.knu.ac.kr/conversations#filter=type=unread";
                        }, location.pathname === "/conversations" ? 700 : 0);
                    }
                    break;
            }

            setTimeout(() => {
                notification.remove();
            }, 700);
        });

        if (live) {
            setTimeout(() => {
                requestAnimationFrame(() => {
                    notification.getElementsByClassName("notification")[0].style.transform = "translateX(0px)";
                });
            }, 300);
        } else {
            notification.getElementsByClassName("notification")[0].style.transform = "translateX(0px)";
        }
    }

    if (settings.lms.notification) {
        pollConversations();
    }

    window.addEventListener("message", async (event) => {
        const { data } = event;
        if (data.from !== "page") return;

        if (data.type === "VIDEO_ATTEND" && event.origin === "https://lcms.knu.ac.kr") {
            // Popup -> IFrame ContentScript (iframe_injector.js) -> IFrame Page (iframe.js) -> [ Main ContentScript (injector.js) ] -> IFrame ContentScript (iframe_injector.js) -> Popup

            const { lmsUrl, lmsState, currentState, startTime, endTime, page, totalPages, cumulativePage } = data.data;

            // 영상을 재생하지 않은 상태, 시청 시작 패킷을 먼저 보내주어야 함
            if (currentState === lmsState.PLAYING) {
                const payload = new URLSearchParams({
                    callback: "", // can be blank
                    state: lmsState.PLAYING, // 시청 시작
                    duration: endTime,
                    currentTime: startTime,
                    cumulativeTime: startTime,
                    page: page,
                    totalpage: totalPages,
                    cumulativePage: cumulativePage,
                    _: Date.now()
                });
                await fetch(lmsUrl + "&" + payload.toString());

                // wait 1s for the server to recognize the session
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // 시청 중 패킷
            const payload = new URLSearchParams({
                callback: "", // can be blank
                state: lmsState.UPDATE_DATA, // 시청 중
                duration: endTime,
                currentTime: endTime,
                cumulativeTime: endTime,
                page: totalPages,
                totalpage: totalPages,
                cumulativePage: cumulativePage,
                _: Date.now()
            });
            await fetch(lmsUrl + "&" + payload.toString());

            // 시청 완료 패킷
            payload.set("state", lmsState.CONTENT_END); // 시청 완료
            payload.set("_", Date.now());
            await fetch(lmsUrl + "&" + payload.toString());

            // 시청 페이지 이탈 패킷
            payload.set("state", lmsState.UNLOAD); // 시청 페이지 이탈
            payload.set("_", Date.now());
            await fetch(lmsUrl + "&" + payload.toString());

            const toolContent = document.getElementById("tool_content");
            const videoFrame = toolContent.contentDocument.getElementsByClassName("xnlailvc-commons-frame")[0];
            videoFrame.contentWindow.postMessage({ from: "contentScript", type: "VIDEO_ATTEND" }, "https://lcms.knu.ac.kr");

            // 학습 진행 상태 새로고침
            toolContent.contentDocument.getElementsByClassName("xnvc-progress-info-refresh_button")[0].click();
            toolContent.contentWindow.scrollBy({ top: toolContent.contentDocument.body.scrollHeight, behavior: "smooth" });
        }
    });
});
