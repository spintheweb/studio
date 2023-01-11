let stwStudio = {
    settings: {
        lang: "en"
    },
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
            if (target.parentElement.tagName === "LI")
                target.parentElement.querySelector("ul").style.display = "none";
            else
                target.parentElement.nextElementSibling.style.display = "none";
        } else if (target.classList.contains("fa-angle-right")) {
            target.classList.replace("fa-angle-right", "fa-angle-down");
            if (target.parentElement.tagName === "LI")
                target.parentElement.querySelector("ul").style.display = "";
            else
                target.parentElement.nextElementSibling.style.display = "";
        }
        // Closest stwTabLabel
    },
    loadFile: (path, destination, callback) => {
        fetch(path)
            .then(response => {
                return response.text();
            })
            .then(data => {
                if (destination && destination.tagName === "TEXTAREA")
                    document.getElementById(elementId).value = data;
                else if (destination && destination.tagName === "SECTION") {
                    destination.innerHTML = data;
                    stwStudio.setup();
                    callback(path);
                } else if (destination)
                    destination.setValue(data, -1);
            });
    },
    managePanel: (event) => {
        let target = event.target;
        if (target.tagName === "I" && target.dataset.panel === "menu") {
            // [TODO]

        } else if (target.tagName === "I" && target.getAttribute("selected")) {
            target.removeAttribute("selected");
            event.currentTarget.nextElementSibling.innerHTML = "";

        } else if (target.tagName === "I") {
            let selected = event.currentTarget.querySelector("[selected]");
            if (selected) selected.removeAttribute("selected");
            target.setAttribute("selected", null);
            stwStudio.loadFile(target.dataset.panel, event.currentTarget.nextElementSibling, fillPanel);

            function fillPanel(panel) {
                switch (panel) {
                    case "/panels/explorer.html":
                        fetch('/api/dir')
                            .then(res => {
                                if (res.ok)
                                    return res.json();
                            })
                            .then(json => {
                                document.querySelector(".stwPanel .stwTree").insertAdjacentHTML("beforeend", `<ul onclick="stwStudio.manageExplorer(event)">${renderTree(json)}</ul>`);
                            })
                            .catch((err) => {
                                console.log(err);
                            });
                        break;
                    case "/panels/outline.html":
                        fetch('/api/outline')
                            .then(res => {
                                if (res.ok)
                                    return res.json();
                            })
                            .then(json => {
                                document.querySelector(".stwPanel .stwTree").insertAdjacentHTML("beforeend", `<ul onclick="stwStudio.manageOutline(event)">${renderTree(json)}</ul>`);
                            })
                            .catch((err) => {
                                console.log(err);
                            });
                        break;
                }
            }
        }

        function renderTree(node, depth = 0) {
            let html,
                name = typeof (node.name) === "string" ? node.name : node.name[stwStudio.settings.lang];

            if (node.children && node.children.length) {
                if (depth)
                    html = `<li data-type="${node.type}"><i class="fa-solid fa-fw fa-angle-right"></i><div>${name}</div><ul style="display:none">`;
                else
                    html = `<li data-type="${node.type}"><div>${name}</div><ul>`;
                for (let child of node.children)
                    html += renderTree(child, depth + 1);
                html += "</ul>";
            } else
                html = `<li data-type="${node.type}"><div>${name}</div>`;
            return `${html}</li>`;
        }
    },
    manageOutline: (event) => {
        let tree = event.currentTarget.parentElement.nextElementSibling;
        if (event.target.dataset.action === "refresh") {
            // Reload outline
        } else {
            let parent = tree.querySelector("li[selected]");
            parent.removeAttribute("selected");
            let li = `<li class="${event.target.dataset.action.replace("new", "stw")}" selected><div>${event.target.getAttribute("title")}</div></li>`
            if (parent.querySelector("ul"))
                parent.lastElementChild.insertAdjacentHTML("beforeend", li);
            else
                parent.insertAdjacentHTML("beforeend", `<ul>${li}</ul>`);
            document.getElementById("properties").click();
        }
    },
    manageGroups: (event) => {
        let target = event.target;
        if (target.classList.contains("fa-plus")) {
            let tr = `<tr><td><i class="fa-solid fa-fw fa-users"></i></td><td><div contenteditable>New group</div></td></tr>`;
            target.closest("div").querySelector("tbody").insertAdjacentHTML("beforeend", tr);
        }
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
    manageExplorer: (event) => {
        let target = event.target.parentElement;
        if (target.dataset.type === "file") {
            document.querySelector(".stwTabs > div").insertAdjacentHTML("beforeend", `<span class="stwTabLabel">${target.innerText}</span>`);
            document.querySelector(".stwTabs").insertAdjacentHTML("beforeend", `<div class="stwTab"><div>${target.innerText}</div><div id="${target.innerText}"></div></div>`);

            let editor = ace.edit(target.innerText);
            stwStudio.loadFile(target.innerText, editor);
            editor.setTheme("ace/theme/monokai");
            editor.session.setMode("ace/mode/javascript");
        }
    },
    manageOutline: (event) => {

    },
    setURL: (event) => {
        let target = event.target;
        if (target.tagName === "INPUT")
            target.parentElement.nextElementSibling.contentWindow.location.href = target.value;
        else if (target.tagName === "IFRAME")
            target.previousElementSibling.querySelector("[name=url]").value = target.contentWindow.location.href;
    },
    manageTab: (event) => {
        let target = event.target;
        if (target.className === "stwTabLabel" && !target.getAttribute("selected")) {
            event.currentTarget.querySelector(".stwTabLabel[selected]").removeAttribute("selected");
            target.setAttribute("selected", "");

            let i;
            for (i = 0; i < event.currentTarget.children.length && event.currentTarget.children[i] != target ; ++i);

            event.currentTarget.parentElement.querySelector(".stwTab[selected]").removeAttribute("selected");
            event.currentTarget.parentElement.children[i+1].setAttribute("selected", "");
        }
    }
}

window.addEventListener("load", stwStudio.setup);
window.addEventListener("click", stwStudio.click);
