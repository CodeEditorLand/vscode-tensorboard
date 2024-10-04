// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { ExtensionContext } from "vscode";

import { registerCodeLensProvider } from "./codelensProvider";
import { disposableStore } from "./common/lifecycle";
import { trackInstallOfExtension } from "./common/telemetry";
import { ExtensionInfo } from "./constants";
import { PrivatePythonApi, PrivatePythonApiProvider } from "./pythonApi";
import { TensorBoardSessionProvider } from "./sessionProvider";
import {
	watchEditorsForTensorboardUsage,
	watchFileSystemForTensorboardUsage,
	watchTerminalForTensorboardUsage,
} from "./usageTracker";

export async function activate(context: ExtensionContext) {
	ExtensionInfo.context = context;
	trackInstallOfExtension();
	context.subscriptions.push(disposableStore);
	context.subscriptions.push(new TensorBoardSessionProvider());
	context.subscriptions.push(registerCodeLensProvider());
	context.subscriptions.push(watchEditorsForTensorboardUsage());
	context.subscriptions.push(watchTerminalForTensorboardUsage());
	context.subscriptions.push(watchFileSystemForTensorboardUsage());
	const apiProvider = PrivatePythonApiProvider.instance;
	void apiProvider.getApi();
	return {
		registerPythonApi: (api: PrivatePythonApi) =>
			apiProvider.registerPythonApi(api),
	};
}
