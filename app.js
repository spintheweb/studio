const http = require("http");
const https = require("https");
const path = require('path');
const fs = require("fs");
const express = require("express");
const uuid = require("uuid");
const git = require('simple-git')({
    baseDir: process.cwd(),
    binary: 'git',
    maxConcurrentProcesses: 6,
    trimmed: false,
});

// [TODO] Only in dev mode
const inspector = require('inspector');
function applog(...args) {
    if (inspector.url() !== undefined)
        console.log(args);
}

let settings = JSON.parse(fs.readFileSync(path.join(__dirname, "app.json")));
const protocol = settings.protocol === "http" ? http : https;

// Load WBDL from file and index for faster access
let WBDL = JSON.parse(fs.readFileSync(path.join(__dirname, "data/wbdl.json")));
WBDL.index = new Map();
(function index(obj) {
    WBDL.index.set(obj._id, obj);
    if (obj.children)
        for (let child of obj.children)
            index(child);
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
    })(key.split("/"), WBDL);
};

const hostname = process.env.hostname || "127.0.0.1";
const port = process.env.port || 8080;

const app = express();
app.disable("x-powered-by");
app.use(function (req, res, next) {
    res.setHeader("charset", "utf-8");
    res.setHeader("x-content-type-options", "nosniff");
    res.setHeader("cache-control", "no-cache");
    next();
});

app.use([/^\/(pki|data|node_modules)/, "/"], express.static(__dirname, { dotfiles: "deny" })); // Needed for handling static files
app.use(express.json()); // Needed for parsing application/json

app.get("/api/webbase/users", (req, res) => {
    res.json({}); // [TODO]
});
app.get("/api/webbase/datasources", (req, res) => {
    res.json({}); // [TODO]
});
app.get("/api/webbase/groups", (req, res) => {
    res.json(WBDL.visibility);
});
app.get("/api/webbase(/*)?", (req, res) => {
    res.json(req.params[1] ? WBDL.get("en", req.params[1]) : WBDL);
});
app.get("/api/explorer(/:path)?", (req, res) => {
    res.json(getDir(req.params.path));
});
app.post("/api/webbase/:lang/:_id", (req, res) => {
    try {
        if (!/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(req.params._id))
            res.json(createNode(req.params.lang, req.params._id));

        else {
            // [TODO] Check data against JSON schema
            let node = WBDL.index.get(req.body._id), newNode = req.body;

            let _idparent = newNode._idparent
            delete newNode._idparent;

            if (!node) {
                node = createNode(null, newNode.type);
                node._id = newNode._id;

                WBDL.index.get(_idparent).children.push(node);
                WBDL.index.set(node._id, node);
            }

            for (let obj in newNode) {
                if (typeof node[obj] != "undefined")
                    if (node[obj] != null && typeof node[obj] === "object")
                        node[obj] = { [req.params.lang]: newNode[obj] };
                    else
                        node[obj] = newNode[obj];
            }

            fs.writeFile(__dirname + "/data/wbdl.json", JSON.stringify(WBDL), err => {
                if (err)
                    throw 503; // 503 Service Unavailable
                applog("Persisted /data/wbdl.json");
            });
            res.json(node);
        }

    } catch (error) {
        res.end(error);
    }
});
app.get("/api/git/status", async (req, res) => {
    res.json(await git.status());
});

protocol.createServer(
    //    {
    //        key: fs.readFileSync(path.join(__dirname, "/pki/private_key.pem")),
    //        cert: fs.readFileSync(path.join(__dirname, "/pki/certificate.pem"))
    //    },
    app)
    .listen(port, hostname, () => {
        console.log(`Spin the Web Studio running at ${settings.protocol}://${hostname}:${port}/`);
    });

function getDir(directory = ".") {
    let response = { name: "root", type: "dir", children: [] };

    const files = fs.readdirSync(directory);
    for (let file of files) {
        if (file.startsWith(".") || ["node_modules", "pki", "package.json", "package-lock.json"].includes(file))
            continue;

        if (fs.lstatSync(path.join(directory, file)).isDirectory())
            response.children.push({ name: file, type: "dir", children: getDir(path.join(directory, file)).children });
        else if (fs.lstatSync(path.join(directory, file)).isFile())
            response.children.push({ name: file, type: "file" });
    }
    return response;
}

// [TODO] Base creation on JSON schema
function createNode(lang, type) {
    let UUID = uuid.v1();
    switch (type) {
        case "area":
            return {
                _id: UUID,
                type: type,
                name: { [lang]: "New area" },
                slug: {},
                icon: null,
                mainpage: null,
                keywords: {},
                description: {},
                visibility: {},
                children: []
            };
        case "page":
            return {
                _id: UUID,
                type: type,
                name: { [lang]: "New page" },
                slug: {},
                icon: null,
                keywords: {},
                description: {},
                visibility: {},
                children: []
            };
        case "content":
            return {
                _id: UUID,
                type: type,
                subtype: "text",
                name: { [lang]: "New content" },
                slug: {},
                section: null,
                sequence: 1,
                dsn: null,
                query: null,
                parameters: null,
                layout: {},
                visibility: {},
                children: []
            };
        case "shortcut":
            return {};
        case "group":
            return {};
        default:
            throw 406; // 406 Not Accepatable
    }
}