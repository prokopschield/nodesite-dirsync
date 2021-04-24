import { Key } from 'openpgp';
export declare const public_key_path: string;
export declare const private_key_path: string;
declare class Cypher {
    #private;
    constructor();
    intialize(): Promise<void>;
    get hash(): string;
    get key(): string;
    get ready(): boolean | Promise<boolean>;
    hasKey(hash: string): boolean;
    getKey(hash: string): Promise<Key>;
    addKey(publicKeyArmored: string): Promise<Key>;
    encrypt(recipient: string, message: object): Promise<string>;
    decrypt(encryptedMessage: string): Promise<object>;
}
declare const cypher: Cypher;
export default cypher;
