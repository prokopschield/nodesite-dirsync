const { blake2sHex } = require('blakejs');
import config, {
	keydir,
	maindir,
	username,
	password,
} from './config';
import fs from 'fs';
import * as openpgp from 'openpgp';
import {
	Key,
} from 'openpgp';
import path from 'path';

export const public_key_path = path.resolve(maindir, 'pub.key');
export const private_key_path = path.resolve(maindir, 'priv.key');

for (const dir of [
	keydir,
	maindir,
]) {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, {
			recursive: true,
		});
	}
}

if (!username) {
	console.log(`Could not detect your username! Please specify it manually in ${path.resolve('.', 'config', 'nsvscs.json')}`);
	config.set('username', 'ENTER USERNAME HERE!');
	process.exit();
}

class Cypher {

	constructor () {
		this.intialize();
	}

	async intialize () {
		if (fs.existsSync(private_key_path)) {
			this.#_privateKeyArmored = fs.readFileSync(private_key_path, 'utf8');
			this.#_key = await openpgp.readKey({
				armoredKey: this.#_privateKeyArmored,
			});
			this.#_key.decrypt(password);
			this.#_publicKeyArmored = this.#_key.toPublic().armor();
		} else {
			const {key, privateKeyArmored, publicKeyArmored} = await openpgp.generateKey({
				userIds: [{ name: username || 'Guest' }],
				curve: 'p521',
				passphrase: password
			});
			this.#_privateKeyArmored = privateKeyArmored;
			this.#_publicKeyArmored = publicKeyArmored;
			this.#_key = key;
			fs.writeFile(private_key_path, privateKeyArmored, () => {
				fs.writeFile(public_key_path, publicKeyArmored, () => {});
			});
		}

		config.set('pubkey', this.#_hash = blake2sHex(this.#_publicKeyArmored));

		while (this.#_readyWaiters.length) {
			const waiter = this.#_readyWaiters.pop();
			if (typeof waiter === 'function') waiter();
		}
		this.#_isReady = true;
	}

	#_privateKeyArmored?: string;
	#_publicKeyArmored?: string;
	#_key?: Key;
	#_hash?: string;

	get hash (): string {
		return this.#_hash ?? '';
	}

	get key (): string {
		return this.#_publicKeyArmored ?? '';
	}

	#_isReady: boolean = false;
	#_readyWaiters: Function[] = [];
	get ready (): boolean | Promise<boolean> {
		return this.#_isReady || new Promise(resolve => this.#_readyWaiters.push(resolve));
	}

	#_keyCache: Map<string, Key> = new Map();

	hasKey (hash: string): boolean {
		return this.#_keyCache.has(hash);
	}

	async getKey (hash: string): Promise<Key> {
		const cached = this.#_keyCache.get(hash);
		if (cached) return cached;
		const keypath = path.resolve(keydir, hash);
		if (fs.existsSync(keypath)) {
			const pubkey = await fs.promises.readFile(keypath, 'utf8');
			const key = await openpgp.readKey({
				armoredKey: pubkey,
			});
			if (!this.#_keyCache.has(hash)) this.#_keyCache.set(hash, key);
			return key;
		}
		throw new Error(`Key does not exist: ${hash}`);
	}

	async addKey (publicKeyArmored: string): Promise<Key> {
		const hash = blake2sHex(publicKeyArmored);
		if (this.#_keyCache.has(hash)) return this.getKey(hash);
		const keypath = path.resolve(keydir, hash);
		if (!fs.existsSync(keypath)) {
			fs.writeFile(keypath, publicKeyArmored, () => {});
		}
		const key = await openpgp.readKey({
			armoredKey: publicKeyArmored,
		});
		if (!this.#_keyCache.has(hash)) this.#_keyCache.set(hash, key);
		return key;
	}

	async encrypt (recipient: string, message: object): Promise<string> {
		await this.ready;
		if (!(this.#_key instanceof Key)) throw new Error(`Internal error: Key not loaded!`);

		const pubkey = await this.getKey(recipient);

		const payload = await openpgp.encrypt({
			message: openpgp.Message.fromText(JSON.stringify(message)),
			publicKeys: [ pubkey ],
			privateKeys: [ this.#_key ],
		});
	
		const transportedObject = ({
			sender: this.#_hash,
			recipient,
			message: payload,
		});
	
		const encryptedMessage = await openpgp.encrypt({
			message: openpgp.Message.fromText(JSON.stringify(transportedObject)),
			publicKeys: [ pubkey ],
			privateKeys: [ this.#_key ],
		});

		return encryptedMessage;
	}

	async decrypt (encryptedMessage: string): Promise<object> {
		await this.ready;
		if (!(this.#_key instanceof Key)) throw new Error(`Internal error: Key not loaded!`);

		const wrappedEncrypted = await openpgp.readMessage({
			armoredMessage: encryptedMessage,
		});

		const wrappedStream = await openpgp.decrypt({
			message: wrappedEncrypted,
			privateKeys: [ this.#_key ],
		});

		const wrappedJson = await openpgp.stream.readToEnd(wrappedStream.data);
		if (typeof wrappedJson !== 'string') throw new Error(`Invalid JSON ${wrappedJson}`);
		const wrapped = JSON.parse(wrappedJson);

		const { sender, recipient, message: encryptedPayload } = wrapped;

		if (recipient !== this.#_hash) throw new Error(`Received and object not adressed to us!`);
		if (typeof sender !== 'string') throw new Error(`Invalid sender: ${sender}`);
		if (typeof encryptedPayload !== 'string') throw new Error(`Invalid payload: ${encryptedPayload}`);

		const payloadStream = await openpgp.decrypt({
			message: await openpgp.readMessage({
				armoredMessage: encryptedPayload,
			}),
			publicKeys: [ await this.getKey(sender) ],
			privateKeys: [ this.#_key ],
		});

		const payloadJson = await openpgp.stream.readToEnd(payloadStream.data);
		if (typeof payloadJson !== 'string') throw new Error(`Invalid Payload JSON: ${payloadJson}`);
		const payload = JSON.parse(payloadJson);

		return payload;
	}
}

const cypher = new Cypher;

export default cypher;
module.exports = cypher;

Object.assign(cypher, {
	default: cypher,
	cypher,
	public_key_path,
	private_key_path,
});
