"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const { blake2sHex } = require('blakejs');
const cloud_1 = require("./cloud");
const config_1 = require("./config");
const fs_1 = __importDefault(require("fs"));
const low_usage_1 = __importDefault(require("low-usage"));
const path_1 = __importDefault(require("path"));
const ts_hound_1 = require("ts-hound");
function manager(hook) {
    const watcher = ts_hound_1.watch('.');
    watcher.on('create', async (file) => {
        (new Promise(resolve => setTimeout(async () => {
            if (fs_1.default.existsSync(file)) {
                watcher.watch(file);
                const stat = fs_1.default.statSync(file);
                if (!stat.isFile())
                    return false;
                hook.emit('send', {
                    event: 'file-create',
                    path: path_1.default.relative('.', file).replace(/[\\\/]+/g, '/'),
                });
                resolve(true);
            }
            else
                resolve(false);
        }, 100))).catch(() => { });
    });
    watcher.on('change', async (file) => {
        if (file.includes('nsvscs'))
            return false;
        (new Promise(resolve => setTimeout(async () => {
            if (fs_1.default.existsSync(file)) {
                const stat = fs_1.default.statSync(file);
                if (!stat.isFile())
                    return false;
                const data = await fs_1.default.promises.readFile(file);
                if (!data.length)
                    return resolve(false);
                const hashes = await cloud_1.put(data);
                if (hashes) {
                    hook.emit('send', {
                        event: 'file-change',
                        path: path_1.default.relative('.', file).replace(/[\\\/]+/g, '/'),
                        ...hashes,
                    });
                }
            }
            else
                resolve(false);
        }, 100))).catch(() => { });
    });
    hook.on('file-create', async (message) => {
        if (typeof message.path !== 'string')
            return;
        const message_path = message.path.replace(/[\\\/]+/g, '/');
        const mypath = path_1.default.resolve('.', message_path);
        if (fs_1.default.existsSync(mypath)) {
            const data = await fs_1.default.promises.readFile(mypath);
            if (!data.length)
                return;
            const hash = blake2sHex(data);
            if (cloud_1.blake2cloud.__has(hash)) {
                return hook.emit('send', {
                    event: 'file-init',
                    path: message_path,
                    blake: hash,
                    cloud: cloud_1.blake2cloud.__get(hash),
                });
            }
            const hashes = await cloud_1.put(data);
            if (hashes) {
                return hook.emit('send', {
                    event: 'file-init',
                    path: message_path,
                    ...hashes,
                });
            }
        }
    });
    hook.on('file-init', async (message) => {
        if (typeof message.path !== 'string')
            return;
        const message_path = message.path.replace(/[\\\/]+/g, '/');
        if (typeof message.blake !== 'string')
            return;
        if (typeof message.cloud !== 'string')
            return;
        const mypath = path_1.default.resolve('.', message_path);
        if (!mypath.includes(path_1.default.resolve('.')))
            return;
        if (!fs_1.default.existsSync(mypath)) {
            const data = (await cloud_1.get(message.cloud)) || (await cloud_1.get(message.blake));
            if (data && data.length) {
                const dirpath = path_1.default.resolve(mypath, '..');
                if (!fs_1.default.existsSync(dirpath)) {
                    fs_1.default.mkdirSync(dirpath, {
                        recursive: true,
                    });
                }
                return fs_1.default.promises.writeFile(mypath, data);
            }
        }
    });
    hook.on('file-change', async (message) => {
        if (typeof message.path !== 'string')
            return;
        const message_path = message.path.replace(/[\\\/]+/g, '/');
        if (typeof message.blake !== 'string')
            return;
        if (typeof message.cloud !== 'string')
            return;
        const mypath = path_1.default.resolve('.', message_path);
        if (!mypath.includes(path_1.default.resolve('.')))
            return;
        if (fs_1.default.existsSync(mypath)) {
            const stat = fs_1.default.statSync(mypath);
            if (!stat.isFile())
                return;
            const current = await fs_1.default.promises.readFile(mypath);
            const chashes = await cloud_1.put(current);
            if (!chashes)
                return;
            if ((message.blake === chashes.blake) || (message.cloud === chashes.cloud))
                return;
            const cpathd = path_1.default.resolve('.', config_1.backupdir, path_1.default.relative('.', mypath).replace('..', '__PARENT__'));
            if (!fs_1.default.existsSync(cpathd)) {
                fs_1.default.mkdirSync(cpathd, {
                    recursive: true,
                });
            }
            const creal = path_1.default.resolve('.', config_1.cachedir, chashes.blake);
            if (!fs_1.default.existsSync(creal))
                return;
            const clpath = path_1.default.resolve(cpathd, Date.now().toString());
            fs_1.default.symlinkSync(creal, clpath);
        }
        const data_new = (await cloud_1.get(message.cloud)) || (await cloud_1.get(message.blake));
        if (!data_new)
            return;
        const dirpath = path_1.default.resolve(mypath, '..');
        if (!fs_1.default.existsSync(dirpath)) {
            fs_1.default.mkdirSync(dirpath, {
                recursive: true,
            });
        }
        await fs_1.default.promises.writeFile(mypath, data_new);
        return true;
    });
    hook.on('request-state', async (message) => {
        const pd = async (d) => {
            const dir = await fs_1.default.promises.readdir(d);
            for (const file of dir) {
                const path = path_1.default.resolve(d, file);
                const stat = await fs_1.default.promises.stat(path);
                if (path.includes('nsvscs')) {
                }
                else if (stat.isFile()) {
                    const hashes = await cloud_1.put(await fs_1.default.promises.readFile(path));
                    if (hashes) {
                        await low_usage_1.default.cpu;
                        hook.emit('send', {
                            event: 'file-init',
                            path: path_1.default.relative('.', path).replace(/[\\\/]+/g, '/'),
                            ...hashes,
                        });
                    }
                }
                else if (stat.isDirectory()) {
                    await pd(path);
                }
            }
        };
        pd('.');
    });
}
exports.default = manager;
module.exports = manager;
