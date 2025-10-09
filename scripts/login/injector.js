getSettings().then((settings) => {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("scripts/login/index.js");
    document.documentElement.appendChild(script);
    script.remove();

    if (settings.miscellaneous.passkeyLogin) {
        const tabWrapper = document.getElementsByClassName("login_wrap")[0];
        const loginWrapper = document.getElementsByClassName("login-cont")[0];

        const newTab = document.createElement("li");
        newTab.classList.add("active");
        newTab.style.width = "25%";
        newTab.addEventListener("click", (event) => {
            newTab.classList.add("active");
            for (const tab of tabWrapper.children) {
                if (tab !== newTab)
                    tab.classList.remove("active");
            }

            frame.style.display = "block";
            for (const login of loginWrapper.children) {
                if (login instanceof HTMLDivElement) {
                    login.style.display = "none";
                }
            }
        });

        const newTabA = document.createElement("a");
        newTabA.innerText = "패스키 로그인";
        newTab.appendChild(newTabA);

        for (const tab of tabWrapper.children) {
            tab.classList.remove("active");
            tab.style.width = "25%";
            tab.addEventListener("click", (event) => {
                newTab.classList.remove("active");
                frame.style.display = "none";
            });
        }

        tabWrapper.appendChild(newTab);

        for (const login of loginWrapper.children) {
            if (login instanceof HTMLDivElement) {
                login.style.display = "none";
            }
        }

        const frame = document.createElement("iframe");
        frame.src = chrome.runtime.getURL("scripts/login/tab.html");
        frame.allow = "publickey-credentials-get *";
        frame.style.height = "50px";
        frame.style.backgroundColor = "#DC2329";
        frame.style.borderRadius = "5px";
        document.getElementsByClassName("login-cont")[0].appendChild(frame);
    } else if (settings.miscellaneous.autoLogin) {
        chrome.storage.local.get("credentials").then(async ({ credentials }) => {
            if (!credentials) return;

            if (credentials.type === "idp") {
                const [ key, iv ] = credentials.key.split(":");
                const password = await decryptPassword(credentials.data, key, iv);
                document.getElementById("idpw_id").value = credentials.id;
                document.getElementById("idpw_pw").value = password;

                const form = document.getElementById("form-idpw-login");
                form.action = "https://knusso.knu.ac.kr/authentication/idpw/loginProcess";
                form.submit();
            }
        });
    }
});

async function decryptPassword(text, key, iv) {
    key = atob(key.replace(/-/g, "+").replace(/_/g, "/"));

    key = await crypto.subtle.importKey("raw", Uint8Array.from(key, c => c.charCodeAt(0)), "AES-CBC", false, [ "decrypt" ]);
    iv = new Uint8Array(new Uint8Array(iv.match(/.{2}/g).map(byte => parseInt(byte, 16))));

    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-CBC", iv },
        key,
        new Uint8Array(text.match(/.{2}/g).map(byte => parseInt(byte, 16)))
    );

    return new TextDecoder().decode(decrypted);
}
