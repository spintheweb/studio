function loadFile(path, destination) {
    fetch(path, {
        method: "GET",
        headers: {
            "Content-Type": "text/xml"
        }
    })
        .then(response => {
            return response.text();
        })
        .then(data => {
            if (destination && destination.tagName == "textarea")
                document.getElementById(elementId).value = data;
        });
}

function setURL(event) {
    let target = event.target;
    if (target.tagName == "INPUT")
        target.parentElement.nextElementSibling.contentWindow.location.href = target.value;
    else if (target.tagName == "IFRAME")
        target.previousElementSibling.querySelector("[name=url]").value = target.contentWindow.location.href;
}

window.addEventListener("load", () => {
    document.querySelectorAll("textarea[src]").forEach(src => {
        loadFile(src.getAttribute("src"), src);
    })

    document.querySelectorAll(".stwTabs").forEach(tabs => {
        tabs.addEventListener("click", event => {
            if (event.target.tagName == "LABEL") {
                console.log("tab");
            }
        })
    });

    // loadFile("/data/portale.csavi.it.xml");
});