window.addEventListener("message", (event) => {
    const { data } = event;
    if (data.from !== "contentScript") return;

    switch (data.type) {
        case "VIDEO_INFO":
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
            window.postMessage({ from: "page", type: "VIDEO_INFO", data }, { targetOrigin: "https://lcms.knu.ac.kr" });
            break;
    }
});
