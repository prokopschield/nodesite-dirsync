"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trusted_keys = exports.password = exports.username = exports.cachedir = exports.backupdir = exports.maindir = exports.keydir = void 0;
const doge_config_1 = require("doge-config");
const config = doge_config_1.getConfig('nsvscs', {
    keydir: 'config/nsvscs/allowed-keys/',
    maindir: 'config/nsvscs/',
    backupdir: '.nsvscs-backups',
    cachedir: '.nsvscs-cache',
    username: process.env.USER || '',
    password: require('blakejs').blake2sHex(JSON.stringify(process.env) + new Date + Math.random()),
    trusted_keys: {},
});
exports.default = config;
exports.keydir = config.__getString('keydir');
exports.maindir = config.__getString('maindir');
exports.backupdir = config.__getString('backupdir');
exports.cachedir = config.__getString('cachedir');
exports.username = config.__getString('username');
exports.password = config.__getString('password');
exports.trusted_keys = config.__getField('trusted_keys');
module.exports = config;
