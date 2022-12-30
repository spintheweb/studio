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

    // paths which contain /. are off limit
    if (pathname.indexOf("/.") !== -1) {
        res.statusCode = 403;
        res.end();
    } else
        fs.readFile(`${__dirname}${pathname}`, null, (err, data) => {
            if (err == null) {
                res.statusCode = 200;
                res.end(data);
            } else if (err.code === 'ENOENT') {
                getAPI(req, res);
            } else {
                res.statusCode = 400;
                console.log(err.code);
                res.end();
            }
        });
}

function getAPI(req, res) {
    // WBDL and File system
    res.statusCode = 200;
}

server.listen(port, hostname, () => {
    console.log(`Spin the Web Studio running at http://${hostname}:${port}/`);
});