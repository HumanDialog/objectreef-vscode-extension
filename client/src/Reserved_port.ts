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

import * as net from 'net'

export class Reserved_port
{
    private port  = 0;
    private srv  :net.Server | null = null;
    
    public static async create(from :number, to :number) : Promise<Reserved_port>
    {
        const res :Reserved_port = new Reserved_port;
        
        let port :number;
        do
        {
            port = Math.floor( from + Math.random() * (to - from));
        }
        while(!await res.try_port(port))

        res.port = port;
        return res;
    }

    public peek() :number
    {
        return this.port;
    }

    public get() :number
    {
        if(this.srv == null)
            return 0;

        this.srv.close();
        return this.port;
    }

    protected async try_port(port :number) :Promise<boolean>
    {
        let trying  = false;
        let trying_result   = false;

        this.srv = net.createServer();
        this.srv.once('error', (err) => 
            { 
             //   process.stdout.write("on error: " + port + "\n" );
                trying = false;
                trying_result = false;
            });

        this.srv.once('listening', () => 
            { 
             //   process.stdout.write("on success: " + port+ "\n" );
                trying = false;
                trying_result = true; 
            });
        
        trying = true;
        this.srv.listen(port);
        
        while(trying)
            await Reserved_port.delay(50);
        
        return trying_result;
    }

    private static async delay(ms :number)
    {
        return await new Promise(resolve => setTimeout(resolve, ms))
    }
}