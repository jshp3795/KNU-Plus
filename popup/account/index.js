document.oncontextmenu = (event) => false;

document.getElementById("navigate-back").addEventListener("click", (event) => {
    location.href = "/popup/index.html";
});

// SETTINGS_DEFAULTS
const defaults = {
    passkeyLogin: false,
    autoLogin: false,
    knu10AutoLogin: false
};

class Settings {
    _category;
    constructor(category) {
        this._category = category;
    }

    get(name) {
        return new Promise((resolve) => {
            chrome.storage.sync.get(this._category, async (items) => {
                items = items[this._category] || {};

                const settings = { ...defaults };
                for (const setting of Object.keys(settings)) {
                    // 기존 설정이 있다면 사용, 없다면 기본값
                    if (setting in items) {
                        settings[setting] = items[setting];
                    }
                }

                if (name !== undefined) {
                    // name을 지정하였다면 해당 값 반환
                    resolve(settings[name]);
                } else {
                    // name을 지정하지 않았다면 전체 값 반환
                    resolve(settings);
                }
            });
        });
    }

    set(name, value) {
        return new Promise(async (resolve) => {
            if (!(name in defaults)) return resolve(false);

            const settings = await this.get();
            settings[name] = value;
            chrome.storage.sync.set({ [this._category]: settings }, () => {
                resolve(true);
            });
        });
    }
}

const settings = new Settings(location.pathname.split("/")[2]);

settings.get().then(set => {
    for (const element of document.getElementsByClassName("toggle-item")) {
        const name = element.getAttribute("data-name");
        let enabled = set[name];
        element.setAttribute("data-enabled", enabled.toString());

        const box = element.getElementsByClassName("item-togglebox")[0];
        box.addEventListener("click", (event) => {
            enabled = !enabled;
            element.setAttribute("data-enabled", enabled.toString());
            settings.set(name, enabled);
            set[name] = enabled; // client side update required

            if (name === "passkeyLogin") {
                chrome.storage.local.remove("credentials");
                document.getElementById("knuplus_input_id").parentElement.style.display = "none";
                document.getElementById("knuplus_input_password").parentElement.style.display = "none";
                document.getElementById("knuplus_registerpasskey").style.display = "none";
                document.getElementById("knuplus_deleteaccount").style.display = "none";
                document.getElementById("knuplus_registeraccount").style.display = "inherit";
            }
        });
    }

    let id = null, password = null;

    document.getElementById("knuplus_registeraccount").addEventListener("click", (event) => {
        const text = set.passkeyLogin ?
            "입력하신 비밀번호는 로그인 서비스 제공을 위해 원본 비밀번호가 확인 가능한 형태로 기기와 패스키에 나누어 저장되기 때문에 이 기기와 패스키가 등록된 기기를 함께 도난당할 경우 패스키 인증 여부와 관계없이 노출될 수 있습니다" :
            "입력하신 비밀번호는 로그인 서비스 제공을 위해 원본 비밀번호가 확인 가능한 형태로 저장되기 때문에 기기를 도난당할 경우 노출될 수 있습니다";

        if (confirm(text)) {
            document.getElementById("knuplus_registeraccount").style.display = "none";
            const idInput = document.getElementById("knuplus_input_id");
            idInput.value = "";
            idInput.parentElement.style.display = "inherit";
            idInput.focus();
            id = null;
            password = null;
        }
    });

    const idInputButton = document.getElementById("knuplus_inputbutton_id");
    idInputButton.addEventListener("click", (event) => {
        const idInput = document.getElementById("knuplus_input_id");
        id = idInput.value;
        idInput.parentElement.style.display = "none";
        idInput.value = "";
        const passwordInput = document.getElementById("knuplus_input_password");
        passwordInput.value = "";
        passwordInput.parentElement.style.display = "inherit";
        passwordInput.focus();
    });
    document.getElementById("knuplus_input_id").addEventListener("keyup", (event) => {
        if (event.key === "Enter") idInputButton.click();
    });

    const passwordInputButton = document.getElementById("knuplus_inputbutton_password");
    passwordInputButton.addEventListener("click", async (event) => {
        const passwordInput = document.getElementById("knuplus_input_password");
        password = passwordInput.value;
        passwordInput.value = "";
        passwordInput.parentElement.style.display = "none";
        if (set.passkeyLogin) {
            // 패스키 등록이 필요한 경우 (패스키 버튼에서 저장)
            document.getElementById("knuplus_registerpasskey").style.display = "inherit";
        } else {
            // 패스키 등록이 필요하지 않은 경우 (즉시 저장)
            const [ encrypted, key, iv ] = await encryptPassword(password);
            saveAccount(id, encrypted, [ key, iv ].join(":"), "idp");

            const deleteAccountElement = document.getElementById("knuplus_deleteaccount");
            deleteAccountElement.innerText = "계정 삭제: " + id;
            deleteAccountElement.style.display = "inherit";
        }
    });
    document.getElementById("knuplus_input_password").addEventListener("keyup", (event) => {
        if (event.key === "Enter") passwordInputButton.click();
    });

    document.getElementById("knuplus_registerpasskey").addEventListener("click", async (event) => {
        if (!id || !password) return;

        const [ encrypted, key, iv ] = await encryptPassword(password);

        const credentialId = await createPasskey(id, key);
        saveAccount(id, encrypted, [ credentialId, iv ].join(":"), "passkey");

        document.getElementById("knuplus_registerpasskey").style.display = "none";

        const deleteAccountElement = document.getElementById("knuplus_deleteaccount");
        deleteAccountElement.innerText = "계정 삭제: " + id;
        deleteAccountElement.style.display = "inherit";
    });

    document.getElementById("knuplus_deleteaccount").addEventListener("click", async (event) => {
        const deleteAccount = confirm("정말로 등록된 계정을 삭제하시겠습니까?" + (set.passkeyLogin ? " 계정 재등록 시 패스키 재인증이 필요합니다." : ""));
        if (deleteAccount) {
            chrome.storage.local.remove("credentials", () => {
                if (chrome.runtime.lastError) {
                    alert(chrome.runtime.lastError.message);
                    return;
                }

                document.getElementById("knuplus_deleteaccount").style.display = "none";
                document.getElementById("knuplus_registeraccount").style.display = "inherit";
            });
        }
    });
});

