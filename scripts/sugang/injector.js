getSettings().then((settings) => {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("scripts/sugang/index.js");
    document.documentElement.appendChild(script);
    script.remove();

    // 로그인 된 상태
    if (location.pathname === "/web/stddm/lssrq/sugang/appcr.knu") {
        // 수강신청 캡챠 자동 입력
        if (settings.sugang.autoCaptcha) {
            const captchaElement = document.getElementById("schCapcha");
            captchaElement.addEventListener("load", async () => {
                const canvas = document.createElement("canvas");
                canvas.width = captchaElement.naturalWidth;
                canvas.height = captchaElement.naturalHeight;

                const ctx = canvas.getContext("2d");
                ctx.drawImage(captchaElement, 0, 0);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const captcha = await solveCaptcha(imageData);

                document.getElementById("schCapcha2").value = captcha;

                // 캡챠가 올바른지 검증
                const captchaResponse = await fetch("/web/stddm/lssrq/captcha/checkcaptcha/" + captcha).then(res => res.json());
                if (!captchaResponse.data) {
                    // 캡챠가 올바르지 않다면 새로고침
                    document.getElementById("btnChange").click();
                }
            });
        }
    }
});
