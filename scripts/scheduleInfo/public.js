if (!window.__KNUPLUS_SETTINGS__) {
    const knuPlusSettings = document.documentElement.getAttribute("data-knuplus-settings");
    if (knuPlusSettings) {
        window.__KNUPLUS_SETTINGS__ = JSON.parse(knuPlusSettings);
        document.documentElement.setAttribute("data-knuplus-settings", "window.__KNUPLUS_SETTINGS__");
    }
}

if (window.__KNUPLUS_SETTINGS__) {
    let patched = false;

    const old = window.WebSquare;
    window.WebSquare = new Proxy(old, {
        set(target, property, value) {
            if (!patched && property === "scope_obj" && value === "popupContent") patchElements();
            target[property] = value;
            return true;
        }
    });

    const periods = {
        "0A": ["08:00", "08:30"],
        "0B": ["08:30", "09:00"],
        "1A": ["09:00", "09:30"],
        "1B": ["09:30", "10:00"],
        "2A": ["10:00", "10:30"],
        "2B": ["10:30", "11:00"],
        "3A": ["11:00", "11:30"],
        "3B": ["11:30", "12:00"],
        "4A": ["12:00", "12:30"],
        "4B": ["12:30", "13:00"],
        "5A": ["13:00", "13:30"],
        "5B": ["13:30", "14:00"],
        "6A": ["14:00", "14:30"],
        "6B": ["14:30", "15:00"],
        "7A": ["15:00", "15:30"],
        "7B": ["15:30", "16:00"],
        "8A": ["16:00", "16:30"],
        "8B": ["16:30", "17:00"],
        "9A": ["17:00", "17:30"],
        "9B": ["17:30", "18:00"],
        "10A": ["18:00", "18:30"],
        "10B": ["18:30", "19:00"],
        "11A": ["19:00", "19:30"],
        "11B": ["19:30", "20:00"],
        "12A": ["20:00", "20:30"],
        "12B": ["20:30", "21:00"],
        "13A": ["21:00", "21:30"],
        "13B": ["21:30", "22:00"],
        "14A": ["22:00", "22:30"]
    };

    function convertSchedule(text) {
        const timeSchedule = text.split("<br/>")
            .map(schedule => {
                const [ day, period ] = schedule.split(" ");
                const periodArray = period.split(",");
                const startTime = periods[periodArray.shift()][0];
                const endTime = periods[periodArray.pop()][1];

                return `${day} ${startTime} ~ ${endTime}`;
            });
        return timeSchedule.join("\n");
    }

    function patchElements() {
        patched = true;

        const scope = WebSquare.util.getComponentById("popupContent").scope;

        // 강의계획서에서 로그인 없이 교수님 전화번호, 이메일 열람하기
        if (window.__KNUPLUS_SETTINGS__.schedule.forceContacts) {
            const phoneBox = document.createElement("th");
            const phoneInputBox = document.createElement("td");
            const emailBox = document.createElement("th");
            const emailInputBox = document.createElement("td");

            document.getElementById("popupContent_wq_uuid_111").prepend(phoneBox, phoneInputBox, emailBox, emailInputBox);

            phoneBox.outerHTML = '<th class="w2group w2tb_th req" scope="row"><label id="popupContent_frmText12" class="w2textbox " for="popupContent_frmInputBox12">%PHONE%</label></th>';
            phoneInputBox.outerHTML = '<td class="w2group w2tb_td" data-title="연락처"><input id="popupContent_frmInputBox12" style="width:100%;" class="w2input form-control req w2input_readonly" type="text" readonly="readonly" data-ddg-inputtype="unknown"></td>';

            emailBox.outerHTML = '<th class="w2group w2tb_th req" scope="row"><label id="popupContent_frmText13" class="w2textbox " for="popupContent_frmInputBox13">E-mail</label></th>';
            emailInputBox.outerHTML = '<td class="w2group w2tb_td" data-title="E-mail"><input id="popupContent_frmInputBox13" style="width:100%;" class="w2input form-control req w2input_readonly" type="text" readonly="readonly" data-ddg-inputtype="identities.emailAddress" data-ddg-autofill="true"></td>';

            if (scope.scwin.paramData.lctreLnggeSctcd === "STCU001400002") { // STCU001400002 영어인 경우
                document.getElementById("popupContent_frmText12").innerText = "phone";
            } else { // STCU001400001 한국어인 경우
                document.getElementById("popupContent_frmText12").innerText = "연락처";
            }

            document.getElementById("popupContent_wq_uuid_112").classList.add("req");
            document.getElementById("popupContent_wq_uuid_114").setAttribute("colspan", "3");
        }

        scope.scwin.search = () => {
            if (!scope.com_stddm.isNull(scope.scwin.changeTabIndex)) {
                scope.tabCon.setSelectedTabIndex(scope.scwin.changeTabIndex);
                scope.scwin.changTab(scope.scwin.changeTabIndex + 1);
                scope.scwin.changeTabIndex = null;
                scope.scwin.changeBeforeTabIndex = null;
            }

            const response = new scope.com_ajax.KnuRestResponse();
            response.addTarget("data", scope.dma_01);

            scope.com_ajax.ajax_request({
                url: scope.scwin.ajaxPath + "/selectListLectPlnInputDtl",
                data: {
                    [scope.com_ajax.KnuJsonViews.Search]: scope.dma_SearchParam.getJSON()
                },
                target: response,
                success: (data, responseData) => {
                    scope.scwin.setTextAreaByte();
                    scope.scwin.setTab();
                    scope.scwin.setGrid01Tab1();
                    scope.scwin.setLngge(scope.dma_SearchParam.get("lctreLnggeSctcd"));

                    // 강의계획서 강의시간을 실제시간으로 표시하기
                    if (window.__KNUPLUS_SETTINGS__.schedule.realTime) {
                        document.getElementById("popupContent_frmInputBox10").innerText = convertSchedule(data.lssnsTimeInfo);
                    }

                    // 강의계획서에서 로그인 없이 교수님 전화번호, 이메일 열람하기
                    if (window.__KNUPLUS_SETTINGS__.schedule.forceContacts) {
                        document.getElementById("popupContent_frmInputBox12").setAttribute("value", data.cntacMtlno ?? "");
                        document.getElementById("popupContent_frmInputBox13").setAttribute("value", data.cntacEmail ?? "");
                    }
                }
            });
        };
    }
}
