// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { ChildProcess, spawn } from "child_process";
import { EnvironmentPath } from "@vscode/python-extension";
import { CancellationToken, Disposable, Uri } from "vscode";

import { DisposableStore } from "./common/lifecycle";
import { logProcessSpawn, traceDebug, traceError } from "./common/logging";
import { fileToCommandArgument } from "./common/stringExtensions";
import { ExtensionInfo } from "./constants";
import { PrivatePythonApiProvider } from "./pythonApi";

export async function launchTensorboard(
	resource: Uri | undefined,
	pythonEnv: EnvironmentPath,
	logDir: string,
): Promise<ChildProcess> {
	traceDebug(`Launching Tensorboard in ${logDir} for ${pythonEnv.path}`);

	const api = await PrivatePythonApiProvider.instance.getApi();

	const env = await api.getActivatedEnvironmentVariables(resource);

	const script = Uri.joinPath(
		ExtensionInfo.context.extensionUri,
		"pythonFiles",
		"tensorboard_launcher.py",
	);

	const args = [
		fileToCommandArgument(script.fsPath),
		fileToCommandArgument("./"),
	];

	logProcessSpawn(pythonEnv.path, args, "./");

	return spawn(pythonEnv.path, args, { cwd: logDir, env });
}

export async function waitForTensorboardToStart(
	proc: ChildProcess,
	token: CancellationToken,
): Promise<string> {
	return new Promise<string>((resolve) => {
		const disposable = new DisposableStore();

		const stdOutHandler = (data: Buffer | string) => {
			const output = data.toString("utf8");

			const match = output.match(/TensorBoard started at (.*)/);

			if (match && match[1]) {
				disposable.dispose();

				return resolve(match[1]);
			}

			traceDebug(output);
		};

		proc.stdout?.on("data", stdOutHandler);

		const stdErrHandler = (data: Buffer | string) =>
			traceError(data.toString("utf8"));

		proc.stderr?.on("data", stdErrHandler);

		disposable.add(
			new Disposable(() => proc.stdout?.off("data", stdOutHandler)),
		);

		disposable.add(
			new Disposable(() => proc.stderr?.off("data", stdErrHandler)),
		);

		disposable.add(
			token.onCancellationRequested(() => disposable.dispose()),
		);
	});
}
