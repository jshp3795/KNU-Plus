if (!window.__KNUPLUS_SETTINGS__) {
    const knuPlusSettings = document.documentElement.getAttribute("data-knuplus-settings");
    if (knuPlusSettings) {
        window.__KNUPLUS_SETTINGS__ = JSON.parse(knuPlusSettings);
        document.documentElement.setAttribute("data-knuplus-settings", "window.__KNUPLUS_SETTINGS__");
    }
}

if (window.__KNUPLUS_SETTINGS__) {
    const old = window.WebSquare;
    window.WebSquare = new Proxy(old, {
        set(target, property, value) {
            if (property === "scope_obj" && value?.id && value?.scope) onScopeObjectUpdate(value);
            target[property] = value;
            return true;
        }
    });

    let timerPatched = false, twofaPatched = false;
    function onScopeObjectUpdate(self) {
        // 자동 로그아웃 타이머 비활성화
        if (window.__KNUPLUS_SETTINGS__.information.disableAutoLogout && !timerPatched) {
            timerPatched = true;
            const oldSetInterval = $p.setInterval;
            $p.setInterval = (func, options) => {
                if (options.key === "dispSessionTimeOutRemainInterval") {
                    document.getElementById("lbl_sessionTimeOutDisp").innerText = "99:00";
                    return null;
                } else {
                    return oldSetInterval(func, options);
                }
            };
        }

        // 2차 인증 비활성화
        if (window.__KNUPLUS_SETTINGS__.information.disable2fa && !twofaPatched) {
            twofaPatched = true;
            com_page.secondAuth = (callback, always) => {
                scwin[callback](true);
            };
        }
    }
}
