if (!window.__KNUPLUS_SETTINGS__) {
    const knuPlusSettings = document.documentElement.getAttribute("data-knuplus-settings");
    if (knuPlusSettings) {
        window.__KNUPLUS_SETTINGS__ = JSON.parse(knuPlusSettings);
        document.documentElement.setAttribute("data-knuplus-settings", "window.__KNUPLUS_SETTINGS__");
    }
}

if (window.__KNUPLUS_SETTINGS__) {
    const old = window.WebSquare;
    window.WebSquare = new Proxy(old, {
        set(target, property, value) {
            if (property === "scope_obj" && value?.id && value?.scope) onScopeObjectUpdate(value);
            target[property] = value;
            return true;
        }
    });

    let lastPage = {
        "tabContentMain_contents_tabPgmMNU0050158_body": 1, // 자유게시판 (대구)
        "tabContentMain_contents_tabPgmMNU0050159_body": 1 // 자유게시판 (상주)
    };
    let loadLastPage = {
        "tabContentMain_contents_tabPgmMNU0050158_body": false, // 자유게시판 (대구)
        "tabContentMain_contents_tabPgmMNU0050159_body": false // 자유게시판 (상주)
    };

    let timerPatched = false;

    function onScopeObjectUpdate(self) {
        // 자동 로그아웃 타이머 비활성화
        if (window.__KNUPLUS_SETTINGS__.dormitory.disableAutoLogout && !timerPatched) {
            timerPatched = true;
            const oldSetInterval = $p.setInterval;
            $p.setInterval = (func, options) => {
                if (options.key === "dispSessionTimeOutRemainInterval") {
                    document.getElementById("lbl_sessionTimeOutDisp").innerText = "99:00";
                    return null;
                } else {
                    return oldSetInterval(func, options);
                }
            };
        }

        switch (self.id) {
            // 선발결과 강제 조회
            case "tabContentMain_contents_tabPgmMNU0050098_body_tabControl1_contents_content2_body": {
                if (window.__KNUPLUS_SETTINGS__.dormitory.forceEnableAcceptance) {
                    const old = self.scope.scwin.searchCallback;
                    self.scope.scwin.searchCallback = (data, responseData) => {
                        data.todayWithinRange = true;
                        return old(data, responseData);
                    };
                }
                break;
            }
            // 수납정보 강제 조회
            case "tabContentMain_contents_tabPgmMNU0050098_body_tabControl1_contents_content3_body": {
                if (window.__KNUPLUS_SETTINGS__.dormitory.forceEnablePayment) {
                    const old = self.scope.scwin.searchPrdCallback;
                    self.scope.scwin.searchPrdCallback = (data, responseData) => {
                        data.todayWithinRange = true;
                        return old(data, responseData);
                    };
                }
                break;
            }
            // 배정결과 강제 조회
            case "tabContentMain_contents_tabPgmMNU0050098_body_tabControl1_contents_content4_body": {
                if (window.__KNUPLUS_SETTINGS__.dormitory.forceEnableAssignment) {
                    const old = self.scope.scwin.searchPrdCallback2;
                    self.scope.scwin.searchPrdCallback2 = (data, responseData) => {
                        data.todayWithinRange = true;
                        return old(data, responseData);
                    };
                }
                break;
            }
            // 자유게시판 목록가기 버튼 클릭시 마지막으로 열려있던 페이지로 돌아가기
            case "tabContentMain_contents_tabPgmMNU0050158_body":
            case "tabContentMain_contents_tabPgmMNU0050159_body": {
                if (window.__KNUPLUS_SETTINGS__.dormitory.rememberPageNumber) {
                    const scwin = self.scope.scwin;
                    if (scwin.gridOnCelldblclick) {
                        const old = scwin.gridOnCelldblclick;
                        self.scope.scwin.gridOnCelldblclick = (row, col) => {
                            lastPage[self.id] = self.scope.dma_01.get("pageNum");
                            return old(row, col);
                        };
                    }

                    if (scwin.btnBbsList) {
                        const old = scwin.btnBbsList;
                        scwin.btnBbsList = (e) => {
                            loadLastPage[self.id] = true;
                            return old(e);
                        };
                    }

                    if (loadLastPage[self.id] && self.scope.dma_01) {
                        scwin.search = () => {
                            if (scwin.bCheck) return;

                            // 목록가기 버튼을 눌렀다면 페이지 번호를 마지막으로 열려있던 페이지로 설정
                            if (loadLastPage[self.id]) {
                                self.scope.dma_01.set("pageNum", lastPage[self.id].toString());
                            }

                            const response = new com_ajax.KnuRestResponse();
                            response.addTarget("data", self.scope.dlt_01, self.scope.pageList1);

                            com_ajax.ajax_request({
                                url: "/web" + scwin.bbsViewPath + "/selectListBbs",
                                data: {
                                    [com_ajax.KnuJsonViews.Search]: self.scope.dma_01.getJSON()
                                },
                                target: response,
                                success: (data, responseData) => {
                                    com_comp.focusGridSaveIndex(self.scope.grid01);

                                    if (data.hasOwnProperty(com_ajax.KnuJsonViews.Paging)) {
                                        self.scope.udcGridTtile01.setDataCnt(data.paging.totalElements);
                                    } else {
                                        self.scope.udcGridTtile01.setDataCnt(0);
                                    }

                                    // 처음 조회시 페이지 번호를 스크립트로 임의로 변경하는 경우 페이지 목록이 보이지 않는 오류 수정 (???)
                                    if (loadLastPage[self.id]) {
                                        loadLastPage[self.id] = false;
                                        self.scope.pageList1.setCount(data.paging.totalPages);
                                        self.scope.pageList1.setValue(lastPage[self.id]);
                                    }
                                }
                            });
                        };
                    }
                }
                break;
            }
        }
        return self;
    }
}
