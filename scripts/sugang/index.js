if (!window.__KNUPLUS_SETTINGS__) {
    const knuPlusSettings = document.documentElement.getAttribute("data-knuplus-settings");
    if (knuPlusSettings) {
        window.__KNUPLUS_SETTINGS__ = JSON.parse(knuPlusSettings);
        document.documentElement.setAttribute("data-knuplus-settings", "window.__KNUPLUS_SETTINGS__");
    }
}

if (window.__KNUPLUS_SETTINGS__) {
    // 특수 키 입력 허용
    if (window.__KNUPLUS_SETTINGS__.miscellaneous.allowFunctionKeys) {
        $(document).unbind("keydown");
        document.oncontextmenu = () => {};
    }

    // 로그인 된 상태
    if (location.pathname === "https://sugang.knu.ac.kr/web/stddm/lssrq/sugang/appcr.knu") {
        // 자동 로그아웃 타이머 비활성화
        if (window.__KNUPLUS_SETTINGS__.sugang.disableAutoLogout) {
            clearInterval(logOutTimer.timerObj);
            document.getElementById("lbl_sessionTimeOutDisp").innerText = "99:00";
        }
    }
}
