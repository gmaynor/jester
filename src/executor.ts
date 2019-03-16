"use strict";
import { ChildProcess, exec } from 'child_process';
import * as fkill from 'fkill';
import { platform } from 'os';
import * as vscode from 'vscode';
import Logger from './logger';

export class Executor {
    public static runInTerminal(command: string, cwd?: string, addNewLine: boolean = true, terminal: string = "Test Explorer"): void {
        if (this.terminals[terminal] === undefined) {
            this.terminals[terminal] = vscode.window.createTerminal(terminal);
        }
        this.terminals[terminal].show();
        if (cwd) {
            this.terminals[terminal].sendText(`cd "${cwd}"`);
        }
        this.terminals[terminal].sendText(command, addNewLine);
    }

    public static exec(command: string, callback: any, cwd?: string, addToProcessList?: boolean) {
        const childProcess = exec(this.handleWindowsEncoding(command), { encoding: "utf8", maxBuffer: 5120000, cwd }, callback);

        if (addToProcessList) {

            Logger.info(`Process ${childProcess.pid} started`);

            this.processes.push(childProcess);

            childProcess.on("close", (code: number) => {

                const index = this.processes.map((p) => p.pid).indexOf(childProcess.pid);
                if (index > -1) {
                    this.processes.splice(index, 1);
                    Logger.info(`Process ${childProcess.pid} finished`);
                }
            });
        }

        return childProcess;
    }

    public static onDidCloseTerminal(closedTerminal: vscode.Terminal): void {
        delete this.terminals[closedTerminal.name];
    }

    public static stop(): boolean {
        if (!this.processes.length) {
            return false;
        }
        this.processes.forEach((p) => {
            Logger.info(`Stop processes requested - ${p.pid} stopped`);
            p.killed = true;
            fkill(p.pid, { force: true });
        });

        this.processes = [];
        return true;
    }

    private static terminals: { [id: string]: vscode.Terminal } = {};

    private static isWindows: boolean = platform() === "win32";

    private static processes: ChildProcess[] = [];

    private static handleWindowsEncoding(command: string): string {
        return this.isWindows ? `chcp 65001 | ${command}` : command;
    }
}
