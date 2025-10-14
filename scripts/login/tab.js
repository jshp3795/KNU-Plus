let credentialInfo = null;
document.getElementById("knuplus_login").addEventListener("click", async (event) => {
    if (!credentialInfo) {
        alert("KNU+ 확장 프로그램의 계정 탭에서 통합인증 시스템의 아이디와 비밀번호를 먼저 등록해주세요.");
        return;
    }
    if (credentialInfo.type !== "passkey") {
        alert("KNU+ 확장 프로그램의 계정 탭에서 패스키를 먼저 등록해주세요.");
        return;
    }

    const [ credentialId, iv ] = credentialInfo.key.split(":");
    const key = await getPasskey(credentialId);
    const password = await decryptPassword(credentialInfo.data, key, iv);

    window.parent.postMessage(JSON.stringify({
        id: credentialInfo.id,
        password,
        type: "login"
    }), "https://appfn.knu.ac.kr");
});

chrome.storage.local.get("credentials").then(({ credentials }) => {
    if (!credentials) return;

    credentialInfo = credentials;
    if (credentials.type === "passkey") {
        chrome.storage.sync.get("account", ({ account }) => {
            if (account && account.autoLogin) {
                // 자동 로그인, 패스키 로그인이 켜져있고 패스키 등록이 되어있는 경우
                document.getElementById("knuplus_login").click();
            }
        });
    }
});

async function getPasskey(credentialId) {
    credentialId = atob(credentialId.replace(/-/g, "+").replace(/_/g, "/"));

    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const credential = await navigator.credentials.get({
        publicKey: {
            challenge,
            allowCredentials: [{
                id: Uint8Array.from(credentialId, c => c.charCodeAt(0)),
                type: "public-key"
            }],
            userVerification: "required"
        }
    });

    return new TextDecoder().decode(credential.response.userHandle);
}

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
