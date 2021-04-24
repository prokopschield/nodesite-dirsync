import { getConfig } from 'doge-config';

const config = getConfig('nsvscs', {
	keydir: 'config/nsvscs/allowed-keys/',
	maindir: 'config/nsvscs/',
	backupdir: '.nsvscs-backups',
	cachedir: '.nsvscs-cache',
	username: process.env.USER || '',
	password: require('blakejs').blake2sHex(JSON.stringify(process.env) + new Date + Math.random()),
	trusted_keys: {},
});

export default config;
export const keydir = config.__getString('keydir');
export const maindir = config.__getString('maindir');
export const backupdir = config.__getString('backupdir');
export const cachedir = config.__getString('cachedir');
export const username = config.__getString('username');
export const password = config.__getString('password');
export const trusted_keys = config.__getField('trusted_keys');

module.exports = config;
