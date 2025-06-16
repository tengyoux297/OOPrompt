// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
dotenv.config();

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "ooprompt" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('ooprompt.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello VS Code!');
	});
	context.subscriptions.push(disposable);

	// option panel
	const showOptionPanelCommand = vscode.commands.registerCommand('ooprompt.showOptionPanel', () => {
	const panel = vscode.window.createWebviewPanel(
		'oopromptOptions',           // panel ID
		'OOPrompt Panel',            // title
		vscode.ViewColumn.Beside,    // show beside the editor
		{
		enableScripts: true        // allow JS in webview
		}
	);

	panel.webview.html = getWebviewContent();

	// Handle messages from the webview
	panel.webview.onDidReceiveMessage(
	async message => {
		if (message.type === 'query') {
		const response = await queryChatGPT(message.prompt);
		panel.webview.postMessage({ type: 'response', text: response });
		}
	},
	undefined,
	context.subscriptions
	);


	});

	context.subscriptions.push(showOptionPanelCommand);
}

// defines the structure of the response from OpenAI's ChatGPT API
interface OpenAIChatResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

// Function to query ChatGPT API
async function queryChatGPT(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
	// console.log('API Key:', apiKey);
  if (!apiKey) {
    return 'Missing OpenAI API Key';
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', 
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    return `Error: ${response.statusText}`;
  }

  const data = await response.json() as OpenAIChatResponse;

  return data.choices[0]?.message?.content || 'No response';
}



// This function generates the HTML content for the webview panel
function getWebviewContent(): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ChatGPT Panel</title>
      <style>
        body { font-family: sans-serif; padding: 1em; }
        textarea { width: 100%; height: 100px; }
        button { margin-top: 10px; }
        pre { background-color: #f4f4f4; padding: 10px; }
      </style>
    </head>
    <body>
      <h2>Ask ChatGPT</h2>
      <textarea id="query" placeholder="Enter your question here..."></textarea>
      <br>
      <button onclick="sendQuery()">Ask</button>
      <h3>Response:</h3>
      <pre id="response">Waiting for response...</pre>

      <script>
        const vscode = acquireVsCodeApi();

        function sendQuery() {
          const query = document.getElementById('query').value;
          document.getElementById('response').textContent = 'Loading...';
          vscode.postMessage({ type: 'query', prompt: query });
        }

        window.addEventListener('message', event => {
          const message = event.data;
          if (message.type === 'response') {
            document.getElementById('response').textContent = message.text;
          }
        });
      </script>
    </body>
    </html>
  `;
}



// This method is called when your extension is deactivated
export function deactivate() {}
