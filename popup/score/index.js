document.oncontextmenu = (event) => false;

document.getElementById("navigate-back").addEventListener("click", (event) => {
    location.href = "/popup/index.html";
});

let disableAutoLogout = true;

document.getElementById("navigate-open").addEventListener("click", (event) => {
    // https://score.knu.ac.kr/ 리디렉션 캐시 문제 때문에 최종 URL로 이동
    window.open(
        disableAutoLogout ?
            "https://lssrq.knu.ac.kr/web/stddm/lssrq/sugang/termGradsInqr.knu" : // 로그인 유지
            "https://lssrq.knu.ac.kr/grads/login.knu" // 로그인 페이지
    );
});

// SETTINGS_DEFAULTS
const defaults = {
    forceEnable: true,
    disableAutoLogout: true
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
    disableAutoLogout = set.disableAutoLogout;
    for (const element of document.getElementsByClassName("toggle-item")) {
        const name = element.getAttribute("data-name");
        let enabled = set[name];
        element.setAttribute("data-enabled", enabled.toString());

        const box = element.getElementsByClassName("item-togglebox")[0];
        box.addEventListener("click", (event) => {
            enabled = !enabled;
            element.setAttribute("data-enabled", enabled.toString());
            settings.set(name, enabled);
        });
    }
});
