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

import * as vscode from 'vscode';

export class Stored_port
{
	public uri 		:vscode.Uri;
	private value 	: number = 0;

	constructor(path :string)
	{
		this.uri = vscode.Uri.file(path);
	}

	public async get_value() : Promise<number>
	{
		try
		{
			const stat :vscode.FileStat = await vscode.workspace.fs.stat(this.uri);
			if(stat.type == vscode.FileType.File)
			{
				const content = await vscode.workspace.fs.readFile(this.uri);
				const scontent = String.fromCharCode.apply(null, content);
				this.value = parseInt(scontent);
				return this.value;
			}
			else
				return 0;
		}
		catch(err)
		{
			return 0;
		}
	}

	public async set_value(val :number) : Promise<void>
	{
		this.value = val;
		await vscode.workspace.fs.writeFile( this.uri , Buffer.from( val.toString() ));
	}

}