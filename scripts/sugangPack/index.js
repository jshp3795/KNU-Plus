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

    // 자동 로그아웃 타이머 비활성화
    if (window.__KNUPLUS_SETTINGS__.score.disableAutoLogout) {
        clearInterval(logOutTimer.timerObj);
        document.getElementById("lbl_sessionTimeOutDisp").innerText = "99:00";
    }
}
