/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as path from 'path';
import * as vscode from 'vscode';

export class Build_task_provider implements vscode.TaskProvider 
{
	static build_type = 'build';
	private build_promise: Thenable<vscode.Task[]> | undefined = undefined;

	constructor(workspaceRoot: string) {
		const pattern = path.join(workspaceRoot, '*.refs');
		/*const fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);
		fileWatcher.onDidChange(() => this.build_promise = undefined);
		fileWatcher.onDidCreate(() => this.build_promise = undefined);
		fileWatcher.onDidDelete(() => this.build_promise = undefined);*/
	}

	public provideTasks(): Thenable<vscode.Task[]> | undefined {
		if (!this.build_promise) {
			this.build_promise = get_build_tasks();
		}
		return this.build_promise;
	}

	public resolveTask(_task: vscode.Task): vscode.Task | undefined {
		const name = _task.definition.name;
		
		if (name) {
			// resolveTask requires that the same definition object be used.
			const definition: Build_task_definition = <any>_task.definition;
			return new vscode.Task(definition, _task.scope ?? vscode.TaskScope.Workspace, definition.name, 'ObjectReef', new vscode.ShellExecution(definition.cmd));
		}
		return undefined;
	}
}


interface Build_task_definition extends vscode.TaskDefinition {
	name: string;
	cmd: string;
	file?: string;
}

async function get_build_tasks(): Promise<vscode.Task[]> {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	const result: vscode.Task[] = [];
	if (!workspaceFolders || workspaceFolders.length === 0) 
		return result;
	
	for (const workspaceFolder of workspaceFolders) 
	{
		const folderString = workspaceFolder.uri.fsPath;
		if (!folderString)
			continue;
					
		const just_build_def: Build_task_definition = {
			name: "build",
			cmd: "reef -e build",
			type: 'build',
		};

		const build = new vscode.Task(just_build_def, workspaceFolder, just_build_def.name, 'ObjectReef', new vscode.ShellExecution(just_build_def.cmd));
		result.push(build);
		build.group = vscode.TaskGroup.Build;

		
		const build_and_save_def: Build_task_definition = {
			name: "build --save",
			cmd: "reef -e build --save",
			type: 'build',
		};
		const build_and_save = new vscode.Task(build_and_save_def, workspaceFolder, build_and_save_def.name, 'ObjectReef', new vscode.ShellExecution(build_and_save_def.cmd));
		result.push(build_and_save);
		build_and_save.group = vscode.TaskGroup.Build;
	}
	return result;
}