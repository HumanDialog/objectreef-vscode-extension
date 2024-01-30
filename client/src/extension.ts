/* --------------------------------------------------------------------------------------------
    * The MIT License
    Copyright 2023 Human Dialog
    Permission is hereby granted, free of charge, to any person obtaining a copy of 
    this software and associated documentation files (the “Software”), to deal in 
    the Software without restriction, including without limitation the rights to use, 
    copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the 
    Software, and to permit persons to whom the Software is furnished to do so, 
    subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all 
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, 
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES 
    OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND 
    NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT 
    HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, 
    WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
    FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR 
    OTHER DEALINGS IN THE SOFTWARE.
  * ------------------------------------------------------------------------------------------ */

import * as cp from 'child_process';
import * as net from 'net';
import * as vscode from 'vscode';

import {
	workspace,
	ExtensionContext,
	WorkspaceFolder,
	DebugConfiguration,
	ProviderResult,
	CancellationToken
} from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	StreamInfo,
	RevealOutputChannelOn
} from 'vscode-languageclient';
import { Reserved_port } from './Reserved_port';
import { Stored_port } from './Stored_port';
import { Build_task_provider } from './build_task_provider';

let client: LanguageClient;
let socket: net.Socket;


function createServerWithSocket(port_no :number) 
{
    let dls: cp.ChildProcess;
    return new Promise<cp.ChildProcess>(resolve => {
        let server = net.createServer(s => {
			//closeSvmTerminal();
            socket = s;
            socket.setNoDelay(true);
            server.close();
			resolve(dls);
		});

		server.once('listening', () =>
			{
				client.info('listening port: ' + port_no)
			})

		server.listen(port_no, '127.0.0.1', () => {
			
		});
    });
}

var ErrorAction;
(function (ErrorAction) {
    ErrorAction[ErrorAction["Continue"] = 1] = "Continue";
    ErrorAction[ErrorAction["Shutdown"] = 2] = "Shutdown";
})(ErrorAction = exports.ErrorAction || (exports.ErrorAction = {}));

var CloseAction;
(function (CloseAction) {
    CloseAction[CloseAction["DoNotRestart"] = 1] = "DoNotRestart";
    CloseAction[CloseAction["Restart"] = 2] = "Restart";
})(CloseAction = exports.CloseAction || (exports.CloseAction = {}));


class SvmErrorHandler 
{
    constructor() 
	{
        
	}
	
	error(_error, _message, count) 
	{
		client.error('SvmErrorHandler: [error] '+_message);
    	return ErrorAction.Continue;
    }
	
	closed() 
	{
		client.info('Language Server disconnected');
        return CloseAction.Restart;
    }
}


  
export function deactivate(): Thenable<void> | undefined 
{	
	if (build_task_provider)
		build_task_provider.dispose();
	

	if (!client)
		return undefined;
	
	return client.stop();
}


class SVMConfigurationProvider implements vscode.DebugConfigurationProvider 
{
	resolveDebugConfiguration(folder: WorkspaceFolder | undefined, config: DebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration> 
	{
		return config; // do nothing?
	}
}


class SVMDebugAdapterFactory implements vscode.DebugAdapterDescriptorFactory 
{
	public dbg_port :number = 0;

