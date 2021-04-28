const { blake2sHex } = require('blakejs');
import {
	blake2cloud,
	get,
	put,
} from './cloud';
import {
	backupdir,
	cachedir,
} from './config';
import EventEmitter from "events";
import fs from 'fs';
import pathutil from 'path';
import {
	watch,
} from 'ts-hound';

export default function manager (hook: EventEmitter) {
	const watcher = watch('.');
	watcher.on('create', async (file: string) => {
		(new Promise(resolve => setTimeout(async () => {
			if (fs.existsSync(file)) {
				watcher.watch(file);
				const stat = fs.statSync(file);
				if (!stat.isFile()) return false;
				hook.emit('send', {
					event: 'file-create',
					path: pathutil.relative('.', file).replace(/[\\\/]+/g, '/'),
				});
				resolve(true);
			} else resolve(false);
		}, 100))).catch(() => {});
	});
	watcher.on('change', async (file: string) => {
		if (file.includes('nsvscs')) return false;
		(new Promise(resolve => setTimeout(async () => {
			if (fs.existsSync(file)) {
				const stat = fs.statSync(file);
				if (!stat.isFile()) return false;
				const data = await fs.promises.readFile(file);
				if (!data.length) return resolve(false);
				const hashes = await put(data);
				if (hashes) {
					hook.emit('send', {
						event: 'file-change',
						path: pathutil.relative('.', file).replace(/[\\\/]+/g, '/'),
						...hashes,
					});
				}
			} else resolve(false);
		}, 100))).catch(() => {});
	});
	hook.on('file-create', async (message: {
		event: 'file-create';
		path: unknown;
	}) => {
		if (typeof message.path !== 'string') return;
		const mypath = pathutil.resolve('.', message.path);
		if (fs.existsSync(mypath)) {
			const data = await fs.promises.readFile(mypath);
			if (!data.length) return;
			const hash = blake2sHex(data);
			if (blake2cloud.__has(hash)) {
				return hook.emit('send', {
					event: 'file-init',
					path: message.path,
					blake: hash,
					cloud: blake2cloud.__get(hash),
				});
			}
			const hashes = await put(data);
			if (hashes) {
				return hook.emit('send', {
					event: 'file-init',
					path: message.path,
					...hashes,
				});
			}
		}
	});
	hook.on('file-init', async (message: {
		event: 'file-init';
		path: unknown;
		blake: unknown;
		cloud: unknown;
	}) => {
		if (typeof message.path !== 'string') return;
		if (typeof message.blake !== 'string') return;
		if (typeof message.cloud !== 'string') return;
		const mypath = pathutil.resolve('.', message.path);
		if (!mypath.includes(pathutil.resolve('.'))) return;
		if (!fs.existsSync(mypath)) {
			const data = (await get(message.cloud)) || (await get(message.blake));
			if (data && data.length) {
				const dirpath = pathutil.resolve(mypath, '..');
				if (!fs.existsSync(dirpath)) {
					fs.mkdirSync(dirpath, {
						recursive: true,
					});
				}
				return fs.promises.writeFile(mypath, data);
			}
		}
	});
	hook.on('file-change', async (message: {
		event: 'file-change';
		path: unknown;
		blake: unknown;
		cloud: unknown;
	}) => {
		if (typeof message.path !== 'string') return;
		if (typeof message.blake !== 'string') return;
		if (typeof message.cloud !== 'string') return;
		const mypath = pathutil.resolve('.', message.path);
		if (!mypath.includes(pathutil.resolve('.'))) return;
		if (fs.existsSync(mypath)) {
			const stat = fs.statSync(mypath);
			if (!stat.isFile()) return;
			const current = await fs.promises.readFile(mypath);
			const chashes = await put(current);
			if (!chashes) return;
			if ((message.blake === chashes.blake) || (message.cloud === chashes.cloud)) return;
			const cpathd = pathutil.resolve(
				'.',
				backupdir,
				pathutil.relative('.', mypath).replace('..', '__PARENT__'),
			);
			if (!fs.existsSync(cpathd)) {
				fs.mkdirSync(cpathd, {
					recursive: true,
				});
			}
			const creal = pathutil.resolve('.', cachedir, chashes.blake);
			if (!fs.existsSync(creal)) return;
			const clpath = pathutil.resolve(cpathd, Date.now().toString());
			fs.symlinkSync(creal, clpath);
		}
		const data_new = (await get(message.cloud)) || (await get(message.blake));
		if (!data_new) return;
		const dirpath = pathutil.resolve(mypath, '..');
		if (!fs.existsSync(dirpath)) {
			fs.mkdirSync(dirpath, {
				recursive: true,
			});
		}
		await fs.promises.writeFile(mypath, data_new);
		return true;
	});
	hook.on('request-state', async (message: {
		event: 'request-state';
	}) => {
		const pd = async (d: string) => {
			const dir = await fs.promises.readdir(d);
			for (const file of dir) {
				const path = pathutil.resolve(d, file);
				const stat = await fs.promises.stat(path);
				if (path.includes('nsvscs')) {
					// We do nothing here, sending nsvscs internal files is not desireable
				} else if (stat.isFile()) {
					const hashes = await put(await fs.promises.readFile(path));
					if (hashes) {
						hook.emit('send', {
							event: 'file-init',
							path: pathutil.relative('.', path).replace(/[\\\/]+/g, '/'),
							...hashes,
						});
					}
				} else if (stat.isDirectory()) {
					await pd(path);
				}
			}
		}
		pd('.');
	});
}

module.exports = manager;
