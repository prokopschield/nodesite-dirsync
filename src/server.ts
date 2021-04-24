const { blake2sHex } = require('blakejs');
import chalk from 'chalk';
import {
	trusted_keys,
	username,
} from './config';
import cypher from './cypher';
import {
	NodeSiteClient,
	NodeSiteClientSocket,
} from 'nodesite.eu';
import terminal from './terminal';
import common from './common';
import hook from './hook';

export const sockets = new Map<string, NodeSiteClientSocket>();

export default async function initServer () {

	await cypher.ready;

	const domain = `websync-${username}-${cypher.hash.substr(16, 15)}`;
	terminal.write(chalk.green(chalk.green('\r\n\nOthers can join this session using\r\n')));
	terminal.write(chalk.red(`npx nodesite-dirsync join ${domain}\r\n\n`));

	// instanciate a nodesite server that never responds
	NodeSiteClient.create(domain, '/', () => ({
		statusCode: 302,
		head: {
			Location: 'https://nodesite.eu/',
		},
	}));
	
	NodeSiteClient.io((socket: NodeSiteClientSocket, site: string) => {

		socket.on('message', async (message: unknown) => {
			if (typeof message !== 'string') return;
			try {
				const payload = await cypher.decrypt(message);
				receive(payload);
			} catch (error) {
				terminal.write('Received unauthorized or invalid request.');
			}
		}, false);

		socket.on('public-key', (hash: unknown, pubkey: unknown) => {
			if (typeof hash !== 'string') return;
			if (typeof pubkey !== 'string') return;
			try {
				if ((blake2sHex(pubkey) === hash) && (trusted_keys.__has(hash))) {
					cypher.addKey(pubkey);
					sockets.set(hash, socket);
					socket.once('hello', () => hook.emit('send', {
						event: 'request-state',
					}));
					socket.emit('hello');
				} else {
					socket.emit('error-not-trusted');
				}
			} catch (error) {}
		}, false);

		socket.on('query-public-key', () => {
			socket.emit('public-key', cypher.hash, cypher.key);
			socket.emit('query-public-key');
		}, false);

	});

}

export function broadcast (message: object) {
	for (const [ hash, socket ] of sockets.entries()) {
		cypher.encrypt(hash, message).then((message: string) => socket.emit('message', message));
	}
}

const receive = common(broadcast);

module.exports = initServer;

Object.assign(initServer, {
	default: initServer,
	init: initServer,
	broadcast,
	initServer,
	receive,
	sockets,
});