	createDebugAdapterDescriptor(session: vscode.DebugSession, executable: vscode.DebugAdapterExecutable): vscode.ProviderResult<vscode.DebugAdapterDescriptor> 
	{
		return new vscode.DebugAdapterServer(this.dbg_port);
		
	}
}

async function request_reallocate_ports()
{
	let ls_port_no :number;
	let dbg_port_no :number;
	if(await reallocate_ports((l, d) => {ls_port_no=l; dbg_port_no=d; } ))
		vscode.window.showInformationMessage('New language server port: ' + ls_port_no + ' and new debugger port: ' + dbg_port_no);
	else
		vscode.window.showErrorMessage("Can't allocate new ports")
}

async function reallocate_ports(out: (ls :number, dbg :number) => void ) : Promise<boolean>
{
	let free_ls_port :Reserved_port = await Reserved_port.create(20000, 50000);
	let free_dbg_port :Reserved_port = await Reserved_port.create(20000, 50000);

	let root_uri = vscode.workspace.workspaceFolders[0].uri;

	try
	{
		vscode.workspace.fs.createDirectory( vscode.Uri.file(root_uri.fsPath + "/.reef"));
	}
	catch(err)
	{

	}
	

	let stored_ls_port :Stored_port =  new Stored_port(root_uri.fsPath +  "/.reef/vscode_lsport");
	await stored_ls_port.set_value(free_ls_port.peek());

	let stored_dbg_port :Stored_port =  new Stored_port(root_uri.fsPath + "/.reef/vscode_dbgport");
	await stored_dbg_port.set_value(free_dbg_port.peek());
	
	out(free_ls_port.get(), free_dbg_port.get());
	return true;
}

async function read_ports( out: (ls :number, dbg :number) => void ) :Promise<boolean>
{
	let root_uri = vscode.workspace.workspaceFolders[0].uri;
	let stored_ls_port :Stored_port =  new Stored_port( root_uri.fsPath + "/.reef/vscode_lsport");
	let stored_dbg_port :Stored_port =  new Stored_port(root_uri.fsPath + "/.reef/vscode_dbgport");

	let ls_port_no = await stored_ls_port.get_value();
	let dbg_port_no = await stored_dbg_port.get_value();

	if((ls_port_no <= 0) || (dbg_port_no <= 0))
		return false;
	
	out(ls_port_no, dbg_port_no);
	return true;
}


async function request_build()
{
	vscode.window.showInformationMessage('run build command');
	
}

/// /////////////////////////////////////////////////////////////////////////////
/// /////////////////////////////////////////////////////////////////////////////
/// /////////////////////////////////////////////////////////////////////////////
/// /////////////////////////////////////////////////////////////////////////////
let build_task_provider: vscode.Disposable | undefined;
export async function activate(context: ExtensionContext) {
/// /////////////////////////////////////////////////////////////////////////////
	let svmconfig = vscode.workspace.getConfiguration('svmserver');
	
	let ls_port_no :number = svmconfig.get("port");
	let dbg_port_no :number; svmconfig.get("debugport");

	if((!ls_port_no) && (!dbg_port_no))
	{
		if(!await read_ports( (l, d) => {ls_port_no=l; dbg_port_no=d; } ))
			await reallocate_ports( (l, d) => {ls_port_no=l; dbg_port_no=d; } );
	}

	const serverOptions: ServerOptions = () => createServerWithSocket( ls_port_no ).then<StreamInfo>(() => ({ reader: socket, writer: socket }));

	let clientOptions: LanguageClientOptions = 
	{
		documentSelector: [{ scheme: 'file', language: 'svmocl' }, {scheme: 'file', language: 'svmbas'}],
		synchronize: {
			// Notify the server about file changes to '.clientrc files contained in the workspace
			fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
		},
		errorHandler: new SvmErrorHandler(),
		revealOutputChannelOn: RevealOutputChannelOn.Never
	};

	client = new LanguageClient(
		'languageServerSVM',
		'Object Reef',
		serverOptions,
		clientOptions
	);
	
	client.start();

	const workspaceRoot = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
		? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;
	
	if (workspaceRoot) 
		build_task_provider = vscode.tasks.registerTaskProvider(Build_task_provider.build_type, new Build_task_provider(workspaceRoot));
	
	client.info('Object Reef Extension Activated');

	context.subscriptions.push(
		vscode.commands.registerCommand('svmserver.reallocate_ports', request_reallocate_ports),
		vscode.commands.registerCommand('svmserver.debug', (resource: vscode.Uri) => {
			vscode.debug.startDebugging(undefined, {
				type: 'svm',
				name: 'Debug Object Reef',
				request: 'attach',
				program: null//program: resource.fsPath
			});
		})
	)

	const provider = new SVMConfigurationProvider();
	context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('svm', provider));

	const factory = new SVMDebugAdapterFactory();
	factory.dbg_port = dbg_port_no;
	context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory('svm', factory));
}