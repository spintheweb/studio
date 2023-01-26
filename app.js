const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');
const express = require('express');
const uuid = require('uuid');
const git = require('simple-git')();

// Load WBDL from file, index for faster access and set parent hierarchy
let WBDL = JSON.parse(fs.readFileSync(path.join(__dirname, `data/${process.argv[2] || 'wbdl.json'}`)) || '{}');
WBDL.path = `data/${process.argv[2] || 'wbdl.json'}`;
WBDL.index = new Map();
(function index(obj, _idParent = null) {
    obj._idParent = _idParent;
    WBDL.index.set(obj._id, obj);
    if (obj.children)
        for (let child of obj.children)
            index(child, obj._idParent);
})(WBDL);
WBDL.get = (lang, key) => {
    if (/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(key))
        return WBDL.index.get(key);

    return (function walk(slugs, node) {
        node = node.children.find(child => child.slug[lang] === slugs.shift());
        if (!node || !slugs.length) {
            let clone = { ...node };
            delete clone.children;
            return clone;
        }
        return walk(slugs, node);
    })(key.split('/'), WBDL);
};

let settings = JSON.parse(fs.readFileSync(path.join(__dirname, '.settings')));

if (process.env.npm_lifecycle_event === 'debug')
    settings = {
        protocol: 'http',
        hostname: process.env.hostname || '127.0.0.1',
        port: 8080,
        options: {}
    }
else
    settings.options = {
        key: fs.readFileSync(path.join(__dirname, settings.pki.key)),
        cert: fs.readFileSync(path.join(__dirname, settings.pki.certificate))
    }

const app = express();
app.disable('x-powered-by');
app.use(function (req, res, next) {
    res.setHeader('charset', 'utf-8');
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('cache-control', 'no-cache');
    next();
});

app.use([/^\/(pki|data|node_modules)/, '/'], express.static(__dirname, { dotfiles: 'deny' })); // Needed for handling static files
app.use(express.json()); // Needed for parsing application/json
app.use(express.text()); // Needed for parsing text/plain

// [TODO] These API should be in a Web Spinner, they're here temporarily for testing purposes
app.get('/api/webbase/users', (req, res) => {
    res.json({}); // [TODO]
});
app.get('/api/webbase/datasources', (req, res) => {
    res.json({}); // [TODO]
});
app.get('/api/webbase/groups(/*)?', (req, res) => {
    let visibility = structuredClone(WBDL.visibility), localVisibility;
    if (!req.params || !/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(req.params[1]))
        localVisibility = WBDL.visibility;
    else
        localVisibility = WBDL.get(null, req.params[1]).visibility;

    for (let group in localVisibility)
        if (localVisibility[group] == true)
            visibility[group] = 'LV';
        else if (localVisibility[group] == false)
            visibility[group] = 'LI';
        else {

        }

    res.json(visibility);
});
app.get('/api/webbase(/*)?', (req, res) => {
    res.json(req.params[1] ? WBDL.get(null, req.params[1]) : WBDL);
});
app.post('/api/webbase/:lang/:_id/:type?', (req, res) => {
    try {
        if (!/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(req.params._id) || !WBDL.index.get(req.params._id))
            throw 406; // 406 Not Acceptable

        let node,
            newNode = req.body;

        if (req.params.type) {
            node = createNode(req.params.lang, req.params.type);
            node._idParent = req.params._id
            WBDL.index.get(node._idParent).children.push(node);
            WBDL.index.set(node._id, node);
        } else
            node = WBDL.index.get(req.body._id);

        for (let obj in newNode) {
            if (typeof node[obj] != 'undefined')
                if (node[obj] != null && typeof node[obj] === 'object')
                    node[obj] = { [req.params.lang]: newNode[obj] };
                else
                    node[obj] = newNode[obj];
        }

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

app.get('/api/explorer(/:path)?', async (req, res) => {
    res.json(await getDir(req.params.path, (await git.status()).files));
});
app.post('/api/explorer(/*)', (req, res) => {
    fs.writeFile(path.join(__dirname, req.params[1]), req.body, err => {
        if (err)
            throw 503; // 503 Service Unavailable
        console.log(`Saved ${req.params[1]}`);
    });
    res.end();
});

app.get('/api/git/status', async (req, res) => {
    res.json(await git.status());
});

(settings.protocol === 'http' ? http : https).createServer(settings.options, app)
    .listen(settings.port, settings.hostname, () => {
        console.log(`Spin the Web Studio running at ${settings.protocol}://${settings.hostname}:${settings.port}/`);
    });

async function getDir(dirpath = '.', gitStatus) {
    let dir = { name: dirpath, type: 'dir', children: [] };

    const files = fs.readdirSync(dirpath);
    for (let file of files) {
        let ignore = await git.checkIgnore(path.join(dirpath, file));

        if (ignore.length === 0 && file[0] !== '.') {
            if (fs.lstatSync(path.join(dirpath, file)).isDirectory()) {
                let status = gitStatus.find(element => element.path.startsWith(file + '/'));
                dir.children.push({ name: file, type: 'dir', status: status ? '●' : '', children: (await getDir(path.join(dirpath, file), gitStatus)).children });
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
    let UUID = uuid.v1();

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
                template: 'index.html',
                icon: null,
                keywords: {},
                description: {}
            };
        case 'content':
            return {
                ...basenode,
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
        case 'group':
            return {};
        default:
            throw 406; // 406 Not Accepatable
    }
}