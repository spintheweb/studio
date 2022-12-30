const http = require("http");
const fs = require("fs");
const url = require("url");

const hostname = "127.0.0.1";
const port = 3000;

const server = http.createServer((req, res) => {
    if (req.method == "GET")
        getRequest(req, res);
    else if (req.method == "POST")
        postRequest(req, res);
});

function getRequest(req, res) {
    let pathname = req.url === "/" ? "/studio.html" : url.parse(req.url, true).pathname;

    fs.readFile(`${__dirname}${pathname}`, null, (err, data) => {
        if (err == null) {
            res.statusCode = 200;
            res.end(data);
        } else if (err.code === 'ENOENT') {
            // API request
        } else {
            console.log(err.code);
            res.end();
        }
    });
}

function postRequest(req, res) {

}

server.listen(port, hostname, () => {
    console.log(`Spin the Web Studio running at http://${hostname}:${port}/`);
});