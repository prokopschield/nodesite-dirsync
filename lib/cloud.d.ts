/// <reference types="node" />
export declare const blake2cloud: import("doge-config").Config;
export declare const cloud2blake: import("doge-config").Config;
export declare function get(hash: string): Promise<Buffer | void>;
export declare function put(data: Buffer): Promise<{
    blake: string;
    cloud: string;
} | false>;
