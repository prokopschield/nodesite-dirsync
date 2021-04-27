"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __privateKeyArmored, __publicKeyArmored, __key, __hash, __isReady, __readyWaiters, __keyCache;
Object.defineProperty(exports, "__esModule", { value: true });
exports.private_key_path = exports.public_key_path = void 0;
const { blake2sHex } = require('blakejs');
const config_1 = __importStar(require("./config"));
const fs_1 = __importDefault(require("fs"));
const openpgp = __importStar(require("openpgp"));
const openpgp_1 = require("openpgp");
const path_1 = __importDefault(require("path"));
exports.public_key_path = path_1.default.resolve(config_1.maindir, 'pub.key');
exports.private_key_path = path_1.default.resolve(config_1.maindir, 'priv.key');
for (const dir of [
    config_1.keydir,
    config_1.maindir,
]) {
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, {
            recursive: true,
        });
    }
}
if (!config_1.username) {
    console.log(`Could not detect your username! Please specify it manually in ${path_1.default.resolve('.', 'config', 'nsvscs.json')}`);
    config_1.default.set('username', 'ENTER USERNAME HERE!');
    process.exit();
}
class Cypher {
    constructor() {
        __privateKeyArmored.set(this, void 0);
        __publicKeyArmored.set(this, void 0);
        __key.set(this, void 0);
        __hash.set(this, void 0);
        __isReady.set(this, false);
        __readyWaiters.set(this, []);
        __keyCache.set(this, new Map());
        this.intialize();
    }
    async intialize() {
        if (fs_1.default.existsSync(exports.private_key_path)) {
            __classPrivateFieldSet(this, __privateKeyArmored, fs_1.default.readFileSync(exports.private_key_path, 'utf8'));
            __classPrivateFieldSet(this, __key, await openpgp.readKey({
                armoredKey: __classPrivateFieldGet(this, __privateKeyArmored),
            }));
            __classPrivateFieldGet(this, __key).decrypt(config_1.password);
            __classPrivateFieldSet(this, __publicKeyArmored, __classPrivateFieldGet(this, __key).toPublic().armor());
        }
        else {
            const { key, privateKeyArmored, publicKeyArmored } = await openpgp.generateKey({
                userIds: [{ name: config_1.username || 'Guest' }],
                curve: 'p521',
                passphrase: config_1.password
            });
            __classPrivateFieldSet(this, __privateKeyArmored, privateKeyArmored);
            __classPrivateFieldSet(this, __publicKeyArmored, publicKeyArmored);
            __classPrivateFieldSet(this, __key, key);
            fs_1.default.writeFile(exports.private_key_path, privateKeyArmored, () => {
                fs_1.default.writeFile(exports.public_key_path, publicKeyArmored, () => { });
            });
        }
        config_1.default.set('pubkey', __classPrivateFieldSet(this, __hash, blake2sHex(__classPrivateFieldGet(this, __publicKeyArmored))));
        while (__classPrivateFieldGet(this, __readyWaiters).length) {
            const waiter = __classPrivateFieldGet(this, __readyWaiters).pop();
            if (typeof waiter === 'function')
                waiter();
        }
        __classPrivateFieldSet(this, __isReady, true);
    }
    get hash() {
        return __classPrivateFieldGet(this, __hash) ?? '';
    }
    get key() {
        return __classPrivateFieldGet(this, __publicKeyArmored) ?? '';
    }
    get ready() {
        return __classPrivateFieldGet(this, __isReady) || new Promise(resolve => __classPrivateFieldGet(this, __readyWaiters).push(resolve));
    }
    hasKey(hash) {
        return __classPrivateFieldGet(this, __keyCache).has(hash);
    }
    async getKey(hash) {
        const cached = __classPrivateFieldGet(this, __keyCache).get(hash);
        if (cached)
            return cached;
        const keypath = path_1.default.resolve(config_1.keydir, hash);
        if (fs_1.default.existsSync(keypath)) {
            const pubkey = await fs_1.default.promises.readFile(keypath, 'utf8');
            const key = await openpgp.readKey({
                armoredKey: pubkey,
            });
            if (!__classPrivateFieldGet(this, __keyCache).has(hash))
                __classPrivateFieldGet(this, __keyCache).set(hash, key);
            return key;
        }
        throw new Error(`Key does not exist: ${hash}`);
    }
    async addKey(publicKeyArmored) {
        const hash = blake2sHex(publicKeyArmored);
        if (__classPrivateFieldGet(this, __keyCache).has(hash))
            return this.getKey(hash);
        const keypath = path_1.default.resolve(config_1.keydir, hash);
        if (!fs_1.default.existsSync(keypath)) {
            fs_1.default.writeFile(keypath, publicKeyArmored, () => { });
        }
        const key = await openpgp.readKey({
            armoredKey: publicKeyArmored,
        });
        if (!__classPrivateFieldGet(this, __keyCache).has(hash))
            __classPrivateFieldGet(this, __keyCache).set(hash, key);
        return key;
    }
    async encrypt(recipient, message) {
        await this.ready;
        if (!(__classPrivateFieldGet(this, __key) instanceof openpgp_1.Key))
            throw new Error(`Internal error: Key not loaded!`);
        const pubkey = await this.getKey(recipient);
        const payload = await openpgp.encrypt({
            message: openpgp.Message.fromText(JSON.stringify(message)),
            publicKeys: [pubkey],
            privateKeys: [__classPrivateFieldGet(this, __key)],
        });
        const transportedObject = ({
            sender: __classPrivateFieldGet(this, __hash),
            recipient,
            message: payload,
        });
        const encryptedMessage = await openpgp.encrypt({
            message: openpgp.Message.fromText(JSON.stringify(transportedObject)),
            publicKeys: [pubkey],
            privateKeys: [__classPrivateFieldGet(this, __key)],
        });
        return encryptedMessage;
    }
    async decrypt(encryptedMessage) {
        await this.ready;
        if (!(__classPrivateFieldGet(this, __key) instanceof openpgp_1.Key))
            throw new Error(`Internal error: Key not loaded!`);
        const wrappedEncrypted = await openpgp.readMessage({
            armoredMessage: encryptedMessage,
        });
        const wrappedStream = await openpgp.decrypt({
            message: wrappedEncrypted,
            privateKeys: [__classPrivateFieldGet(this, __key)],
        });
        const wrappedJson = await openpgp.stream.readToEnd(wrappedStream.data);
        if (typeof wrappedJson !== 'string')
            throw new Error(`Invalid JSON ${wrappedJson}`);
        const wrapped = JSON.parse(wrappedJson);
        const { sender, recipient, message: encryptedPayload } = wrapped;
        if (recipient !== __classPrivateFieldGet(this, __hash))
            throw new Error(`Received and object not adressed to us!`);
        if (typeof sender !== 'string')
            throw new Error(`Invalid sender: ${sender}`);
        if (typeof encryptedPayload !== 'string')
            throw new Error(`Invalid payload: ${encryptedPayload}`);
        const payloadStream = await openpgp.decrypt({
            message: await openpgp.readMessage({
                armoredMessage: encryptedPayload,
            }),
            publicKeys: [await this.getKey(sender)],
            privateKeys: [__classPrivateFieldGet(this, __key)],
        });
        const payloadJson = await openpgp.stream.readToEnd(payloadStream.data);
        if (typeof payloadJson !== 'string')
            throw new Error(`Invalid Payload JSON: ${payloadJson}`);
        const payload = JSON.parse(payloadJson);
        return payload;
    }
}
__privateKeyArmored = new WeakMap(), __publicKeyArmored = new WeakMap(), __key = new WeakMap(), __hash = new WeakMap(), __isReady = new WeakMap(), __readyWaiters = new WeakMap(), __keyCache = new WeakMap();
const cypher = new Cypher;
exports.default = cypher;
module.exports = cypher;
Object.assign(cypher, {
    default: cypher,
    cypher,
    public_key_path: exports.public_key_path,
    private_key_path: exports.private_key_path,
});
