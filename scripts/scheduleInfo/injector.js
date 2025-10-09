getSettings().then((settings) => {
    const scriptPath = {
        "https://knuin.knu.ac.kr/websquare/popup.html?w2xPath=/views/cmmnn/popup/windowpopup.xml&popupID=publicLectPlnInputDtlPop&w2xHome=/stddm/lsspr/public/&w2xDocumentRoot=": "scripts/scheduleInfo/public.js",
        "https://knuin.knu.ac.kr/websquare/popup.html?w2xPath=/views/cmmnn/popup/windowpopup.xml&popupID=tabContentMain_contents_tabPgmMNU0010656_body_lectPlnInputDtlPop&w2xHome=/main/&w2xDocumentRoot=": "scripts/scheduleInfo/private.js"
    };

    const script = document.createElement("script");
    script.src = chrome.runtime.getURL(scriptPath[location.href]);
    document.documentElement.appendChild(script);
    script.remove();
});
