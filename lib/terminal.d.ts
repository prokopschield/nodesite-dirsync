declare class Terminal {
    constructor();
    queue: Function[];
    ask(question: string): Promise<string>;
    reply(line: string): void;
    write(line?: string, newline?: boolean): void;
}
declare const terminal: Terminal;
export default terminal;
