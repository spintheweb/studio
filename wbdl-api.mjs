// [NOTE] This is a Web Spinner module, it's here for testing purposes

// Set of API to manage a webbase
import fs from 'fs';
import path from 'path';
import url from 'url';
import git from 'simple-git';
import { v1 as uuid } from 'uuid';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function api(app) {
    let settings = JSON.parse(fs.readFileSync(path.join(__dirname, '.settings')));
    if (settings.protocol === 'https')
        settings.options = {
            key: settings.pki.key ? fs.readFileSync(path.join(__dirname, settings.pki.key)) : null,
            cert: settings.pki.certificate ? fs.readFileSync(path.join(__dirname, settings.pki.certificate)) : null
        };

    // [TODO] fetch remote site webbase and index it
    let WBDL = {};
    if (fs.existsSync(path.join(__dirname, 'dev/site.json')))
        WBDL = JSON.parse(fs.readFileSync(path.join(__dirname, 'dev/site.json')));
    else {
        if (!fs.existsSync('dev'))
            fs.mkdirSync('dev');
        WBDL = createNode('en', 'site');
    }
    WBDL.path = 'dev/site.json';
    WBDL.url = `${settings.protocol}://${settings.hostname}${settings.port ? ':' + settings.port : ''}`;

    WBDL.index = new Map();
    WBDL.createIndex = (obj, _idParent = null) => {
        obj._idParent = _idParent;
        WBDL.index.set(obj._id, obj);
        if (obj.children)
            for (let child of obj.children)
                WBDL.createIndex(child, obj._id);
    }
    WBDL.get = (lang, key) => {
        if (!key)
            return null;

        if (/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(key))
            return WBDL.index.get(key);

        return (function walk(slugs, node) {
            node = node.children.find(child => (child.slug[lang] || child.slug[WBDL.lang] || child.slug[0]) === slugs.shift());
            if (!node || !slugs.length) {
                let clone = { ...node };
                delete clone.children;
                return clone;
            }
            return walk(slugs, node);
        })(key.split('/'), WBDL);
    };
    WBDL.createIndex(WBDL);

    app.post('/api/wbdl/search/:lang', (req, res) => {
        let found = [], 
            pattern = new RegExp(`"\\w+?":".*?${req.body.text}.*?"`, 
                (req.body.ignoreCase ? 'i' : ''));

        WBDL.index.forEach(obj => {
            let search = {
                name: obj.name,
                keywords: obj.keywords,
                description: obj.description,
                layout: obj.layout
            };
            if (JSON.stringify(search).search(pattern) != -1)
                found.push({ _id: obj._id, name: obj.name, type: obj.type });
        });
        res.json({ children: found });
    });

    app.get('/api/wbdl/datasources/:name?', (req, res) => {
        res.json({}); // [TODO]
    });

    app.get('/api/wbdl/visibility/:_id?', (req, res) => {
        let visibility = structuredClone(WBDL.visibility), localVisibility;
        if (!req.params || !/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(req.params._id))
            localVisibility = WBDL.visibility;
        else
            localVisibility = WBDL.index.get(req.params._id).visibility;

        if (req.params._id)
            for (let group in visibility)
                if (localVisibility[group] == true)
                    visibility[group] = 'LV';
                else if (localVisibility[group] == false)
                    visibility[group] = 'LI';
                else {
                    visibility[group] = 'II';
                    for (let parent = WBDL.index.get(WBDL.index.get(req.params._id)._idParent); parent; parent = WBDL.index.get(parent._idParent))
                        if (parent.visibility[group]) {
                            visibility[group] = parent.visibility[group] ? 'IV' : 'II';
                            break;
                        }
                }

        res.json(visibility);
    });

    app.get('/api/wbdl(/*)?', (req, res) => {
        res.json(req.params[1] ? WBDL.index.get(req.params[1]) : WBDL);
    });

    app.post('/api/wbdl/visibility/:_id', (req, res) => {
        try {
            if (!/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(req.params._id) || !WBDL.index.get(req.params._id))
                throw 406; // 406 Not Acceptable

            let node = WBDL.index.get(req.params._id),
                status = req.body;

            node.visibility[status.group.replace(/[^a-zA-Z]/g, '')] = status.visibility;
            if (!status.visibility)
                delete node.visibility[status.group];

            res.json({ _id: req.params._id });

        } catch (err) {
            res.end(err);
        }
    });

    app.post('/api/wbdl/:lang/:_id/:type?', (req, res) => {
        try {
            if (!/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(req.params._id) || !WBDL.index.get(req.params._id))
                throw 406; // 406 Not Acceptable

            let node,
                newNode = req.body;

            if (req.params.type) {
                // [TODO] Check for duplicate slugs
                node = createNode(req.params.lang, req.params.type);
                node._idParent = req.params._id;
                WBDL.index.get(node._idParent).children.push(node);
                WBDL.index.set(node._id, node);
            } else
                node = WBDL.index.get(req.body._id);

            if (newNode.status === 'T' && node.status === 'T') {
                let i = WBDL.index.get(node._idParent).children.findIndex(child => child._id === node._id);
                WBDL.index.get(node._idParent).children.splice(i, 1);
                WBDL.index.clear();
                WBDL.createIndex(WBDL);
                node = WBDL.index.get(newNode._idParent);

            } else
                for (let obj in newNode)
                    if (typeof node[obj] != 'undefined')
                        if (node[obj] != null && typeof node[obj] === 'object')
                            node[obj] = { [req.params.lang]: newNode[obj] };
                        else
                            node[obj] = newNode[obj];

            fs.writeFile(path.join(__dirname, WBDL.path), JSON.stringify(WBDL), err => {
                if (err)
                    throw 503; // 503 Service Unavailable
                console.log('Saved ' + WBDL.path);
            });
            res.json(node);

        } catch (err) {
            res.end(err);
        }
    });

    app.get('/api/fs(/:path)?', async (req, res) => {
        res.json(await getDir(req.params.path, (await git().status()).files));
    });

    app.post('/api/fs(/*)', (req, res) => {
        fs.writeFile(path.join(__dirname, req.params[1]), req.body, err => {
            if (err)
                throw 503; // 503 Service Unavailable
            console.log(`Saved ${req.params[1]}`);
        });
        res.end();
    });

    app.get('/api/git/status', async (req, res) => {
        let files = (await git().status()).files;
        for (let i = files.length - 1; i >= 0; --i)
            if (/^[^/]*?\.(js|json|wbdl)$/.test(files[i].path))
                files.splice(i, 1);
        res.json(files);
    });

    async function getDir(dirpath = '.', gitStatus) {
        let dir = { name: dirpath, type: 'dir', children: [] };

        const files = fs.readdirSync(dirpath);
        for (let file of files) {
            let ignore = await git().checkIgnore(path.join(dirpath, file));

            if (ignore.length === 0 && file[0] !== '.' && !(dirpath === '.' && (file.endsWith('.json') || file.endsWith('.js') || file.endsWith('.mjs')))) {
                if (fs.lstatSync(path.join(dirpath, file)).isDirectory()) {
                    let status = gitStatus.find(element => element.path.startsWith(file + '/'));
                    dir.children.push({ name: file, type: 'dir', status: status ? '???' : '', children: (await getDir(path.join(dirpath, file), gitStatus)).children });
                } else if (fs.lstatSync(path.join(dirpath, file)).isFile()) {
                    let status = gitStatus.find(element => element.path === path.join(dirpath, file).replace(/\\/g, '/'));
                    dir.children.push({ name: file, type: 'file', status: status ? status.working_dir : '' });
                }
            }
        }
        return dir;
    }

    // [TODO] Base creation on JSON schema
    function createNode(lang = 'en', type) {
        let UUID = uuid();

        let basenode = {
            _id: UUID,
            _idParent: null,
            type: type,
            status: 'M',
            name: { [lang]: 'New ' + type },
            slug: {},
            visibility: {},
            children: []
        };

        switch (type) {
            case 'site':
                return {
                    ...basenode,
                    lang: lang,
                    visibility: {
                        guests: null,
                        users: null,
                        administrators: null,
                        translators: null,
                        developers: null,
                        webmasters: null
                    }
                };
            case 'area':
                return {
                    ...basenode,
                    icon: null,
                    mainpage: null,
                    keywords: {},
                    description: {}
                };
            case 'page':
                return {
                    ...basenode,
                    icon: null,
                    template: 'index.html',
                    visible: null,
                    keywords: {},
                    description: {}
                };
            case 'content':
                return {
                    ...basenode,
                    cssclass: null,
                    section: null,
                    sequence: 1,
                    subtype: 'text',
                    dsn: null,
                    query: null,
                    parameters: null,
                    layout: {}
                };
            case 'shortcut':
                return {};
            default:
                throw 406; // 406 Not Accepatable
        }
    }

    return settings;
}
