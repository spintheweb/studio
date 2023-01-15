const express = require("express");
const https = require("https");
const path = require('path');
const fs = require("fs");
const uuid = require("uuid");

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

const hostname = "studio.spintheweb.org" || process.env.hostname || "127.0.0.1";
const port = process.env.port || 443;

const app = express();

app.use(express.static(__dirname)); // for handling static files
app.use(express.json()); // for parsing application/json

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
    if (/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(req.params._id)) {
        // [TODO] Check data against JSON schema
        let node = WBDL.index.get(req.body._id), newNode = req.body;
        for (let obj in newNode) {
            if (typeof node[obj] != "undefined")
                if (node[obj] != null && typeof node[obj] === "object")
                    node[obj][req.params.lang] = newNode[obj];
                else
                    node[obj] = newNode[obj];
        }

        fs.writeFile(__dirname + "/data/wbdl.json", JSON.stringify(WBDL), err => {
            // [TODO] Send client a warning unable to persist webbase
            console.log(err ? err : "Persisted /data/wbdl.json");
        });
        res.json(node);

    } else {
        switch (req.params.component) {
            case "area":
                res.json({
                    _id: uuid.v5("studio.spintheweb.org", uuid.v5.DNS), 
                    name: {}, 
                    type: "area",
                    slug: {},
                    icon: null,
                    mainpage: null,
                    keywords: {},
                    description: {},
                    visibility: {},
                    children: []
                });
                break;
            case "page":
                break;
            case "content":
                break;
            case "shortcut":
                break;
            case "group":
                break;
            default:
                res.json({});
        }
    }
});

https.createServer(
    {
        key: fs.readFileSync(`${__dirname}/pki/private_key.pem`),
        cert: fs.readFileSync(`${__dirname}/pki/certificate.pem`)
    },
    app)
    .listen(port, hostname, () => {
        console.log(`Spin the Web Studio running at https://${hostname}:${port}/`);
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

/*
Use git

const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);

async function lsExample() {
  const { stdout, stderr } = await exec('ls');
  console.log('stdout:', stdout);
  console.error('stderr:', stderr);
}
lsExample();
*/