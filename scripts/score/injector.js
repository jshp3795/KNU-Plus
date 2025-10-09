getSettings().then((settings) => {
    if (settings.score.disableAutoLogout && location.pathname === "/grads/login.knu") {
        // 로그인 되어있는 상태인지 확인
        fetch("https://lssrq.knu.ac.kr/grads?login=true", {
            headers: {
                accept: "text/html"
            }
        })
            .then(res => {
                // 로그인 되어있는 상태라면 로그인 스킵
                if (res.redirected && res.url === "https://lssrq.knu.ac.kr/web/stddm/lssrq/sugang/termGradsInqr.knu")
                    location.href = "https://lssrq.knu.ac.kr/web/stddm/lssrq/sugang/termGradsInqr.knu";
            });
    }

    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("scripts/score/index.js");
    document.documentElement.appendChild(script);
    script.remove();
});
