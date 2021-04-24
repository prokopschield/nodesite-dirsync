"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcast = exports.sockets = void 0;
const { blake2sHex } = require('blakejs');
const chalk_1 = __importDefault(require("chalk"));
const config_1 = require("./config");
const cypher_1 = __importDefault(require("./cypher"));
const nodesite_eu_1 = require("nodesite.eu");
const terminal_1 = __importDefault(require("./terminal"));
const common_1 = __importDefault(require("./common"));
const hook_1 = __importDefault(require("./hook"));
exports.sockets = new Map();
async function initServer() {
    await cypher_1.default.ready;
    const domain = `websync-${config_1.username}-${cypher_1.default.hash.substr(16, 15)}.nodesite.eu`;
    terminal_1.default.write(chalk_1.default.green(chalk_1.default.green('\r\n\nOthers can join this session using\r\n')));
    terminal_1.default.write(chalk_1.default.red(`npx nodesite-dirsync join ${domain}\r\n\n`));
    nodesite_eu_1.NodeSiteClient.create(domain, '/', () => ({
        statusCode: 302,
        head: {
            Location: 'https://nodesite.eu/',
        },
    }));
    nodesite_eu_1.NodeSiteClient.io((socket, site) => {
        socket.on('message', async (message) => {
            if (typeof message !== 'string')
                return;
            try {
                const payload = await cypher_1.default.decrypt(message);
                receive(payload);
            }
            catch (error) {
                terminal_1.default.write('Received unauthorized or invalid request.');
            }
        }, false);
        socket.on('public-key', (hash, pubkey) => {
            if (typeof hash !== 'string')
                return;
            if (typeof pubkey !== 'string')
                return;
            try {
                if ((blake2sHex(pubkey) === hash) && (config_1.trusted_keys.__has(hash))) {
                    cypher_1.default.addKey(pubkey);
                    exports.sockets.set(hash, socket);
                    socket.once('hello', () => hook_1.default.emit('send', {
                        event: 'request-state',
                    }));
                    socket.emit('hello');
                }
                else {
                    socket.emit('error-not-trusted');
                }
            }
            catch (error) { }
        }, false);
        socket.on('query-public-key', () => {
            socket.emit('public-key', cypher_1.default.hash, cypher_1.default.key);
            socket.emit('query-public-key');
        }, false);
    });
}
exports.default = initServer;
function broadcast(message) {
    for (const [hash, socket] of exports.sockets.entries()) {
        cypher_1.default.encrypt(hash, message).then((message) => socket.emit('message', message));
    }
}
exports.broadcast = broadcast;
const receive = common_1.default(broadcast);
module.exports = initServer;
Object.assign(initServer, {
    default: initServer,
    init: initServer,
    broadcast,
    initServer,
    receive,
    sockets: exports.sockets,
});
