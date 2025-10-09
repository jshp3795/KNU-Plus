if (!window.__KNUPLUS_SETTINGS__) {
    const knuPlusSettings = document.documentElement.getAttribute("data-knuplus-settings");
    if (knuPlusSettings) {
        window.__KNUPLUS_SETTINGS__ = JSON.parse(knuPlusSettings);
        document.documentElement.setAttribute("data-knuplus-settings", "window.__KNUPLUS_SETTINGS__");
    }
}

if (window.__KNUPLUS_SETTINGS__) {
    // 강의계획서 미리보기
    if (window.__KNUPLUS_SETTINGS__.schedule.forceEnable) {
        const old = window.WebSquare;
        window.WebSquare = new Proxy(old, {
            set(target, property, value) {
                if (value?.id === "tabContentMain_contents_tabPgmMNU0010656_body") {
                    value.scope.scwin.checkYearSmstr = () => true;
                } else if (window.scwin) {
                    scwin.checkYearSmstr = () => true;
                }
                target[property] = value;
                return true;
            }
        });
    }

    // 강의계획서를 새 창 대신 새 탭에 개수 제한 없이 열기
    if (window.__KNUPLUS_SETTINGS__.schedule.newTab) {
        const oldOpen = window.open;
        window.open = (url, target, windowFeatures) => {
            if (target === "publicLectPlnInputDtlPop" || target === "tabContentMain_contents_tabPgmMNU0010656_body_lectPlnInputDtlPop")
                return oldOpen(url);
            return oldOpen(url, target, windowFeatures);
        };
    }
}
