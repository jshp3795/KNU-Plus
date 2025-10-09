// 이렇게 하지 않으면 팝업을 활성화한 후 최초 View Transition 적용시 빈 배경이 표시됨 (???)
requestAnimationFrame(() => {
    location.href = "/popup/index.novt.html";
});
