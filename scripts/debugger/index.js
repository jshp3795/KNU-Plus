if (!window.__KNUPLUS_SETTINGS__) {
    const knuPlusSettings = document.documentElement.getAttribute("data-knuplus-settings");
    if (knuPlusSettings) {
        window.__KNUPLUS_SETTINGS__ = JSON.parse(knuPlusSettings);
        document.documentElement.setAttribute("data-knuplus-settings", "window.__KNUPLUS_SETTINGS__");
    }
}

if (window.__KNUPLUS_SETTINGS__) {
    // 디버거 breakpoint 방지
    if (window.__KNUPLUS_SETTINGS__.miscellaneous.antiDebugger) {
        const oldEval = window.eval;
        window.eval = (script) => {
            if (script.includes("debugger;")) return;
            return oldEval(script);
        };
    }
}
