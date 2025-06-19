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





function getWebviewContent(): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Prompt Modifier Panel</title>
      <style>
        body {
          font-family: sans-serif;
          padding: 1em;
          color: #222;
        }

        textarea::placeholder {
          font-style: italic;
          color: #666;
        }

        textarea,
        #response,
        #optimizedPrompt {
          background-color: #eee;
          color: #222;
          font-family: sans-serif;
          font-size: 14px;
          font-weight: 400;
          border: none;
          border-radius: 6px;
          padding: 10px;
          margin-top: 0.5em;
          white-space: pre-wrap;
          width: 100%;
          box-sizing: border-box;
        }

        #response em,
        #optimizedPrompt em {
          color: #666;
          font-style: italic;
        }

        button {
          background-color: #444;
          color: #fff;
          font-family: sans-serif;
          font-size: 14px;
          font-weight: 500;
          border: none;
          padding: 8px 12px;
          border-radius: 6px;
          margin-top: 10px;
          margin-right: 6px;
          cursor: pointer;
        }

        button:hover {
          background-color: #555;
        }

        .field {
          display: flex;
          gap: 8px;
          margin-bottom: 8px;
          align-items: baseline;
        }

        .field strong {
          min-width: 100px;
          color: #aaa;
        }

        .field span {
          color: #666;
        }

        .nested {
          margin-left: 1em;
        }
		
        h2{
          color: #fff;
        }
        h3 {
          color: #888;
          margin-top: 1em;
        }
        .feature-block {
          background-color: #eee;
          padding: 10px;
          border-radius: 6px;
          margin-top: 0.5em;
          font-family: sans-serif;
          font-size: 14px;
          color: #222;
        }
      </style>
    </head>
    <body>
      <h2>Prompt Modifier</h2>

      <h3>Initial Prompt:</h3>
      <textarea id="query" placeholder="Enter your prompt..."></textarea><br>

      <div style="margin-top: 10px;">
        <button onclick="sendQuery()">Generate Features</button>
      </div>

      <h3>Generated Features:</h3>
      <div id="response"><em>Waiting for response...</em></div>
      <button id="candidatesBtn" style="display: none;" onclick="sendCandidates()">Generate Candidates</button>

      <h3>Candidate Features:</h3>
      <div id="candidateResponse" class="feature-block">
        <em>Waiting for features...</em>
      </div>

      <div style="margin-top: 10px;">
        <button id="regenerateBtn" style="display: none;" onclick="sendOptimizedPrompt()">Regenerate Prompt</button>
      </div>

      <h3>Optimized Prompt:</h3>
      <div id="optimizedPrompt"><em>Regenerated prompt will appear here.</em></div>


      <script>
        const vscode = acquireVsCodeApi();
        let lastParsedFeatures = null;

        function sendQuery() {
          const query = document.getElementById('query').value.trim();
          if (!query) {
            document.getElementById('response').innerHTML = '<em>Please enter a prompt.</em>';
            return;
          }

          document.getElementById('response').innerHTML = '<em>Loading...</em>';
          document.getElementById('optimizedPrompt').innerHTML = '<em>Regenerated prompt will appear here.</em>';
          document.getElementById('regenerateBtn').style.display = 'none';
          lastParsedFeatures = null;

          vscode.postMessage({ type: 'query', prompt: query });
        }

        function sendOptimizedPrompt() {
          if (!lastParsedFeatures) return;
          document.getElementById('optimizedPrompt').innerHTML = '<em>Optimizing...</em>';
          vscode.postMessage({ type: 'regenerate', features: lastParsedFeatures });
        }

        function renderValue(value, parentKey = '') {
          if (typeof value === 'object' && value !== null) {
            const container = document.createElement('div');

            if (Array.isArray(value)) {
              const ul = document.createElement('ul');
              ul.style.margin = '0';
              ul.style.paddingLeft = '20px';

              value.forEach(item => {
                const li = document.createElement('li');
                li.textContent = item;
                ul.appendChild(li);
              });

              container.appendChild(ul);
            } else {
              for (const [key, val] of Object.entries(value)) {
                const row = document.createElement('div');
                row.className = 'field';

                const label = document.createElement('strong');
                label.textContent = key.charAt(0).toUpperCase() + key.slice(1) + ':';

                if (key === 'fixed') {
                  const checkbox = document.createElement('input');
                  checkbox.type = 'checkbox';
                  checkbox.checked = Boolean(val);
                  checkbox.dataset.feature = parentKey;

                  checkbox.addEventListener('change', () => {
                    scheduleFeatureUpdate();
                  });

                  row.appendChild(label);
                  row.appendChild(checkbox);
                } else if (typeof val === 'object') {
                  row.appendChild(label);
                  row.appendChild(renderValue(val, parentKey || key));
                } else {
                  const valEl = document.createElement('span');
                  valEl.textContent = String(val);
                  row.appendChild(label);
                  row.appendChild(valEl);
                }

                container.appendChild(row);
              }
            }

            return container;
          } else {
            const span = document.createElement('span');
            span.textContent = String(value);
            return span;
          }
        }



        window.addEventListener('message', event => {
          const message = event.data;
          const responseEl = document.getElementById('response');
          const optimizedEl = document.getElementById('optimizedPrompt');

          if (message.type === 'response') {
            responseEl.innerHTML = '';
            try {
              const parsed = JSON.parse(message.text);
              lastParsedFeatures = parsed;
              document.getElementById('regenerateBtn').style.display = 'inline-block';
              responseEl.appendChild(renderValue(parsed));
            } catch {
              lastParsedFeatures = null;
              responseEl.textContent = message.text;
            }
          } else if (message.type === 'optimized') {
            try {
              const parsed = JSON.parse(message.text);
              const prompts = parsed.prompts || [];

              if (Array.isArray(prompts) && prompts.length > 0) {
                optimizedEl.innerHTML = prompts
                  .map((prompt, i) => '<div><strong>' + (i + 1) + '.</strong> ' + prompt + '</div>')
                  .join('<br/>');
              } else {
                optimizedEl.innerHTML = '<em>No prompts found in response.</em>';
              }
            } catch (err) {
              console.error('Failed to parse optimized prompt JSON:', err);
              optimizedEl.innerHTML = '<pre>' + message.text + '</pre>';
            }
          } else if (message.type === 'candidates') {
            const candidateEl = document.getElementById('candidateResponse');
            candidateEl.innerHTML = '';
            try {
              let cleanedText = message.text.trim();

              const parsed = JSON.parse(cleanedText);
              
              lastParsedFeatures = parsed;
              document.getElementById('regenerateBtn').style.display = 'inline-block';
              candidateEl.appendChild(renderValue(parsed));
            } catch {
              candidateEl.textContent = message.text || 'Failed to parse candidate output.';
            }
          } else if (message.type === 'showCandidatesButton') {
            document.getElementById('candidatesBtn').style.display = 'inline-block';
          }


        });
      
        let updateTimeout = null;
        function scheduleFeatureUpdate() {
          if (updateTimeout) clearTimeout(updateTimeout);
          updateTimeout = setTimeout(updateFeatureStatesFromCheckboxes, 300);
        }

        function updateFeatureStatesFromCheckboxes() {
          const checkboxes = document.querySelectorAll('input[type="checkbox"][data-feature]');
          if (!lastParsedFeatures) return;

          checkboxes.forEach(cb => {
            const feature = cb.dataset.feature;
            if (lastParsedFeatures[feature]) {
              lastParsedFeatures[feature].fixed = cb.checked;
            }
          });

          console.log('Updated features:', lastParsedFeatures);
        }
        function sendCandidates() {
          if (!lastParsedFeatures) return;
          document.getElementById('candidateResponse').innerHTML = '<em>Generating candidate features...</em>';
          vscode.postMessage({ type: 'candidates', features: lastParsedFeatures });
        }

      </script>
    </body>
    </html>
  `;
}




// This method is called when your extension is deactivated
export function deactivate() {}
