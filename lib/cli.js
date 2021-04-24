#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = require(".");
const config_1 = require("./config");
let callback = null;
for (const argument of process.argv) {
    if (callback instanceof Function) {
        callback(argument);
        callback = null;
    }
    else
        switch (argument) {
            case 'join':
                callback = async (address) => {
                    _1.initClient((address.includes('.'))
                        ? address
                        : `${address}.nodesite.eu`);
                };
                break;
            case 'host':
                _1.initServer();
                break;
            case 'trust':
                callback = async (hash) => {
                    config_1.trusted_keys.__set(hash, 'true');
                    console.log(`${hash} trusted!`);
                };
                break;
            default:
                _1.terminal.write(`Skipped unknown argument ${argument}`, true);
                break;
        }
}
