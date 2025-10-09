if (!window.__KNUPLUS_SETTINGS__) {
    const knuPlusSettings = document.documentElement.getAttribute("data-knuplus-settings");
    if (knuPlusSettings) {
        window.__KNUPLUS_SETTINGS__ = JSON.parse(knuPlusSettings);
        document.documentElement.setAttribute("data-knuplus-settings", "window.__KNUPLUS_SETTINGS__");
    }
}

if (window.__KNUPLUS_SETTINGS__) {
    if (window.__KNUPLUS_SETTINGS__.miscellaneous.passkeyLogin && location.pathname === "/ctl/mainHome") {
        window.addEventListener("message", (event) => {
            if (event.origin.startsWith("chrome-extension://")) {
                const { id, password, type } = JSON.parse(event.data);

                if (type === "login") {
                    login(id, password);
                }
            }
        });
    }

    if (window.__KNUPLUS_SETTINGS__.lms.knu10ForceEnable &&
        ["/crs/creCrsLect/Form/classRoomMainForm", "/lesson/lessonLect/Form/creLessonCntsView"].includes(location.pathname)) {
        const old = window.otpCertModal;
        window.otpCertModal = (lessonCntsId, otpLoginType, lessonStartDttm) => {
            return old(lessonCntsId, otpLoginType, "20250101000000");
        };
    }
}

function login(id, password, univCode) {
    univCode = univCode ?? "CO00005"; // 경북대학교는 univCode가 CO00005

    // document.getElementById("loading_page").style.display = "inherit";
    fetch("https://www.knu10.or.kr/login/doLogin", {
        headers: {
            "content-type": "application/x-www-form-urlencoded"
        },
        method: "POST",
        body: new URLSearchParams({
            univCd: univCode,
            userId: id,
            userPw: password
        })
    }).then(async (res) => {
        // 로그인 완료
        if (res.status === 200 && res.headers.get("content-type").includes("text/html")) {
            const parser = new DOMParser();
            const newPage = parser.parseFromString(await res.text(), "text/html");

            // update dom
            document.getElementsByClassName("inner")[0].innerHTML = newPage.getElementsByClassName("inner")[0].innerHTML;
        }
    });
}
