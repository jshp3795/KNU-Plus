if (!window.__KNUPLUS_SETTINGS__) {
    const knuPlusSettings = document.documentElement.getAttribute("data-knuplus-settings");
    if (knuPlusSettings) {
        window.__KNUPLUS_SETTINGS__ = JSON.parse(knuPlusSettings);
        document.documentElement.setAttribute("data-knuplus-settings", "window.__KNUPLUS_SETTINGS__");
    }
}

if (window.__KNUPLUS_SETTINGS__) {
    if (window.__KNUPLUS_SETTINGS__.account.passkeyLogin) {
        window.addEventListener("message", (event) => {
            if (event.origin.startsWith("chrome-extension://")) {
                const { id, password, type } = JSON.parse(event.data);

                if (type === "login") {
                    document.getElementById("idpw_id").value = id;
                    document.getElementById("idpw_pw").value = password;

                    const form = document.getElementById("form-idpw-login");
                    form.action = "https://knusso.knu.ac.kr/authentication/idpw/loginProcess";
                    form.submit();
                }
            }
        });
    }
}
