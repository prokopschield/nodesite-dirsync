class Terminal {
	constructor () {
		process.stdin.on('data', (data: Buffer) => {
			const line = data.toString('utf8');
			this.reply(line);
		});
	}

	queue: Function[] = [];

	async ask (question: string): Promise<string> {
		return new Promise(resolve => {
			if (this.queue.length) {
				const nextcallback = this.queue.pop() || (() => {});
				this.queue.push((line: string) => {
					nextcallback(line);
					this.write(`${question} >> `, true);
					this.queue.unshift(resolve);
				});
			} else {
				this.write(`${question} >> `, true);
				this.queue.unshift(resolve);
			}
		});
	}
	
	reply (line: string): void {
		if (line.match(/^[\!\:]/)) {
			try {
				console.log(eval(line.substr(1)));
			} catch (error) {
				console.log({ error });
			}
		} else {
			const callback = this.queue.shift();
			if (typeof callback === 'function') {
				callback(line);
			} else {
				this.write(`\r\nReceived ${line}`);
				this.write(`\r\nNo callback waiting. Did you mean to`);
				this.write('\r\nbegin the line with a `:`?')
			}
		}
	}

	write (line?: string, newline?: boolean) {
		process.stdout.write(`\r${newline ? '\n' : ''}${line}\r\n`);
	}
}

const terminal = new Terminal;

export default terminal;
module.exports = terminal;

Object.assign(terminal, {
	default: terminal,
	terminal,
});
