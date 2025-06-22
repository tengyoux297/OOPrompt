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

	panel.webview.html = getWebviewContent( panel, context.extensionUri);

	// Handle messages from the webview
	panel.webview.onDidReceiveMessage(
    async message => {
      if (message.type === 'query') {
        const response = await queryCustomGPT(message.prompt);
        panel.webview.postMessage({ type: 'response', text: response });

        // Enable "Generate Candidates"
        panel.webview.postMessage({ type: 'showCandidatesButton' });

      } else if (message.type === 'regenerate') {
        const regenerated = await regeneratePromptFromFeatures(message.features);
        panel.webview.postMessage({ type: 'optimized', text: regenerated });

      } else if (message.type === 'candidates') {
        const response = await queryCandidateGenerator(message.features);
        panel.webview.postMessage({ type: 'candidates', text: response });
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
async function queryCustomGPT(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  const featureGenerator = process.env.FEATURE_GENERATOR; // stored in .env
  const promptGenerator = process.env.PROMPT_GENERATOR; // stored in .env

  if (!apiKey || !featureGenerator) {
    return 'Missing API key or Assistant ID';
  }

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'OpenAI-Beta': 'assistants=v2'
  };

  // 1. Create a thread
  const threadRes = await fetch('https://api.openai.com/v1/threads', {
    method: 'POST',
    headers,
  });

  const threadData = await threadRes.json();
  const threadId = threadData.id;

  // 2. Add user message to the thread
  await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      role: 'user',
      content: prompt
    })
  });

  // 3. Run the assistant on the thread
  const runRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      assistant_id: featureGenerator,
    })
  });

  const runData = await runRes.json();
  const runId = runData.id;

  // 4. Poll until the run is complete
  let status = 'in_progress';
  while (status !== 'completed') {
    await new Promise(res => setTimeout(res, 1000));
    const checkRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
      headers
    });
    const checkData = await checkRes.json();
    status = checkData.status;
    if (status === 'failed' || status === 'cancelled') {
      return `Error: Assistant run ${status}`;
    }
  }

  // 5. Retrieve the messages
  const messagesRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
    headers
  });

  const messagesData = await messagesRes.json();
  const messages = messagesData.data;

  const assistantReply = messages.find((msg: any) => msg.role === 'assistant')?.content?.[0]?.text?.value;

  return assistantReply || 'No response from assistant.';
}

async function regeneratePromptFromFeatures(features: object): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  const promptGenerator = process.env.PROMPT_GENERATOR;

  if (!apiKey || !promptGenerator) {
    return 'Missing API key or Prompt Generator Assistant ID';
  }

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'OpenAI-Beta': 'assistants=v2'
  };

  const threadRes = await fetch('https://api.openai.com/v1/threads', {
    method: 'POST',
    headers
  });
  const threadId = (await threadRes.json()).id;

  const messageContent = `Generate an optimized prompt using the following JSON features, including possible candidate options. You may consider the candidates, but only use the "value" field content (with grammatical variations only, no synonyms). Do not use alternatives from "candidates" directly. JSON input:
  ${JSON.stringify(features, null, 2)}`;

  await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ role: 'user', content: messageContent })
  });

  const runRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ assistant_id: promptGenerator })
  });
  const runId = (await runRes.json()).id;

  let status = 'in_progress';
  while (status !== 'completed') {
    await new Promise(res => setTimeout(res, 1000));
    const check = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, { headers });
    status = (await check.json()).status;
    if (status === 'failed' || status === 'cancelled') {return `Error: Assistant run ${status}`;}
  }

  const msgRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, { headers });
  const msgData = await msgRes.json();

  return msgData.data.find((m: any) => m.role === 'assistant')?.content?.[0]?.text?.value || 'No optimized prompt.';
}

async function queryCandidateGenerator(features: object): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  const candidateGenerator = process.env.CANDIDATE_GENERATOR;

  if (!apiKey || !candidateGenerator) {
    return 'Missing API key or Candidate Generator Assistant ID';
  }

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'OpenAI-Beta': 'assistants=v2'
  };

  const threadRes = await fetch('https://api.openai.com/v1/threads', {
    method: 'POST',
    headers
  });
  const threadId = (await threadRes.json()).id;

  const messageContent = `Given these base features, generate a new set of candidate features:\n${JSON.stringify(features, null, 2)}`;
  await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ role: 'user', content: messageContent })
  });

  const runRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ assistant_id: candidateGenerator })
  });
  const runId = (await runRes.json()).id;

  let status = 'in_progress';
  while (status !== 'completed') {
    await new Promise(res => setTimeout(res, 1000));
    const check = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, { headers });
    status = (await check.json()).status;
    if (status === 'failed' || status === 'cancelled') {return `Error: Assistant run ${status}`;}
  }

  const msgRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, { headers });
  const msgData = await msgRes.json();

  return msgData.data.find((m: any) => m.role === 'assistant')?.content?.[0]?.text?.value || 'No candidate features returned.';
}





import * as fs from 'fs';
import * as path from 'path';

function getWebviewContent(panel: vscode.WebviewPanel, extensionUri: vscode.Uri): string {
  const filePath = vscode.Uri.joinPath(extensionUri, 'src', 'webviewContent.html');
  const htmlContent = fs.readFileSync(filePath.fsPath, 'utf8');

  // Fix resource paths (for scripts, CSS, etc.)
  return htmlContent.replace(/{{baseUri}}/g, panel.webview.asWebviewUri(extensionUri).toString());
}



// This method is called when your extension is deactivated
export function deactivate() {}
