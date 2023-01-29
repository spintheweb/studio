import path from 'path';
import url from 'url';
import http from 'http';
import https from 'https';
import express from 'express';
import studioapi from './wbdl-api.mjs';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.disable('x-powered-by');
app.use(function (req, res, next) {
    res.setHeader('charset', 'utf-8');
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('cache-control', 'no-cache');
    next();
});

app.use([/^\/(\s*?\.js|\s*?\.json|pki|node_modules|dev)/, '/'], express.static(__dirname, { dotfiles: 'deny' })); // Needed for handling static files
app.use(express.json()); // Needed for parsing application/json
app.use(express.text()); // Needed for parsing text/plain

let settings = studioapi(app);

(settings.protocol === 'http' ? http : https).createServer(settings.options, app)
    .listen(settings.port, settings.hostname, () => {
        console.log(`Spin the Web Studio running at ${settings.protocol}://${settings.hostname}:${settings.port}/`);
    });
