let stwStudio = {
    setup: () => {
        if (!document.querySelector(".stwPanels i[selected]"))
            document.querySelector(".stwPanels>i").click();
        document.querySelectorAll(".fa-angle-right").forEach(i => {
            i.parentElement.nextElementSibling.style.display = "none";
        });
    },
    click: (event) => {
        let target = event.target;
        if (target.classList.contains("fa-angle-down")) {
            target.classList.replace("fa-angle-down", "fa-angle-right");
            target.parentElement.nextElementSibling.style.display = "none";
        } else if (target.classList.contains("fa-angle-right")) {
            target.classList.replace("fa-angle-right", "fa-angle-down");
            target.parentElement.nextElementSibling.style.display = "";
        }
        // Closest stwTabLabel
    },
    loadFile: (path, destination) => {
        fetch(path)
            .then(response => {
                return response.text();
            })
            .then(data => {
                if (destination && destination.tagName === "TEXTAREA") {
                    document.getElementById(elementId).value = data;
                } else if (destination && destination.tagName === "SECTION") {
                    destination.innerHTML = data;
                    stwStudio.setup();
                }
            });
    },
    managePanel: (event) => {
        let target = event.target;
        if (target.tagName === "I" && target.getAttribute("selected")) {
            target.removeAttribute("selected");
            event.currentTarget.nextElementSibling.innerHTML = "";
        } else if (target.tagName === "I") {
            let selected = event.currentTarget.querySelector("[selected]");
            if (selected) selected.removeAttribute("selected");
            target.setAttribute("selected", null);
            stwStudio.loadFile(target.dataset.panel, event.currentTarget.nextElementSibling);
        }
    },
    manageGroups: (event) => {

    },
    manageDatasource: (event) => {

    },
    manageProperties: (event) => {

    },
    manageBrowse: (event) => {
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
    },
    setURL: (event) => {
        let target = event.target;
        if (target.tagName === "INPUT")
            target.parentElement.nextElementSibling.contentWindow.location.href = target.value;
        else if (target.tagName === "IFRAME")
            target.previousElementSibling.querySelector("[name=url]").value = target.contentWindow.location.href;
    },
}

window.addEventListener("load", stwStudio.setup);
window.addEventListener("click", stwStudio.click);
