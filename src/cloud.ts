const { blake2sHex } = require('blakejs');
import https from 'https';
import {
	cachedir as cachedir_unresolved,
} from './config';
import { getConfig } from 'doge-config';
import fs from 'fs';
import path from 'path';

import { unzipSync } from 'zlib';

const cachedir = path.resolve('.', cachedir_unresolved);
if (!fs.existsSync(cachedir)) fs.mkdirSync(cachedir, {
	recursive: true,
});

export const blake2cloud = getConfig('nsvscs-bc');
export const cloud2blake = getConfig('nsvscs-cb');

export async function get (hash: string): Promise<Buffer|void> {
	return new Promise(resolve => {
		const path_direct = path.resolve(cachedir, hash);
		if (fs.existsSync(path_direct)) fs.promises.readFile(path_direct).then(resolve);
		if (cloud2blake.__has(hash)) {
			const path_blake = path.resolve(cachedir, cloud2blake.__getString(hash));
			if (fs.existsSync(path_blake)) fs.promises.readFile(path_blake).then(resolve);
		}
		if (blake2cloud.__has(hash)) hash = blake2cloud.__getString(hash) || hash;
		const req = https.request(`https://static.nodesite.eu/static/${hash}`, (res) => {
			const buffers: Buffer[] = [];
			res.on('data', (chunk: Buffer) => buffers.push(chunk));
			res.on('end', () => {
				const data = unzipSync(Buffer.concat(buffers));
				const blakehash = blake2sHex(data);
				blake2cloud.__set(blakehash, hash);
				cloud2blake.__set(hash, blakehash);
				fs.promises.writeFile(path.resolve(cachedir, blakehash), data);
				resolve(data);
			});
		});
		req.end();
	});
}

export async function put (data: Buffer): Promise<{
	blake: string;
	cloud: string;
} | false> {
	return new Promise(resolve => {
		const hash = blake2sHex(data);
		const path_direct = path.resolve(cachedir, hash);
		if (!fs.existsSync(path_direct)) fs.promises.writeFile(path_direct, data);
		if (data.length > 1 << 24) resolve(false);
		if (blake2cloud.__has(hash)) resolve({
			blake: hash,
			cloud: blake2cloud.__getString(hash),
		});
		const req = https.request(`https://cloud.nodesite.eu/static/create`, {
			method: 'PUT',
		}, res => {
			const buffers: Buffer[] = [];
			res.on('data', (chunk: Buffer) => buffers.push(chunk));
			res.on('end', () => {
				const response = Buffer.concat(buffers).toString('utf8');
				if (response.length === 64) {
					blake2cloud.__set(hash, response);
					cloud2blake.__set(response, hash);
					resolve({
						blake: hash,
						cloud: response,
					});
				} else resolve(false);
			});
		});
		req.write(data);
		req.end();
	});
}
