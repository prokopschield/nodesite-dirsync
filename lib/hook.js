"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = __importDefault(require("events"));
const hook = new events_1.default;
module.exports = hook;
exports.default = hook;
Object.assign(hook, {
    default: hook,
    hook,
});
