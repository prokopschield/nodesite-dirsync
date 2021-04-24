#!/usr/bin/env node

import {
	initClient,
	initServer,
	terminal,
} from '.';
import { trusted_keys } from './config';

let callback: Function|null = null;

for (const argument of process.argv) {
	if (callback instanceof Function) {
		callback(argument);
		callback = null;
	} else switch (argument) {
		case 'join':
			callback = async (address: string) => {
				initClient(address);
			}
			break;
		case 'host':
			initServer();
			break;
		case 'trust':
			callback = async (hash: string) => {
				trusted_keys.__set(hash, 'true');
				console.log(`${hash} trusted!`);
			}
			break;
		default:
			terminal.write(`Skipped unknown argument ${argument}`, true);
			break;
	}
}
