if (!window.__KNUPLUS_SETTINGS__) {
    const knuPlusSettings = document.documentElement.getAttribute("data-knuplus-settings");
    if (knuPlusSettings) {
        window.__KNUPLUS_SETTINGS__ = JSON.parse(knuPlusSettings);
        document.documentElement.setAttribute("data-knuplus-settings", "window.__KNUPLUS_SETTINGS__");
    }
}

if (window.__KNUPLUS_SETTINGS__) {
    // 특수 키 입력 허용
    if (window.__KNUPLUS_SETTINGS__.miscellaneous.allowFunctionKeys) {
        $(document).unbind("keydown");
        document.oncontextmenu = () => {};
    }

    // 로그인 된 상태
    if (location.pathname === "/web/stddm/lssrq/sugang/termGradsInqr.knu") {
        // 자동 로그아웃 타이머 비활성화
        if (window.__KNUPLUS_SETTINGS__.score.disableAutoLogout) {
            clearInterval(logOutTimer.timerObj);
            document.getElementById("lbl_sessionTimeOutDisp").innerText = "99:00";
        }

        // 강의평가/상담 완료 여부 검증 스킵
        if (window.__KNUPLUS_SETTINGS__.score.forceEnable) {
            $.scwin.search = () => {
                $.scwin.dlt_01 = [];
                $.scwin.dma_SearchParam.userSection = gUserInfo.userSection;

                com_ajax.ajax_request({
                    url: $.scwin.ajaxPath + "/searchTermGradsInqrList",
                    data: {
                        [com_ajax.KnuJsonViews.Search]: $.scwin.dma_SearchParam
                    },
                    success: (data, responseData) => {
                        if (data && data.length > 0) {
                            $.scwin.dlt_01 = data;
                            $("#grid01cnt").html(data.length);
                        } else {
                            $("#grid01cnt").html("0");
                        }

                        $.scwin.fn_afterSearch();
                    }
                });
            };
        }
    }
}
