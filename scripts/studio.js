let stwStudio = {
    setup: (settings = {}) => {
        if (window.getComputedStyle(document.body).getPropertyValue('color-scheme') === 'dark')
            document.body.className = 'stwDark';
        else
            document.body.className = 'stwLight';

        ace.config.set('basePath', 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.14.0/');

        stwStudio.settings = settings;
        stwStudio.settings.lang = document.firstElementChild.getAttribute('lang') || 'en';

        if (!document.querySelector('.stwPanels i[selected]'))
            document.querySelector('.stwPanels>i').click();
        document.querySelectorAll('.fa-angle-right').forEach(i => {
            i.parentElement.nextElementSibling.style.display = 'none';
        });

        document.querySelectorAll('input[list]').forEach(dataListInput => {
            dataListInput.addEventListener('focus', event => {
                event.target.setAttribute('placeholder', dataListInput.value);
                dataListInput.value = '';
            });
            dataListInput.addEventListener('change', event => {
                event.target.setAttribute('placeholder', dataListInput.value);
                dataListInput.value = '';
            });
            dataListInput.addEventListener('blur', event => {
                if (dataListInput.value === '')
                    dataListInput.value = event.target.getAttribute('placeholder');
            });
        });
    },
    toggleTheme: event => {
        let theme;

        if (event.target.className == 'fa-solid fa-toggle-on') {
            event.target.className = 'fa-solid fa-toggle-off';
            theme = 'stwLight';
        } else {
            event.target.className = 'fa-solid fa-toggle-on';
            theme = 'stwDark';
        }
        document.body.className = theme;
        document.querySelectorAll('.ace_editor').forEach(ace => {
            ace.editor.setTheme(theme == 'stwDark' ? 'ace/theme/tomorrow_night' : '');
        });
    },
    keydown: event => {
        if (document.activeElement.className === 'ace_text-input' && event.key == 's' && event.ctrlKey) {
            event.stopPropagation();
            event.preventDefault();

            let tab = document.activeElement.parentElement;
            fetch(`/api/explorer/${tab.id}`,
                { 
                    method: 'POST', 
                    body: tab.editor.getValue(),
                    headers: { 'Content-type': 'text/plain' }
                })
                .catch(err => {
                    console.log(err);
                });
        }
    },
    click: event => {
        let target = event.target;

        if (!event.isTrusted && target.classList.contains('fa-angle-down'))
            return;

        let parent = target.closest('h1') || target.closest('div');

        if (target.classList.contains('fa-angle-down')) {
            target.classList.replace('fa-angle-down', 'fa-angle-right');
            if (parent.parentElement.tagName === 'LI')
                parent.parentElement.querySelector('ul').style.display = 'none';
            else
                parent.nextElementSibling.style.display = 'none';
        } else if (target.classList.contains('fa-angle-right')) {
            target.classList.replace('fa-angle-right', 'fa-angle-down');
            if (parent.parentElement.tagName === 'LI')
                parent.parentElement.querySelector('ul').style.display = '';
            else
                parent.nextElementSibling.style.display = '';
        }
    },
    submitForm: event => {
        let data = {};
        for (let input of event.target.form)
            if (!input.hasAttribute('disabled'))
                data[input.name] = input.value;

        data.status = 'M';
        if (data.hasOwnProperty('slug') && data.slug === '')
            data.slug = data.name.toLowerCase().replace(/[^a-z]/g, '');

        fetch(`/api/webbase/${stwStudio.settings.lang}/${data._id}`,
            {
                method: 'POST',
                body: JSON.stringify(data),
                headers: { 'Content-type': 'application/json' }
            })
            .then(res => res.json())
            .then(data => {
                document.querySelector('#webbase [selected] div').innerHTML = `<div class="stwFill"></div>${data.name[stwStudio.settings.lang]}<span>${data.status || ''}</span>`;
                stwStudio.loadForm(document.querySelector('#properties form'), data);
            });
    },
    loadForm: (form, data) => {
        for (let input of form) {
            if (data[input.name] === undefined) {
                input.setAttribute('disabled', '');
                input.style.display = 'none';
            } else {
                input.removeAttribute('disabled');
                input.style.display = '';
            }

            if (!data[input.name])
                input.value = null;
            else if (typeof data[input.name] === 'object')
                input.value = data[input.name][stwStudio.settings.lang] || data[input.name][0] || null;
            else
                input.value = data[input.name];
        }
        if (form.slug && form.slug.value === '')
            form.slug.value = form.name.value.toLowerCase().replace(/[^a-z]/g, '');
    },
    loadFile: (path, destination, callback) => {
        fetch(path)
            .then(res => {
                if (res.status != 200)
                    throw res.status;
                return res.text();
            })
            .then(data => {
                if (destination && destination.tagName === 'TEXTAREA')
                    document.getElementById(elementId).value = data;
                else if (destination && destination.tagName === 'SECTION') {
                    destination.innerHTML = data;
                    stwStudio.setup();
                    callback(path);
                } else if (destination) {
                    document.getElementById(path).editor = destination;
                    destination.setValue(data, -1);
                    document.querySelector(`.stwTabs .stwTabLabel[title="${path}"]`).click();
                }
            })
            .catch(err => {
                console.log(err);
            });
    },
    fillPanel: panel => {
        switch (panel) {
            case '/panels/webbase.html':
                fetch('/api/webbase')
                    .then(res => {
                        if (res.ok)
                            return res.json();
                    })
                    .then(json => {
                        document.querySelector('.stwPanel .stwTree').insertAdjacentHTML('beforeend', `<ul>${stwStudio.renderTree(json)}</ul>`);
                        document.querySelector('li[data-type=site]>div').click();
                        document.querySelector('.stwPanel .stwLoading').remove();
                    })
                    .catch(err => {
                        console.log(err);
                    });
                break;
            case '/panels/explorer.html':
                fetch('/api/explorer')
                    .then(res => {
                        if (res.ok)
                            return res.json();
                    })
                    .then(json => {
                        document.querySelector('.stwPanel .stwTree').insertAdjacentHTML('beforeend', `<ul>${stwStudio.renderTree(json)}</ul>`);
                        document.querySelector('.stwPanel .stwLoading').remove();
                    })
                    .catch(err => {
                        console.log(err);
                    });
                break;
            case '/panels/sourcecontrol.html':
                fetch('/api/git/status')
                    .then(res => {
                        if (res.ok)
                            return res.json();
                    })
                    .then(json => {
                        let tree = { children: [] };
                        json.files.forEach(file => tree.children.push({ name: file.path, type: 'file', status: file.working_dir }));

                        document.querySelector('.stwPanel .stwTree').insertAdjacentHTML('beforeend', `<ul>${stwStudio.renderTree(tree)}</ul>`);
                        document.querySelector('.stwPanel .stwLoading').remove();
                    })
                    .catch(err => {
                        console.log(err);
                    });
                break;
            case '/panels/groups.html':
                fetch('/api/webbase/groups')
                    .then(res => {
                        if (res.ok)
                            return res.json();
                    })
                    .then(groups => {
                        let tree = { children: [] };
                        for (let group in groups)
                            tree.children.push({ name: group, type: 'group' });

                        document.querySelector('.stwPanel .stwTree').insertAdjacentHTML('beforeend', `<ul>${stwStudio.renderTree(tree)}</ul>`);
                        document.querySelector('.stwPanel .stwLoading').remove();
                    })
                    .catch(err => {
                        console.log(err);
                    });
                break;
        }
    },
    renderTree: (node, depth = 0) => {
        let html = '';

        if (!depth && !node.type) {
            for (let child of node.children)
                html += stwStudio.renderTree(child, depth);

        } else {
            let name = typeof (node.name) === 'string' ? node.name : node.name[stwStudio.settings.lang];

            if (node.children && node.children.length) {
                if (!depth)
                    html = `<li ${node._id ? `data-id="${node._id}" ` : ''}data-type="${node.type}"><div tabindex="0" role="link"><span></span><span>${name}</span><span></span></div><ul>`;
                else
                    html = `<li ${node._id ? `data-id="${node._id}" ` : ''}data-type="${node.type}"><div tabindex="0" role="link"><span>${'&emsp;'.repeat(depth - 1)}<i class="fa fa-fw fa-angle-right"></i></span><span>${name}</span><span>${node.status}</span></div><ul style="display:none">`;
                for (let child of node.children)
                    html += stwStudio.renderTree(child, depth + 1);
                html += '</ul>';
            } else
                html = `<li ${node._id ? `data-id="${node._id}" ` : ''}data-type="${node.type}"><div tabindex="0" role="link"><span>${'&emsp;'.repeat(depth)}&nbsp;</span><span>${name}</span><span>${node.status || ''}</span></div>`;
        }

        return `${html}</li>`;
    },
    managePanel: event => {
        let target = event.target;
        if (target.tagName === 'I' && target.dataset.panel === 'menu') {
            // [TODO]

        } else if (target.tagName === 'I' && target.hasAttribute('selected')) {
            target.removeAttribute('selected');
            event.currentTarget.nextElementSibling.innerHTML = '';

        } else if (target.tagName === 'I') {
            let selected = event.currentTarget.querySelector('[selected]');
            if (selected) selected.removeAttribute('selected');
            target.setAttribute('selected', '');
            stwStudio.loadFile(target.dataset.panel, event.currentTarget.nextElementSibling, stwStudio.fillPanel);
        }
    },
    manageWebbase: event => {
        let target = event.target.closest('h1') || (event.target.closest('ul') ? event.currentTarget.querySelector('ul') : event.target);

        if (event.target.tagName === 'H1') {
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        switch (target.tagName) {
            case 'H1':
                tree = target.nextElementSibling;

                if (event.target.dataset.action === 'refresh') {
                    stwStudio.loadFile('/panels/webbase.html', document.querySelector('section.stwPanel'), stwStudio.fillPanel);

                } else {
                    fetch(`/api/webbase/${stwStudio.settings.lang}/${event.target.dataset.action}`,
                        {
                            method: 'POST'
                        })
                        .then(res => res.json())
                        .then(node => {
                            let parent = tree.querySelector('li[selected]') || tree.querySelector('li');
                            parent.removeAttribute('selected');
                            let li = `<li data-id="${node._id}" data-type="${node.type}" selected><div><div class="stwFill"></div>${node.name[stwStudio.settings.lang]}</div></li>`
                            if (parent.querySelector('ul'))
                                parent.lastElementChild.insertAdjacentHTML('beforeend', li);
                            else
                                parent.insertAdjacentHTML('beforeend', `<ul>${li}</ul>`);

                            node._idparent = parent.dataset.id;

                            //parent.innerHTML = stwStudio.renderTree(node._idparent);

                            let properties = document.getElementById('properties');
                            properties.dataset.id = node._id;
                            properties.dataset.idparent = node._idparent;
                            stwStudio.loadForm(properties.querySelector('form'), node);
                            properties.querySelector('h1>i').click();
                        })
                        .catch(err => { console.log(err) });
                }
                break;
            case 'UL':
                let div = event.target.closest('div');
                if (!div.parentElement.hasAttribute('selected') || !event.isTrusted) {
                    if (target.querySelector('li[selected]'))
                        target.querySelector('li[selected]').removeAttribute('selected');
                    div.parentElement.setAttribute('selected', '');

                    let properties = document.getElementById('properties');
                    properties.dataset.id = div.parentElement.dataset.id;
                    delete properties.dataset.idparent;
                    fetch(`/api/webbase/${properties.dataset.id}`)
                        .then(res => {
                            if (res.ok)
                                return res.json();
                        })
                        .then(node => {
                            stwStudio.loadForm(properties.querySelector('form'), node);
                        })
                        .catch(err => console.log(err));
                    properties.querySelector('h1>i').click();
                }
                break;
        }
    },
    manageSearch: event => {

    },
    manageGroups: event => {
        let target = event.target;

        /*
        if (target.classList.contains('fa-plus')) {
            let tr = `<li><i class="fa fa-fw fa-users"></i> New group</li>`;
            target.closest('div').querySelector('tbody').insertAdjacentHTML('beforeend', tr);
        }
        */
    },
    manageDatasource: event => {

    },
    manageFiles: event => {
        let target = event.target.closest('h1') || event.target.closest('li') || event.target;

        if (target.tagName === 'LI' && target.dataset.type === 'file') {
            let filename = target.firstChild.childNodes[1].textContent;
            let path = filename;
            for (let el = target.closest('li[data-type=dir]'); el; el = el.parentElement.closest('li[data-type=dir]'))
                path = el.firstChild.children[1].innerText + '/' + path;

            if (!document.getElementById(path)) {
                document.querySelector('.stwTabs > div').insertAdjacentHTML('beforeend', `<span tabindex="0" role="link" class="stwTabLabel" title="${path}">${path}<i class="fa fa-times"></i></span>`);
                document.querySelector('.stwTabs').insertAdjacentHTML('beforeend', `<div class="stwTab"><div></div><div id="${path}"></div></div>`);

                let editor = ace.edit(path);
                if (document.body.className == 'stwDark')
                    editor.setTheme('ace/theme/tomorrow_night');
                editor.session.setMode(ace.require('ace/ext/modelist').getModeForPath(path).mode);
                stwStudio.loadFile(path, editor);
            } else
                document.querySelector(`.stwTabs .stwTabLabel[title="${path}"]`).click();
        }
    },
    manageProperties: (event, what) => {
        let target = event.target.closest('h1') || event.target;

        if (target.tagName === 'H1' && event.target.dataset.action) {
            switch (event.target.dataset.action) {
                case 'trash':
                    if (what === 'webbase') {
                        document.getElementById(what).querySelector('li[selected]').remove();
                        // [TODO] Move node to trash
                    }
                    break;
                case 'clone':
                    break;
            }
        }
    },
    manageVisibility: event => {

    },
    manageTab: event => {
        let target = event.target, currentTarget = event.currentTarget;
        if (target.classList.contains('fa-times')) {
            let i;
            for (i = 0; i < currentTarget.children.length && currentTarget.children[i] != target.parentElement; ++i);

            if (target.closest('.stwTabLabel').hasAttribute('selected'))
                currentTarget.firstElementChild.click();

            currentTarget.children[i].remove();
            currentTarget.parentElement.children[i + 1].remove();

        } else if (target.className === 'stwTabLabel' && !target.hasAttribute('selected')) {
            currentTarget.querySelector('.stwTabLabel[selected]').removeAttribute('selected');
            target.setAttribute('selected', '');

            let i;
            for (i = 0; i < currentTarget.children.length && currentTarget.children[i] != target; ++i);

            currentTarget.parentElement.querySelector('.stwTab[selected]').removeAttribute('selected');
            currentTarget.parentElement.children[i + 1].setAttribute('selected', '');

            let editor = currentTarget.parentElement.querySelector(`div[id="${target.innerText}"]>textarea`);
            if (editor)
                editor.focus();
        }
        event.preventDefault();
    },
    manageBrowse: event => {
        let target = event.target;
        switch (target.dataset.action) {
            case 'back':
                // document.querySelector('iframe').window.history.back(-1); Does not work
                break;
            case 'refresh':
                document.querySelector('iframe').src = document.querySelector('.stwBrowsebar [name=url]').value;
                break;
            case 'home':
                break;
        }
    },
    setURL: event => {
        let target = event.target;
        if (target.tagName === 'INPUT')
            target.parentElement.nextElementSibling.src = target.value;
        else if (target.tagName === 'IFRAME')
            target.previousElementSibling.querySelector('[name=url]').value = target.src;
    }
}

window.addEventListener('load', stwStudio.setup, { once: true });
window.addEventListener('click', stwStudio.click);
window.addEventListener('keydown', stwStudio.keydown);
