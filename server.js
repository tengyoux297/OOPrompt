const express = require('express');
const path = require('path');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Check for required environment variables
const requiredEnvVars = [
    'OPENAI_API_KEY',
    'FEATURE_GENERATOR',
    'PROMPT_GENERATOR',
    'CANDIDATE_GENERATOR',
    'GENERAL_GPT'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingEnvVars.forEach(varName => {
        console.error(`   - ${varName}`);
    });
    console.error('\n📝 Please create a .env file in the root directory with the following variables:');
    console.error('   Copy from env.example and replace with your actual values.');
    console.error('\n🔧 You can create the .env file by running:');
    console.error('   cp env.example .env');
    console.error('\n⚠️  The application will start but API calls will fail until environment variables are set.');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint to query custom GPT
app.post('/api/query', async (req, res) => {
    try {
        const { prompt } = req.body;
        
        // Check if environment variables are set
        if (!process.env.OPENAI_API_KEY || !process.env.FEATURE_GENERATOR) {
            return res.status(500).json({ 
                error: 'Missing environment variables. Please check your .env file.',
                details: 'OPENAI_API_KEY and FEATURE_GENERATOR are required.'
            });
        }
        
        const response = await queryCustomGPT(prompt);
        res.json({ type: 'response', text: response });
    } catch (error) {
        console.error('Error in query endpoint:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

// API endpoint to regenerate prompt from features
app.post('/api/regenerate', async (req, res) => {
    try {
        const { features } = req.body;
        
        // Check if environment variables are set
        if (!process.env.OPENAI_API_KEY || !process.env.PROMPT_GENERATOR) {
            return res.status(500).json({ 
                error: 'Missing environment variables. Please check your .env file.',
                details: 'OPENAI_API_KEY and PROMPT_GENERATOR are required.'
            });
        }
        
        const response = await regeneratePromptFromFeatures(features);
        res.json({ type: 'optimized', text: response });
    } catch (error) {
        console.error('Error in regenerate endpoint:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

// API endpoint to generate candidates
app.post('/api/candidates', async (req, res) => {
    try {
        const { features } = req.body;
        
        // Check if environment variables are set
        if (!process.env.OPENAI_API_KEY || !process.env.CANDIDATE_GENERATOR) {
            return res.status(500).json({ 
                error: 'Missing environment variables. Please check your .env file.',
                details: 'OPENAI_API_KEY and CANDIDATE_GENERATOR are required.'
            });
        }
        
        const response = await queryCandidateGenerator(features);
        res.json({ type: 'candidates', text: response });
    } catch (error) {
        console.error('Error in candidates endpoint:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

// API endpoint to send prompt to general GPT
app.post('/api/send-to-gpt', async (req, res) => {
    try {
        const { prompt } = req.body;
        
        // Check if environment variables are set
        if (!process.env.OPENAI_API_KEY || !process.env.GENERAL_GPT) {
            return res.status(500).json({ 
                error: 'Missing environment variables. Please check your .env file.',
                details: 'OPENAI_API_KEY and GENERAL_GPT are required.'
            });
        }
        
        const response = await sendToGeneralGPT(prompt);
        res.json({ type: 'gpt-response', text: response });
    } catch (error) {
        console.error('Error in send-to-gpt endpoint:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

// Function to query ChatGPT API
async function queryCustomGPT(prompt) {
    const apiKey = process.env.OPENAI_API_KEY;
    const featureGenerator = process.env.FEATURE_GENERATOR;

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

    const assistantReply = messages.find((msg) => msg.role === 'assistant')?.content?.[0]?.text?.value;

    return assistantReply || 'No response from assistant.';
}

async function regeneratePromptFromFeatures(features) {
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

    // Create ranked features object with ranking information
    const rankedFeatures = {};
    Object.keys(features).forEach((key, index) => {
        rankedFeatures[key] = {
            ...features[key],
            rank: index + 1,
            importance: index === 0 ? 'highest' : index === 1 ? 'high' : index === 2 ? 'medium' : 'low'
        };
    });

    const messageContent = `Generate an optimized prompt using the following JSON features, including possible candidate options. The features are ranked by importance (rank 1 is most important). You may consider the candidates, but only use the "value" field content (with grammatical variations only, no synonyms). Do not use alternatives from "candidates" directly. Prioritize higher-ranked features in the generated prompt.

Ranked JSON input:
${JSON.stringify(rankedFeatures, null, 2)}`;

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
        if (status === 'failed' || status === 'cancelled') {
            return `Error: Assistant run ${status}`;
        }
    }

    const msgRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, { headers });
    const msgData = await msgRes.json();

    return msgData.data.find((m) => m.role === 'assistant')?.content?.[0]?.text?.value || 'No optimized prompt.';
}

async function queryCandidateGenerator(features) {
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
        if (status === 'failed' || status === 'cancelled') {
            return `Error: Assistant run ${status}`;
        }
    }

    const msgRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, { headers });
    const msgData = await msgRes.json();

    return msgData.data.find((m) => m.role === 'assistant')?.content?.[0]?.text?.value || 'No candidate features returned.';
}

async function sendToGeneralGPT(prompt) {
    const apiKey = process.env.OPENAI_API_KEY;
    const generalGPT = process.env.GENERAL_GPT;

    if (!apiKey || !generalGPT) {
        return 'Missing API key or General GPT Assistant ID';
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

    await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ role: 'user', content: prompt })
    });

    const runRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ assistant_id: generalGPT })
    });
    const runId = (await runRes.json()).id;

    let status = 'in_progress';
    while (status !== 'completed') {
        await new Promise(res => setTimeout(res, 1000));
        const check = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, { headers });
        status = (await check.json()).status;
        if (status === 'failed' || status === 'cancelled') {
            return `Error: Assistant run ${status}`;
        }
    }

    const msgRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, { headers });
    const msgData = await msgRes.json();

    return msgData.data.find((m) => m.role === 'assistant')?.content?.[0]?.text?.value || 'No response from General GPT.';
}

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
}); 