chrome.storage.local.get("credentials").then(({ credentials }) => {
    if (credentials) {
        const deleteAccountElement = document.getElementById("knuplus_deleteaccount");
        deleteAccountElement.innerText = "계정 삭제: " + credentials.id;
        deleteAccountElement.style.display = "inherit";
    } else {
        const registerAccountElement = document.getElementById("knuplus_registeraccount");
        registerAccountElement.style.display = "inherit";
    }
});

async function createPasskey(name, data) {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const publicKey = {
        challenge,
        rp: {
            name: "KNU+ 통합인증 시스템 로그인"
        },
        user: {
            id: Uint8Array.from(data, c => c.charCodeAt(0)),
            name,
            displayName: name
        },
        pubKeyCredParams: [
            {
                type: "public-key",
                alg: -7
            },
            {
                type: "public-key",
                alg: -257
            }
        ],
        authenticatorSelection: {
            userVerification: "required"
        }
    };

    const credential = await navigator.credentials.create({ publicKey });

    return credential.id;
}

function generateKey() {
    return crypto.subtle.generateKey(
        { name: "AES-CBC", length: 256 },
        true,
        [ "encrypt" ]
    );
}

async function encryptPassword(text) {
    const key = await generateKey();
    const iv = new Uint8Array(16);
    crypto.getRandomValues(iv);

    const exported = await crypto.subtle.exportKey("jwk", key);
    const encrypted = await crypto.subtle.encrypt({ name: "AES-CBC", iv }, key, new TextEncoder().encode(text));

    return [
        Array.from(new Uint8Array(encrypted))
            .map(b => b.toString(16).padStart(2, "0"))
            .join(""),
        exported.k,
        Array.from(iv)
            .map(b => b.toString(16).padStart(2, "0"))
            .join("")
    ];
}

function saveAccount(id, data, key, type) {
    chrome.storage.local.set({
        credentials: {
            id,
            data,
            key,
            type
        }
    });
}
