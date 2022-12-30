const http = require("http");
const fs = require("fs");
const url = require("url");

const hostname = "127.0.0.1";
const port = 3000;

const server = http.createServer((req, res) => {
    if (req.method == "GET")
        getRequest(req, res);
});

function getRequest(req, res) {
    let pathname = req.url === "/" ? "/index.html" : url.parse(req.url, true).pathname;

    if (pathname.indexOf("/.") !== -1) // paths that contain /. are off limit
        res.statusCode = 403;
    else if (pathname.startsWith("/api/")) // paths that start with /api/ are API calls
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
    let pathname = url.parse(req.url, true).pathname;
    res.statusCode = 200;
    res.end();
}
// There are two types of API POST calls: WBDL and File System
function postAPI(req, res) {
    res.end();
}

server.listen(port, hostname, () => {
    console.log(`Spin the Web Studio running at http://${hostname}:${port}/`);
});