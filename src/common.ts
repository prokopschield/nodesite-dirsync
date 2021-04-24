import hook from './hook';
import manager from "./manager";

export default function common (send: (message: object) => void): (message: object) => void {
	function receiver (message: {
		event: string,
		[index: string]: any;
	}) {
		if (message.event) {
			hook.emit(message.event, message);
		} else {
			hook.emit('receive', message);
		}
	}
	hook.on('send', (message) => send(message));
	manager(hook);
	return receiver as any;
}

module.exports = common;
