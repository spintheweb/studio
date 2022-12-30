function loadFile(path, destination) {
    fetch(path)
        .then(response => {
            return response.text();
        })
        .then(data => {
            if (destination && destination.tagName === "TEXTAREA") {
                document.getElementById(elementId).value = data;
            } else if (destination && destination.tagName === "SECTION") {
                destination.innerHTML = data;
            }
        });
}

function managePanel(event) {
    let target = event.target;
    if (target.tagName === "I" && target.getAttribute("selected")) {
        target.removeAttribute("selected");
        event.currentTarget.nextElementSibling.innerHTML = "";
    } else if (target.tagName === "I") {
        let selected = event.currentTarget.querySelector("[selected]");
        if (selected) selected.removeAttribute("selected");
        target.setAttribute("selected", null);
        loadFile(target.dataset.panel, event.currentTarget.nextElementSibling);
    }
}

function manageSecurity(event) {
    
}

function manageDatasource(event) {
    
}

function manageBrowse(event) {
    let target = event.target;
    switch (target.dataset.action) {
        case "back":
            break;
        case "refresh":
            document.querySelector("").documentWindow.location;
            break;
        case "home":
            break;
    }
}

function setURL(event) {
    let target = event.target;
    if (target.tagName === "INPUT")
        target.parentElement.nextElementSibling.contentWindow.location.href = target.value;
    else if (target.tagName === "IFRAME")
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

    document.querySelector(".stwPanels").firstChild.setAttribute("selected", null);
});