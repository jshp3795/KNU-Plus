if (!window.__KNUPLUS_SETTINGS__) {
    const knuPlusSettings = document.documentElement.getAttribute("data-knuplus-settings");
    if (knuPlusSettings) {
        window.__KNUPLUS_SETTINGS__ = JSON.parse(knuPlusSettings);
        document.documentElement.setAttribute("data-knuplus-settings", "window.__KNUPLUS_SETTINGS__");
    }
}

if (window.__KNUPLUS_SETTINGS__) {
    if (window.__KNUPLUS_SETTINGS__.miscellaneous.disable2fa) {
        let patched = false;

        const old = window.WebSquare;
        window.WebSquare = new Proxy(old, {
            set(target, property, value) {
                if (property === "scope_obj" && value?.id && value?.scope && !patched) onScopeObjectUpdate(value);
                target[property] = value;
                return true;
            }
        });

        function onScopeObjectUpdate(self) {
            patched = true;
            com_page.secondAuth = (callback, always) => {
                scwin[callback](true);
            };
        }
    }
}
