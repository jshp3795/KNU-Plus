function getSettings() {
    // SETTINGS_DEFAULTS
    const defaults = {
        schedule: {
            forceEnable: true,
            newTab: true,
            realTime: true,
            forceContacts: true
        },
        information: {
            disableAutoLogout: true,
            disable2fa: true
        },
        score: {
            forceEnable: true,
            disableAutoLogout: true
        },
        sugang: {
            autoCaptcha: true,
            disableAutoLogout: true
        },
        lms: {
            notification: true,
            knu10ForceEnable: true
        },
        dormitory: {
            forceEnableAcceptance: true,
            forceEnablePayment: true,
            forceEnableAssignment: true,
            rememberPageNumber: true,
            disableAutoLogout: true
        },
        account: {
            passkeyLogin: false,
            autoLogin: false,
            knu10AutoLogin: false
        },
        miscellaneous: {
            allowFunctionKeys: true,
            antiDebugger: true
        }
    };

    return new Promise((resolve) => {
        chrome.storage.sync.get(Object.keys(defaults), (items) => {
            for (const key of Object.keys(defaults)) {
                items[key] = items[key] || {};

                const settings = { ...defaults[key] };
                for (const setting of Object.keys(settings)) {
                    // 기존 설정이 있다면 사용, 없다면 기본값
                    if (setting in items[key]) {
                        settings[setting] = items[key][setting];
                    }
                }

                items[key] = settings;
            }

            // 설정을 documentElement에 저장
            if (!document.documentElement.getAttribute("data-knuplus-settings"))
                document.documentElement.setAttribute(`data-knuplus-settings`, JSON.stringify(items));

            resolve(items);
        });
    });
}
