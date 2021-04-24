import {
	username,
} from './config';
import cypher from './cypher';
import {
	init,
	socket,
} from 'io.nodesite.eu';
import terminal from './terminal';
import chalk from 'chalk';
import common from './common';

export default async function initClient (uri: string) {

	await cypher.ready;

	socket.once('public-key', async (hash: string, key: string) => {
		if (cypher.hasKey(hash)) {
			terminal.write(`Connected to host with known key: ${hash}`, true);
		} else if ((await terminal.ask(`Is this public key correct? ${hash}`))[0].toLowerCase() === 'y') {
			terminal.write(`Added ${hash} to known hosts!`);
			await cypher.addKey(key);
			const receive = common(async (message: object) => {
				socket.emit('message', await cypher.encrypt(hash, message));
			});
			socket.on('message', async (message: string) => {
				try {
					const payload = await cypher.decrypt(message);
					receive(payload);
				} catch (error) {
					console.log('Received invalid message:', message);
				}
			});
			socket.emit('hello');
		} else {
			terminal.write(`Did not answer 'yes'`);
			terminal.write('Process will exit.', true);
			process.exit();
		}
	});

	socket.on('query-public-key', () => {
		socket.emit('public-key', cypher.hash, cypher.key);
	});

	socket.on('error-not-trusted', () => {
		terminal.write(chalk.red('Error: Your public key is not trusted.'));
		terminal.write(chalk.green(`Make the host run`) + chalk.yellow(` npx nodesite-dirsync trust ${cypher.hash}`));
	});



	init(uri);

	socket.once('ConnectionSuccess', () => socket.emit('query-public-key'));
	

}

module.exports = initClient;

Object.assign(initClient, {
	default: initClient,
	init: initClient,
});
