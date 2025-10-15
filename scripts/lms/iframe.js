window.addEventListener("message", (event) => {
    const { data } = event;
    if (data.from !== "contentScript") return;

    switch (data.type) {
        case "VIDEO_INFO": {
            const stories = window.uniPlayerConfig.getContentPlayingInfoData().storyList.filter(story => !story.isIntro);
            if (stories.length === 0) {
                break;
            }

            const list = stories[0].mainMediaList.list;
            if (list.length === 0) {
                break;
            }

            const url = list[0].desktopMediaUri;
            const data = {
                url,
                title: window.uniPlayerConfig.getContentMetadata().title
            };
            window.postMessage({ from: "page", type: "VIDEO_INFO", data }, "https://lcms.knu.ac.kr");
            break;
        }
        case "VIDEO_ATTEND": {
            if (event.origin !== "https://lcms.knu.ac.kr") return;

            // Popup -> IFrame ContentScript (iframe_injector.js) -> [ IFrame Page (iframe.js) ] -> Main ContentScript (injector.js) -> IFrame ContentScript (iframe_injector.js) -> Popup

            const duration = window.GetTotalDuration();
            const data = {
                lmsUrl: window.lms_url,
                lmsState: window.LMSState,
                currentState: duration === 0 ? window.LMSState.PLAYING : window.LMSState.UPDATE_DATA,
                startTime: parseFloat(window.uniPlayerConfig.getContentPlayingInfoData().contentStartTime),
                endTime: duration === 0 ? window.uniPlayerConfig.getContentPlayingInfoData().getContentDuration() : duration,
                page: window.GetCurrentPage(),
                totalPages: window.GetTotalPage(),
                cumulativePage: window.GetCumulativePage()
            };

            // 학습 진행 상태 업데이트 비활성화
            window.mod_xncommons_track = (lmsState, curPos, cumulativeTime, callback) => {
                console.log("Intercepted progress update:", lmsState, curPos, cumulativeTime, callback);
            };

            window.top.postMessage({ from: "page", type: "VIDEO_ATTEND", data }, "https://canvas.knu.ac.kr");
            break;
        }
    }
});
