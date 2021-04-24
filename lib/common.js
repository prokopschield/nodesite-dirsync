"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const hook_1 = __importDefault(require("./hook"));
const manager_1 = __importDefault(require("./manager"));
function common(send) {
    function receiver(message) {
        if (message.event) {
            hook_1.default.emit(message.event, message);
        }
        else {
            hook_1.default.emit('receive', message);
        }
    }
    hook_1.default.on('send', (message) => send(message));
    manager_1.default(hook_1.default);
    return receiver;
}
exports.default = common;
module.exports = common;
