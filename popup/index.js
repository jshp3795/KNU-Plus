document.oncontextmenu = (event) => false;

for (const element of document.getElementsByClassName("navigate")) {
    element.addEventListener("click", (event) => {
        location.href = `/popup/${element.getAttribute("data-page")}/index.html`;
    });
}
