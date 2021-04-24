"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.put = exports.get = exports.cloud2blake = exports.blake2cloud = void 0;
const { blake2sHex } = require('blakejs');
const https_1 = __importDefault(require("https"));
const config_1 = require("./config");
const doge_config_1 = require("doge-config");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const zlib_1 = require("zlib");
const cachedir = path_1.default.resolve('.', config_1.cachedir);
if (!fs_1.default.existsSync(cachedir))
    fs_1.default.mkdirSync(cachedir, {
        recursive: true,
    });
exports.blake2cloud = doge_config_1.getConfig('nsvscs-bc');
exports.cloud2blake = doge_config_1.getConfig('nsvscs-cb');
async function get(hash) {
    return new Promise(resolve => {
        const path_direct = path_1.default.resolve(cachedir, hash);
        if (fs_1.default.existsSync(path_direct))
            fs_1.default.promises.readFile(path_direct).then(resolve);
        if (exports.cloud2blake.__has(hash)) {
            const path_blake = path_1.default.resolve(cachedir, exports.cloud2blake.__getString(hash));
            if (fs_1.default.existsSync(path_blake))
                fs_1.default.promises.readFile(path_blake).then(resolve);
        }
        if (exports.blake2cloud.__has(hash))
            hash = exports.blake2cloud.__getString(hash) || hash;
        const req = https_1.default.request(`https://static.nodesite.eu/static/${hash}`, (res) => {
            const buffers = [];
            res.on('data', (chunk) => buffers.push(chunk));
            res.on('end', () => {
                const data = zlib_1.unzipSync(Buffer.concat(buffers));
                const blakehash = blake2sHex(data);
                exports.blake2cloud.__set(blakehash, hash);
                exports.cloud2blake.__set(hash, blakehash);
                fs_1.default.promises.writeFile(path_1.default.resolve(cachedir, blakehash), data);
                resolve(data);
            });
        });
        req.end();
    });
}
exports.get = get;
async function put(data) {
    return new Promise(resolve => {
        const hash = blake2sHex(data);
        const path_direct = path_1.default.resolve(cachedir, hash);
        if (!fs_1.default.existsSync(path_direct))
            fs_1.default.promises.writeFile(path_direct, data);
        if (data.length > 1 << 24)
            resolve(false);
        if (exports.blake2cloud.__has(hash))
            resolve({
                blake: hash,
                cloud: exports.blake2cloud.__getString(hash),
            });
        const req = https_1.default.request(`https://cloud.nodesite.eu/static/create`, {
            method: 'PUT',
        }, res => {
            const buffers = [];
            res.on('data', (chunk) => buffers.push(chunk));
            res.on('end', () => {
                const response = Buffer.concat(buffers).toString('utf8');
                if (response.length === 64) {
                    exports.blake2cloud.__set(hash, response);
                    exports.cloud2blake.__set(response, hash);
                    resolve({
                        blake: hash,
                        cloud: response,
                    });
                }
                else
                    resolve(false);
            });
        });
        req.write(data);
        req.end();
    });
}
exports.put = put;
