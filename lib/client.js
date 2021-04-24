"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cypher_1 = __importDefault(require("./cypher"));
const io_nodesite_eu_1 = require("io.nodesite.eu");
const terminal_1 = __importDefault(require("./terminal"));
const chalk_1 = __importDefault(require("chalk"));
const common_1 = __importDefault(require("./common"));
async function initClient(uri) {
    await cypher_1.default.ready;
    io_nodesite_eu_1.socket.once('public-key', async (hash, key) => {
        if (cypher_1.default.hasKey(hash)) {
            terminal_1.default.write(`Connected to host with known key: ${hash}`, true);
        }
        else if ((await terminal_1.default.ask(`Is this public key correct? ${hash}`))[0].toLowerCase() === 'y') {
            terminal_1.default.write(`Added ${hash} to known hosts!`);
            await cypher_1.default.addKey(key);
            const receive = common_1.default(async (message) => {
                io_nodesite_eu_1.socket.emit('message', await cypher_1.default.encrypt(hash, message));
            });
            io_nodesite_eu_1.socket.on('message', async (message) => {
                try {
                    const payload = await cypher_1.default.decrypt(message);
                    receive(payload);
                }
                catch (error) {
                    console.log('Received invalid message:', message);
                }
            });
            io_nodesite_eu_1.socket.emit('hello');
        }
        else {
            terminal_1.default.write(`Did not answer 'yes'`);
            terminal_1.default.write('Process will exit.', true);
            process.exit();
        }
    });
    io_nodesite_eu_1.socket.on('query-public-key', () => {
        io_nodesite_eu_1.socket.emit('public-key', cypher_1.default.hash, cypher_1.default.key);
    });
    io_nodesite_eu_1.socket.on('error-not-trusted', () => {
        terminal_1.default.write(chalk_1.default.red('Error: Your public key is not trusted.'));
        terminal_1.default.write(chalk_1.default.green(`Make the host run`) + chalk_1.default.yellow(` npx nodesite-dirsync trust ${cypher_1.default.hash}`));
    });
    io_nodesite_eu_1.init(uri);
    io_nodesite_eu_1.socket.once('ConnectionSuccess', () => io_nodesite_eu_1.socket.emit('query-public-key'));
}
exports.default = initClient;
module.exports = initClient;
Object.assign(initClient, {
    default: initClient,
    init: initClient,
});
