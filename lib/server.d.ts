import { NodeSiteClientSocket } from 'nodesite.eu';
export declare const sockets: Map<string, NodeSiteClientSocket>;
export default function initServer(): Promise<void>;
export declare function broadcast(message: object): void;
