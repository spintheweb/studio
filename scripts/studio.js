let stwStudio = {
    setup: (settings = {}) => {
        ace.config.set("basePath", "https://cdnjs.cloudflare.com/ajax/libs/ace/1.14.0/");

        stwStudio.settings = settings;
        stwStudio.settings.lang = document.firstElementChild.getAttribute("lang") || "en";

        if (!document.querySelector(".stwPanels i[selected]"))
            document.querySelector(".stwPanels>i").click();
        document.querySelectorAll(".fa-angle-right").forEach(i => {
            i.parentElement.nextElementSibling.style.display = "none";
        });
    },
    click: event => {
        let target = event.target;

        if (!event.isTrusted && target.classList.contains("fa-angle-down"))
            return;

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
    },
    submitForm: event => {
        let data = {};
        for (let input of event.target.form)
            if (!input.hasAttribute("disabled"))
                data[input.name] = input.value;

        if (data.hasOwnProperty("slug") && data.slug === "")
            data.slug = data.name.toLowerCase().replace(/[!a-z]/g, "");

        fetch(`/api/webbase/${stwStudio.settings.lang}/${data._id}`,
            {
                method: "POST",
                body: JSON.stringify(data),
                headers: { "Content-type": "application/json; charset=UTF-8" }
            })
            .then(res => console.log(res.status));
    },
    loadForm: (form, data) => {
        for (let input of form) {
            if (data[input.name] === undefined) {
                input.setAttribute("disabled", "");
                input.style.display = "none";
            } else {
                input.removeAttribute("disabled");
                input.style.display = "";
            }

            if (!data[input.name])
                input.value = null;
            else if (typeof data[input.name] === "object")
                input.value = data[input.name][stwStudio.settings.lang] || data[input.name][0] || null;
            else
                input.value = data[input.name];
        }
        if (form.slug && form.slug.value === "")
            form.slug.value = form.name.value.toLowerCase().replace(/[!a-z]/g, "");
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
                } else if (destination) {
                    destination.setValue(data, -1);
                    document.querySelector(`.stwTabs .stwTabLabel[title="${path}"]`).click();
                }
            });
    },
    fillPanel: panel => {
        switch (panel) {
            case "/panels/webbase.html":
                fetch('/api/webbase')
                    .then(res => {
                        if (res.ok)
                            return res.json();
                    })
                    .then(json => {
                        document.querySelector(".stwPanel .stwTree").insertAdjacentHTML("beforeend", `<ul onclick="stwStudio.manageWebbase(event)">${stwStudio.renderTree(json)}</ul>`);
                        document.querySelector("li[data-type=site]>div").click();
                    })
                    .catch(err => {
                        console.log(err);
                    });
                break;
            case "/panels/explorer.html":
                fetch('/api/explorer')
                    .then(res => {
                        if (res.ok)
                            return res.json();
                    })
                    .then(json => {
                        document.querySelector(".stwPanel .stwTree").insertAdjacentHTML("beforeend", `<ul onclick="stwStudio.manageExplorer(event)">${stwStudio.renderTree(json)}</ul>`);
                    })
                    .catch(err => {
                        console.log(err);
                    });
                break;
        }
    },
    renderTree: (node, depth = 0) => {
        let html,
            name = typeof (node.name) === "string" ? node.name : node.name[stwStudio.settings.lang];

        if (node.children && node.children.length) {
            if (depth)
                html = `<li ${node._id ? `data-id="${node._id}" ` : ""}data-type="${node.type}"><i class="fa-solid fa-fw fa-angle-right"></i><div><div class="stwFill"></div>${name}</div><ul style="display:none">`;
            else
                html = `<li ${node._id ? `data-id="${node._id}" ` : ""}data-type="${node.type}" selected><div><div class="stwFill"></div>${name}</div><ul>`;
            for (let child of node.children)
                html += stwStudio.renderTree(child, depth + 1);
            html += "</ul>";
        } else
            html = `<li ${node._id ? `data-id="${node._id}" ` : ""}data-type="${node.type}"><div><div class="stwFill"></div>${name}</div>`;
        return `${html}</li>`;
    },
    managePanel: event => {
        let target = event.target;
        if (target.tagName === "I" && target.dataset.panel === "menu") {
            // [TODO]

        } else if (target.tagName === "I" && target.hasAttribute("selected")) {
            target.removeAttribute("selected");
            event.currentTarget.nextElementSibling.innerHTML = "";

        } else if (target.tagName === "I") {
            let selected = event.currentTarget.querySelector("[selected]");
            if (selected) selected.removeAttribute("selected");
            target.setAttribute("selected", "");
            stwStudio.loadFile(target.dataset.panel, event.currentTarget.nextElementSibling, stwStudio.fillPanel);
        }
    },
    manageWebbase: event => {
        if (event.target.tagName === "H1") {
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        switch (event.currentTarget.tagName) {
            case "H1":
                tree = event.currentTarget.nextElementSibling;

                if (event.target.dataset.action === "refresh") {
                    stwStudio.loadFile("/panels/webbase.html", document.querySelector("section.stwPanel"), stwStudio.fillPanel);

                } else {
                    fetch(`/api/webbase/${stwStudio.settings.lang}/${event.target.dataset.action}`,
                        {
                            method: "POST"
                        })
                        .then(res => res.json())
                        .then(node => {
                            let parent = tree.querySelector("li[selected]") || tree.querySelector("li");
                            parent.removeAttribute("selected");
                            let li = `<li data-type="${node.type}" selected><div>${node.title}</div></li>`
                            if (parent.querySelector("ul"))
                                parent.lastElementChild.insertAdjacentHTML("beforeend", li);
                            else
                                parent.insertAdjacentHTML("beforeend", `<ul>${li}</ul>`);

                            let properties = document.getElementById("properties");
                            properties.dataset.id = node._id;
                            properties.querySelector("h1>i").click();
                        })
                        .catch(err => { console.log(err) });
                }
                break;
            case "UL":
                if (!event.target.parentElement.hasAttribute("selected") || !event.isTrusted) {
                    event.currentTarget.querySelector("li[selected]").removeAttribute("selected");
                    event.target.parentElement.setAttribute("selected", "");

                    let properties = document.getElementById("properties");
                    properties.dataset.id = event.target.parentElement.dataset.id;
                    fetch(`/api/webbase/${properties.dataset.id}`)
                        .then(res => {
                            if (res.ok)
                                return res.json();
                        })
                        .then(json => {
                            stwStudio.loadForm(properties.querySelector("form"), json);
                        })
                        .catch(err => console.log(err));
//                    properties.querySelector("h1>i").click();
                }
                break;
        }
    },
    manageGroups: event => {
        let target = event.target;
        if (target.classList.contains("fa-plus")) {
            let tr = `<li><i class="fa-light fa-fw fa-users"></i> New group</li>`;
            target.closest("div").querySelector("tbody").insertAdjacentHTML("beforeend", tr);
        }
    },
    manageDatasource: event => {

    },
    manageExplorer: event => {
        let target = event.target.parentElement;
        if (target.dataset.type === "file") {
            let filename = target.innerText;
            let path = filename;
            for (let el = target.closest("li[data-type=dir]"); el.firstChild.tagName === "I"; el = el.parentElement.closest("li[data-type=dir]"))
                path = el.children[1].innerText + "/" + path;

            if (!document.getElementById(path)) {
                document.querySelector(".stwTabs > div").insertAdjacentHTML("beforeend", `<span class="stwTabLabel" title="${path}">${filename}<i class="fa-light fa-times"></i></span>`);
                document.querySelector(".stwTabs").insertAdjacentHTML("beforeend", `<div class="stwTab"><div></div><div id="${path}"></div></div>`);

                let editor = ace.edit(path);
                if (window.getComputedStyle(document.body).getPropertyValue('color-scheme') === "dark")
                    editor.setTheme("ace/theme/tomorrow_night");
                editor.session.setMode(ace.require("ace/ext/modelist").getModeForPath(path).mode);
                stwStudio.loadFile(path, editor);
            } else
                document.querySelector(`.stwTabs .stwTabLabel[title="${path}"]`).click();
        }
    },
    manageTab: event => {
        let target = event.target;
        if (target.classList.contains("fa-times")) {
            let i;
            for (i = 0; i < event.currentTarget.children.length && event.currentTarget.children[i] != target.parentElement; ++i);

            if (target.parentElement.hasAttribute("selected"))
                event.currentTarget.firstChild.click();

            event.currentTarget.children[i].remove();
            event.currentTarget.parentElement.children[i + 1].remove();

        } else if (target.className === "stwTabLabel" && !target.hasAttribute("selected")) {
            event.currentTarget.querySelector(".stwTabLabel[selected]").removeAttribute("selected");
            target.setAttribute("selected", "");

            let i;
            for (i = 0; i < event.currentTarget.children.length && event.currentTarget.children[i] != target; ++i);

            event.currentTarget.parentElement.querySelector(".stwTab[selected]").removeAttribute("selected");
            event.currentTarget.parentElement.children[i + 1].setAttribute("selected", "");
        }
        event.preventDefault();
    },
    manageBrowse: event => {
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
    setURL: event => {
        let target = event.target;
        if (target.tagName === "INPUT")
            target.parentElement.nextElementSibling.contentWindow.location.href = target.value;
        else if (target.tagName === "IFRAME")
            target.previousElementSibling.querySelector("[name=url]").value = target.contentWindow.location.href;
    }
}

window.addEventListener("load", stwStudio.setup, { once: true });
window.addEventListener("click", stwStudio.click);
