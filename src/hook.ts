import EventEmitter from "events";

const hook = new EventEmitter;

module.exports = hook;
export default hook;

Object.assign(hook, {
	default: hook,
	hook,
});
