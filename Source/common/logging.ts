// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { window, workspace } from "vscode";

import { disposableStore } from "./lifecycle";
import { Localized } from "./localize";

export const outputChannel = disposableStore.add(
	window.createOutputChannel(Localized.OutputChannelName, "log"),
);

let loggingLevel: "error" | "debug" | "off" = workspace
	.getConfiguration("tensorBoard")
	.get("log", "error");

disposableStore.add(
	workspace.onDidChangeConfiguration((e) => {
		if (e.affectsConfiguration("tensorboard.log")) {
			let setting: string = workspace.getConfiguration("tensorBoard").log;

			setting = setting.toLowerCase();

			if (
				setting === "error" ||
				setting === "debug" ||
				setting === "off"
			) {
				loggingLevel = setting;
			} else {
				console.error(`Invalid Error Level for Tensorboard ${setting}`);
			}
		}
	}),
);

export function traceError(..._args: unknown[]): void {
	if (loggingLevel === "off") {
		return;
	}

	logMessage("error", ..._args);
}
export function logProcessSpawn(cmd: string, args: string[], cwd: string) {
	if (loggingLevel === "off") {
		return;
	}

	logMessage("debug", `Spawning process: ${cmd} ${args.join(" ")} in ${cwd}`);
}
export function traceDebug(_message: string, ..._args: unknown[]): void {
	if (loggingLevel !== "debug") {
		return;
	}

	logMessage("debug", ..._args);
}

function logMessage(level: "error" | "debug", ...data: unknown[]) {
	outputChannel.appendLine(
		`${getTimeForLogging()} [${level}] ${formatErrors(...data).join(" ")}`,
	);
}

function getTimeForLogging(): string {
	const date = new Date();

	const hours = String(date.getHours()).padStart(2, "0");

	const minutes = String(date.getMinutes()).padStart(2, "0");

	const seconds = String(date.getSeconds()).padStart(2, "0");

	const millis = String(date.getMilliseconds()).padStart(3, "0");

	return `${hours}:${minutes}:${seconds}.${millis}`;
}

function formatErrors(...args: unknown[]) {
	return args.map((arg) => {
		if (!(arg instanceof Error)) {
			return arg;
		}

		const info: string[] = [`${arg.name}: ${arg.message}`.trim()];

		if (arg.stack) {
			const stack = (arg.stack || "")
				.split(/\r?\n/g)
				.map((l) => l.trim()); // remove tabs and other white space
			const firstStackLine = stack.find((l) => l.indexOf("at ") === 0);

			if (stack.length === 1) {
				//
			} else if (stack.length === 1) {
				info.push(stack[0]);
			} else if (stack.length > 1 && firstStackLine?.length) {
				info.push(firstStackLine);
			} else {
				info.push(stack[0]);
			}
		}

		const propertiesToIgnore = ["stack", "message", "name"];

		Object.keys(arg)
			.filter((key) => propertiesToIgnore.indexOf(key) === -1)
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			.forEach((key) =>
				info.push(`${key} = ${String((arg as any)[key]).trim()}`),
			);

		return info
			.filter((l) => l.trim().length)
			.map((l, i) => (i === 0 ? l : `    > ${l}`))
			.join("\n");
	});
}
