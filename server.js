const https = require("https");
const path = require('path');
const fs = require("fs");
const url = require("url");

let WBDL = JSON.parse(fs.readFileSync(`${__dirname}/wbdl.json`));
// [TODO] Speed up webbase navigation
(function indexGUID(obj) {
})(WBDL.outline);

const hostname = "studio.spintheweb.org" || process.env.hostname || "127.0.0.1";
const port = process.env.port || 443;

const options = {
    key: fs.readFileSync(`${__dirname}/pki/private_key.pem`),
    cert: fs.readFileSync(`${__dirname}/pki/certificate.pem`)
};

const server = https.createServer(options, (req, res) => {
    // [TODO] websocket and session management
    if (req.method == "GET")
        getRequest(req, res);
});

function getRequest(req, res) {
    let pathname = req.url === "/" ? "/index.html" : url.parse(req.url, true).pathname;


    if (pathname.startsWith("/api/"))
        getAPI(req, res);
    else
        fs.readFile(`${__dirname}${pathname}`, null, (err, data) => {
            if (err == null) {
                res.statusCode = 200;
                res.write(data);
            } else if (err.code !== "ENOENT") {
                res.statusCode = 400;
                console.error(err.code);
            }
            res.end();
        });
}

// There are two types of API GET calls: WBDL and File System
function getAPI(req, res) {
    let pathname = url.parse(req.url, true).pathname.split("/");

    switch (pathname[2]) {
        case "outline":
            res.writeHead(200, "Content-Type", "text/json");
            res.end(JSON.stringify(pathname[3] ? WBDL.index[pathname[3]] : WBDL));
            break;
        case "dir":
            let dir = getDir();
            res.writeHead(200, "Content-Type", "text/json");
            res.end(JSON.stringify(dir));
            break;
        default:
            res.statusCode = 204;
            res.end();
            break;
    }
}
// There are two types of API POST calls: WBDL and File System
function postAPI(req, res) {
    res.end();
}

server.listen(port, hostname, () => {
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
