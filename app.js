const express = require("express");
const https = require("https");
const path = require('path');
const fs = require("fs");

// Load WBDL from file and index for faster access
let WBDL = JSON.parse(fs.readFileSync(path.join(__dirname, "data/wbdl.json")));
WBDL.index = new Map();
(function index(obj) {
    WBDL.index.set(obj._id, obj);
    if (obj.children)
        for (let child of obj.children)
            index(child);
})(WBDL);
WBDL.node = _id => WBDL.index.get(_id);
WBDL.walk = (path, node) => {
    node = node || WBDL;
    return WBDL.walk(path, null);
};

const hostname = "studio.spintheweb.org" || process.env.hostname || "127.0.0.1";
const port = process.env.port || 443;

const app = express();

app.use(express.static(__dirname)); // for handling static files
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.get("/api/webbase(/:path)?", (req, res) => {
    res.json(req.params.path ? WBDL.node(req.params.path) : WBDL);
});
app.get("/api/explorer(/:path)?", (req, res) => {
    res.json(getDir(req.params.path));
});
app.post("/api/webbase(/:path)?", (req, res) => {
    // let node = req.json();
    res.json(req.body);
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
