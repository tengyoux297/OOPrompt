const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
// Always load env from `.env.mvp` (not `.env`)
require('dotenv').config({ path: path.join(__dirname, '.env.mvp') });

const app = express();
const PORT = process.env.PORT || 3000;

// Check for required environment variables
const requiredEnvVars = [
    'OPENAI_API_KEY',
    'PROPERTY_GENERATOR',
    'PROMPT_OPTIMIZER',
    'PROMPT_OPTIMIZER_NL',
    'CANDIDATE_GENERATOR',
    'GENERAL_GPT',
    'TASK_IDENTIFIER'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingEnvVars.forEach(varName => {
        console.error(`   - ${varName}`);
    });
    console.error('\n📝 Please create a .env.mvp file in the root directory with the following variables:');
    console.error('   Copy from env.example and replace with your actual values.');
    console.error('\n🔧 You can create the .env.mvp file by running:');
    console.error('   cp env.example .env.mvp');
    console.error('\n⚠️  The application will start but API calls will fail until environment variables are set.');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Simple fetch function
async function simpleFetch(url, options = {}) {
    try {
        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`❌ API call failed for ${url}:`, error.message);
        throw error;
    }
}

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint to query custom GPT
app.post('/api/query', async (req, res) => {
    try {
        const { prompt } = req.body;
        
        console.log('🚀 Starting property extraction for prompt:', prompt.substring(0, 100) + '...');
        const startTime = Date.now();
        
        // Check if environment variables are set
        if (!process.env.OPENAI_API_KEY || !process.env.PROPERTY_GENERATOR) {
            return res.status(500).json({ 
                error: 'Missing environment variables. Please check your .env file.',
                details: 'OPENAI_API_KEY and PROPERTY_GENERATOR are required.'
            });
        }
        
        let response;
        try {
            response = await queryCustomGPT(prompt);
        } catch (error) {
            console.error('❌ Property extraction failed:', error.message);
            
            // Fallback: return a simple structure if the assistant is too slow
            const fallbackResponse = {
                "Main Task": "task",
                "Audience": ["everyone"],
                "Requirements": [
                    {
                        "property_name": "prompt",
                        "value": prompt
                    }
                ]
            };
            
            console.log('🔄 Using fallback response');
            response = JSON.stringify(fallbackResponse);
        }
        
        const endTime = Date.now();
        console.log(`✅ Property extraction completed in ${endTime - startTime}ms`);
        
        // Try to parse the response as JSON if it's a JSON string
        let parsedResponse = response;
        try {
            // Check if the response looks like a JSON string
            if (typeof response === 'string' && (response.trim().startsWith('[') || response.trim().startsWith('{'))) {
                parsedResponse = JSON.parse(response);
            }
        } catch (parseError) {
            // If parsing fails, keep the original response
            console.log('Failed to parse response as JSON, keeping as string:', parseError.message);
        }
        
        res.json({ 
            type: 'properties', 
            text: response,
            parsed: parsedResponse
        });
        
    } catch (error) {
        console.error('Error in /api/query:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

// API endpoint to regenerate prompt from features
app.post('/api/regenerate-prompt', async (req, res) => {
    try {
        const { features } = req.body;
        
        if (!process.env.OPENAI_API_KEY || !process.env.PROMPT_OPTIMIZER) {
            return res.status(500).json({ 
                error: 'Missing environment variables. Please check your .env file.',
                details: 'OPENAI_API_KEY and PROMPT_OPTIMIZER are required.'
            });
        }
        
        const response = await regeneratePromptFromFeatures(features);
        res.json({ type: 'regenerated-prompt', text: response });
        
    } catch (error) {
        console.error('Error in /api/regenerate-prompt:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

// API endpoint to query candidate generator
app.post('/api/candidate-generator', async (req, res) => {
    try {
        const { features } = req.body;
        
        if (!process.env.OPENAI_API_KEY || !process.env.CANDIDATE_GENERATOR) {
            return res.status(500).json({ 
                error: 'Missing environment variables. Please check your .env file.',
                details: 'OPENAI_API_KEY and CANDIDATE_GENERATOR are required.'
            });
        }
        
        const response = await queryCandidateGenerator(features);
        res.json({ type: 'candidates', text: response });
        
    } catch (error) {
        console.error('Error in /api/candidate-generator:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

// API endpoint to generate candidates for a term
app.post('/api/generate-candidates', async (req, res) => {
    try {
        const { term } = req.body;
        
        if (!process.env.OPENAI_API_KEY || !process.env.CANDIDATE_GENERATOR) {
            return res.status(500).json({ 
                error: 'Missing environment variables. Please check your .env file.',
                details: 'OPENAI_API_KEY and CANDIDATE_GENERATOR are required.'
            });
        }
        
        const candidates = await generateCandidatesForTerm(term);
        res.json({ type: 'candidates', candidates });
        
    } catch (error) {
        console.error('Error in /api/generate-candidates:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

// API endpoint to send message to general GPT
app.post('/api/general-gpt', async (req, res) => {
    try {
        const { prompt } = req.body;
        
        if (!process.env.OPENAI_API_KEY || !process.env.GENERAL_GPT) {
            return res.status(500).json({ 
                error: 'Missing environment variables. Please check your .env file.',
                details: 'OPENAI_API_KEY and GENERAL_GPT are required.'
            });
        }
        
        const response = await sendToGeneralGPT(prompt);
        res.json({ type: 'general-gpt', text: response });
        
    } catch (error) {
        console.error('Error in /api/general-gpt:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

// API endpoint for prompt optimizer
app.post('/api/prompt-optimizer', async (req, res) => {
    try {
        const { prompt, mode = 'hybrid' } = req.body;
        
        // Print the JSON object to terminal when "Send to Chat" is clicked
        console.log('🚀 === SEND TO CHAT - JSON OBJECT ===');
        console.log(`Mode: ${mode}`);
        try {
            const parsedPrompt = JSON.parse(prompt);
            console.log(JSON.stringify(parsedPrompt, null, 2));
        } catch (parseError) {
            console.log('Raw prompt data:', prompt);
        }
        console.log('=== END OF JSON OBJECT ===');
        
        let response;
        
        if (mode === 'raw') {
            // Mode 1: Raw JSON - just return the JSON string as-is
            console.log('📋 Using RAW JSON mode');
            response = prompt;
        } else if (mode === 'nl') {
            // Mode 2: Natural Language - send to PROMPT_OPTIMIZER_NL
            console.log('📝 Using NATURAL LANGUAGE mode');
            if (!process.env.OPENAI_API_KEY || !process.env.PROMPT_OPTIMIZER_NL) {
                return res.status(500).json({ 
                    error: 'Missing environment variables. Please check your .env file.',
                    details: 'OPENAI_API_KEY and PROMPT_OPTIMIZER_NL are required.'
                });
            }
            response = await sendToPromptOptimizerNL(prompt);
        } else {
            // Mode 3: Hybrid (default) - send with instructions to PROMPT_OPTIMIZER
            console.log('🔀 Using HYBRID mode');
            if (!process.env.OPENAI_API_KEY || !process.env.PROMPT_OPTIMIZER) {
                return res.status(500).json({ 
                    error: 'Missing environment variables. Please check your .env file.',
                    details: 'OPENAI_API_KEY and PROMPT_OPTIMIZER are required.'
                });
            }
            response = await sendToPromptOptimizer(prompt);
        }
        
        res.json({ type: 'optimized-prompt', text: response, mode: mode });
        
    } catch (error) {
        console.error('Error in prompt-optimizer endpoint:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

// API endpoint to clear context
app.post('/api/clear-context', async (req, res) => {
    try {
        // Clear any server-side cache or context
        console.log('🧹 Clearing server context...');
        res.json({ message: 'Context cleared successfully' });
    } catch (error) {
        console.error('Error clearing context:', error);
        res.status(500).json({ error: 'Failed to clear context: ' + error.message });
    }
});

// API endpoint for task identification
app.post('/api/task-identifier', async (req, res) => {
    try {
        const { initial_prompt, main_task, base_classes } = req.body;
        
        if (!initial_prompt && !main_task) {
            return res.status(400).json({ error: 'Missing both initial_prompt and main_task' });
        }
        
        if (!base_classes || !Array.isArray(base_classes)) {
            return res.status(400).json({ error: 'Missing or invalid base_classes array' });
        }
        
        const taskData = {
            initial_prompt: initial_prompt || '',
            main_task: main_task || '',
            base_classes: base_classes
        };
        
        console.log('🔍 Identifying task type for:', taskData);
        
        const taskType = await sendToTaskIdentifier(taskData);
        
        console.log('✅ Task type identified:', taskType);
        
        res.json({ 
            task_type: taskType.trim(),
            success: true 
        });
    } catch (error) {
        console.error('Error in task identification:', error);
        res.status(500).json({ error: 'Failed to identify task type: ' + error.message });
    }
});

// API endpoint to save prompt object as base class
app.post('/api/save-base-class', async (req, res) => {
    try {
        const { promptData, fileName } = req.body;
        
        if (!promptData || !fileName) {
            return res.status(400).json({ error: 'Missing promptData or fileName' });
        }
        
        // Create base classes directory if it doesn't exist
        const baseClassesDir = path.join(__dirname, 'base classes');
        if (!fs.existsSync(baseClassesDir)) {
            fs.mkdirSync(baseClassesDir, { recursive: true });
        }
        
        // Create the base class object (using consistent format)
        const baseClass = {
            mainTask: promptData.mainTask || "",
            requirements: {},
            audience: promptData.audience || ["everyone"]
        };
        
        // Convert requirements to the expected format
        if (promptData.requirements) {
            Object.keys(promptData.requirements).forEach(key => {
                baseClass.requirements[key] = {
                    property_name: key,
                    value: ""
                };
            });
        }
        
        // Save to file
        const filePath = path.join(baseClassesDir, `${fileName}.json`);
        fs.writeFileSync(filePath, JSON.stringify(baseClass, null, 2));
        
        console.log(`💾 Saved base class: ${fileName}.json`);
        res.json({ message: `Base class saved as ${fileName}.json` });
        
    } catch (error) {
        console.error('Error saving base class:', error);
        res.status(500).json({ error: 'Failed to save base class: ' + error.message });
    }
});

// API endpoint to get list of available base classes
app.get('/api/base-classes', async (req, res) => {
    try {
        const baseClassesDir = path.join(__dirname, 'base classes');
        
        if (!fs.existsSync(baseClassesDir)) {
            return res.json({ baseClasses: [] });
        }
        
        const files = fs.readdirSync(baseClassesDir);
        const baseClasses = files
            .filter(file => file.endsWith('.json'))
            .map(file => file.replace('.json', ''));
        
        console.log(`📁 Found ${baseClasses.length} base classes`);
        res.json({ baseClasses });
        
    } catch (error) {
        console.error('Error getting base classes:', error);
        res.status(500).json({ error: 'Failed to get base classes: ' + error.message });
    }
});

// API endpoint to load a specific base class
app.get('/api/base-classes/:fileName', async (req, res) => {
    try {
        const { fileName } = req.params;
        const baseClassesDir = path.join(__dirname, 'base classes');
        const filePath = path.join(baseClassesDir, `${fileName}.json`);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Base class not found' });
        }
        
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const baseClass = JSON.parse(fileContent);
        
        console.log(`📂 Loaded base class: ${fileName}.json`);
        res.json({ baseClass });
        
    } catch (error) {
        console.error('Error loading base class:', error);
        res.status(500).json({ error: 'Failed to load base class: ' + error.message });
    }
});

// Function to query custom GPT
async function queryCustomGPT(prompt) {
    const apiKey = process.env.OPENAI_API_KEY;
    const featureGenerator = process.env.PROPERTY_GENERATOR;

    if (!apiKey || !featureGenerator) {
        return 'Missing API key or Assistant ID';
    }

    const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
    };

    try {
        console.log('📝 Creating thread...');
        const threadData = await simpleFetch('https://api.openai.com/v1/threads', {
            method: 'POST',
            headers,
        });
        const threadId = threadData.id;
        console.log('✅ Thread created:', threadId);

        console.log('📤 Adding message to thread...');
        await simpleFetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ role: 'user', content: prompt })
        });
        console.log('✅ Message added to thread');

        console.log('🤖 Starting assistant run...');
        const runData = await simpleFetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ assistant_id: featureGenerator })
        });
        const runId = runData.id;
        console.log('✅ Run started:', runId);

        // Wait for run completion with simple polling
        console.log('⏳ Waiting for completion...');
        let runStatus = 'in_progress';
        let attempts = 0;
        const maxAttempts = 60;
        
        while (runStatus === 'in_progress' && attempts < maxAttempts) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            
            const runData = await simpleFetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
                method: 'GET',
                headers,
            });
            
            runStatus = runData.status;
            console.log(`⏳ Attempt ${attempts}/${maxAttempts}, status: ${runStatus}`);
            
            if (runStatus === 'completed') {
                console.log('✅ Run completed');
                break;
            } else if (runStatus === 'failed' || runStatus === 'cancelled') {
                throw new Error(`Run ${runStatus}: ${runData.last_error?.message || 'Unknown error'}`);
            }
        }
        
        if (runStatus !== 'completed') {
            throw new Error('Run timeout - exceeded maximum attempts');
        }
        
        // Retrieve messages from the thread
        console.log('📥 Retrieving messages...');
        const messagesData = await simpleFetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
            method: 'GET',
            headers,
        });
        console.log('✅ Messages retrieved');
        
        const messages = messagesData.data;
        const assistantReply = messages.find((msg) => msg.role === 'assistant')?.content?.[0]?.text?.value;

        return assistantReply || 'No response from assistant.';
    } catch (error) {
        console.error('Error in queryCustomGPT:', error);
        return `Error: ${error.message}`;
    }
}

async function regeneratePromptFromFeatures(features) {
    const apiKey = process.env.OPENAI_API_KEY;
    const promptGenerator = process.env.PROMPT_OPTIMIZER;

    if (!apiKey || !promptGenerator) {
        return 'Missing API key or Prompt Generator Assistant ID';
    }

    const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
    };

    try {
        const threadData = await simpleFetch('https://api.openai.com/v1/threads', {
            method: 'POST',
            headers
        });
        const threadId = threadData.id;

        // Handle both array and object formats
        let rankedFeatures;
        if (Array.isArray(features)) {
            // Convert array format to ranked object format
            rankedFeatures = {};
            features.forEach((item, index) => {
                if (item.feature_name && item.value !== undefined) {
                    rankedFeatures[item.feature_name] = {
                        value: item.value,
                        candidates: item.candidates || [],
                        rank: index + 1
                    };
                }
            });
        } else {
            // Handle existing object format
            rankedFeatures = {};
            Object.keys(features).forEach((key, index) => {
                rankedFeatures[key] = {
                    ...features[key],
                    rank: index + 1
                };
            });
        }

        const messageContent = `Generate 5 different optimized prompts using the following JSON features, including possible candidate options. The features are ranked by importance (rank 1 is most important). You may consider the candidates, but only use the "value" field content (with grammatical variations only, no synonyms). Do not use alternatives from "candidates" directly. Prioritize higher-ranked features in the generated prompts.

Please return the response in this exact JSON format:
{
  "prompts": [
    "First optimized prompt here",
    "Second optimized prompt here", 
    "Third optimized prompt here",
    "Fourth optimized prompt here",
    "Fifth optimized prompt here"
  ]
}

Ranked JSON input:
${JSON.stringify(rankedFeatures, null, 2)}`;

        console.log('=== SENDING TO PROMPT_OPTIMIZER ===');
        console.log('Ranked Features JSON:');
        console.log(JSON.stringify(rankedFeatures, null, 2));
        console.log('=== END OF JSON ===');

        await simpleFetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ role: 'user', content: messageContent })
        });

        const runData = await simpleFetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ assistant_id: promptGenerator })
        });
        const runId = runData.id;

        // Wait for run completion with simple polling
        console.log('⏳ Waiting for completion...');
        let runStatus = 'in_progress';
        let attempts = 0;
        const maxAttempts = 60;
        
        while (runStatus === 'in_progress' && attempts < maxAttempts) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            
            const runData = await simpleFetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
                method: 'GET',
                headers,
            });
            
            runStatus = runData.status;
            console.log(`⏳ Attempt ${attempts}/${maxAttempts}, status: ${runStatus}`);
            
            if (runStatus === 'completed') {
                console.log('✅ Run completed');
                break;
            } else if (runStatus === 'failed' || runStatus === 'cancelled') {
                throw new Error(`Run ${runStatus}: ${runData.last_error?.message || 'Unknown error'}`);
            }
        }
        
        if (runStatus !== 'completed') {
            throw new Error('Run timeout - exceeded maximum attempts');
        }
        
        // Retrieve messages from the thread
        console.log('📥 Retrieving messages...');
        const messagesData = await simpleFetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
            method: 'GET',
            headers,
        });
        console.log('✅ Messages retrieved');
        
        const messages = messagesData.data;
        const assistantReply = messages.find((msg) => msg.role === 'assistant')?.content?.[0]?.text?.value;

        console.log('=== RESPONSE FROM PROMPT_OPTIMIZER ===');
        console.log('Assistant Response:');
        console.log(assistantReply);
        console.log('=== END OF RESPONSE ===');
        
        return assistantReply || 'No response from assistant.';
    } catch (error) {
        console.error('Error in regeneratePromptFromFeatures:', error);
        return `Error: ${error.message}`;
    }
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

    try {
        const threadData = await simpleFetch('https://api.openai.com/v1/threads', {
            method: 'POST',
            headers
        });
        const threadId = threadData.id;

        const messageContent = `Given these base features, generate a new set of candidate features:\n${JSON.stringify(features, null, 2)}`;
        await simpleFetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ role: 'user', content: messageContent })
        });

        const runData = await simpleFetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ assistant_id: candidateGenerator })
        });
        const runId = runData.id;

        // Wait for run completion with simple polling
        console.log('⏳ Waiting for completion...');
        let runStatus = 'in_progress';
        let attempts = 0;
        const maxAttempts = 60;
        
        while (runStatus === 'in_progress' && attempts < maxAttempts) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            
            const runData = await simpleFetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
                method: 'GET',
                headers,
            });
            
            runStatus = runData.status;
            console.log(`⏳ Attempt ${attempts}/${maxAttempts}, status: ${runStatus}`);
            
            if (runStatus === 'completed') {
                console.log('✅ Run completed');
                break;
            } else if (runStatus === 'failed' || runStatus === 'cancelled') {
                throw new Error(`Run ${runStatus}: ${runData.last_error?.message || 'Unknown error'}`);
            }
        }
        
        if (runStatus !== 'completed') {
            throw new Error('Run timeout - exceeded maximum attempts');
        }
        
        // Retrieve messages from the thread
        console.log('📥 Retrieving messages...');
        const messagesData = await simpleFetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
            method: 'GET',
            headers,
        });
        console.log('✅ Messages retrieved');
        
        const messages = messagesData.data;
        const assistantReply = messages.find((msg) => msg.role === 'assistant')?.content?.[0]?.text?.value;

        return assistantReply || 'No response from assistant.';
    } catch (error) {
        console.error('Error in queryCandidateGenerator:', error);
        return `Error: ${error.message}`;
    }
}

async function generateCandidatesForTerm(term) {
    const apiKey = process.env.OPENAI_API_KEY;
    const candidateGenerator = process.env.CANDIDATE_GENERATOR;

    if (!apiKey || !candidateGenerator) {
        throw new Error('Missing API key or Candidate Generator Assistant ID');
    }

    const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
    };

    try {
        const threadData = await simpleFetch('https://api.openai.com/v1/threads', {
            method: 'POST',
            headers
        });
        const threadId = threadData.id;

        // Format the term as requested: "term/sentence"
        const formattedTerm = `"${term}"`;
        
        const messageContent = `Generate 5-8 candidate alternatives for this term/sentence: ${formattedTerm}

Please return only a JSON array of strings, like this:
["candidate1", "candidate2", "candidate3", "candidate4", "candidate5"]

The candidates should be:
- Similar in meaning but different in wording
- Grammatically correct
- Suitable for use in prompts
- No more than 3-4 words each`;

        await simpleFetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ role: 'user', content: messageContent })
        });

        const runData = await simpleFetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ assistant_id: candidateGenerator })
        });
        const runId = runData.id;

        // Wait for run completion with simple polling
        console.log('⏳ Waiting for completion...');
        let runStatus = 'in_progress';
        let attempts = 0;
        const maxAttempts = 60;
        
        while (runStatus === 'in_progress' && attempts < maxAttempts) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            
            const runData = await simpleFetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
                method: 'GET',
                headers,
            });
            
            runStatus = runData.status;
            console.log(`⏳ Attempt ${attempts}/${maxAttempts}, status: ${runStatus}`);
            
            if (runStatus === 'completed') {
                console.log('✅ Run completed');
                break;
            } else if (runStatus === 'failed' || runStatus === 'cancelled') {
                throw new Error(`Run ${runStatus}: ${runData.last_error?.message || 'Unknown error'}`);
            }
        }
        
        if (runStatus !== 'completed') {
            throw new Error('Run timeout - exceeded maximum attempts');
        }
        
        // Retrieve messages from the thread
        console.log('📥 Retrieving messages...');
        const messagesData = await simpleFetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
            method: 'GET',
            headers,
        });
        console.log('✅ Messages retrieved');
        
        const messages = messagesData.data;
        const assistantReply = messages.find((msg) => msg.role === 'assistant')?.content?.[0]?.text?.value;

        // Parse the response as JSON array
        try {
            const candidates = JSON.parse(assistantReply);
            if (Array.isArray(candidates)) {
                return candidates;
            }
        } catch (parseError) {
            console.log('Failed to parse candidates as JSON array:', parseError.message);
        }
        
        // Fallback to original term if parsing fails
        return [term];
    } catch (error) {
        console.error('Error in generateCandidatesForTerm:', error);
        throw error;
    }
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

    try {
        const threadData = await simpleFetch('https://api.openai.com/v1/threads', {
            method: 'POST',
            headers
        });
        const threadId = threadData.id;

        await simpleFetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ role: 'user', content: prompt })
        });

        const runData = await simpleFetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ assistant_id: generalGPT })
        });
        const runId = runData.id;

        // Wait for run completion with simple polling
        console.log('⏳ Waiting for completion...');
        let runStatus = 'in_progress';
        let attempts = 0;
        const maxAttempts = 60;
        
        while (runStatus === 'in_progress' && attempts < maxAttempts) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            
            const runData = await simpleFetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
                method: 'GET',
                headers,
            });
            
            runStatus = runData.status;
            console.log(`⏳ Attempt ${attempts}/${maxAttempts}, status: ${runStatus}`);
            
            if (runStatus === 'completed') {
                console.log('✅ Run completed');
                break;
            } else if (runStatus === 'failed' || runStatus === 'cancelled') {
                throw new Error(`Run ${runStatus}: ${runData.last_error?.message || 'Unknown error'}`);
            }
        }
        
        if (runStatus !== 'completed') {
            throw new Error('Run timeout - exceeded maximum attempts');
        }
        
        // Retrieve messages from the thread
        console.log('📥 Retrieving messages...');
        const messagesData = await simpleFetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
            method: 'GET',
            headers,
        });
        console.log('✅ Messages retrieved');
        
        const messages = messagesData.data;
        const assistantReply = messages.find((msg) => msg.role === 'assistant')?.content?.[0]?.text?.value;

        return assistantReply || 'No response from assistant.';
    } catch (error) {
        console.error('Error in sendToGeneralGPT:', error);
        return `Error: ${error.message}`;
    }
}

async function sendToPromptOptimizer(prompt) {
    const apiKey = process.env.OPENAI_API_KEY;
    const promptOptimizer = process.env.PROMPT_OPTIMIZER;

    if (!apiKey || !promptOptimizer) {
        return 'Missing API key or Prompt Optimizer Assistant ID';
    }

    const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
    };

    try {
        const threadData = await simpleFetch('https://api.openai.com/v1/threads', {
            method: 'POST',
            headers
        });
        const threadId = threadData.id;

        await simpleFetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ role: 'user', content: prompt })
        });

        const runData = await simpleFetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ assistant_id: promptOptimizer })
        });
        const runId = runData.id;

        // Wait for run completion with simple polling
        console.log('⏳ Waiting for completion...');
        let runStatus = 'in_progress';
        let attempts = 0;
        const maxAttempts = 60;
        
        while (runStatus === 'in_progress' && attempts < maxAttempts) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            
            const runData = await simpleFetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
                method: 'GET',
                headers,
            });
            
            runStatus = runData.status;
            console.log(`⏳ Attempt ${attempts}/${maxAttempts}, status: ${runStatus}`);
            
            if (runStatus === 'completed') {
                console.log('✅ Run completed');
                break;
            } else if (runStatus === 'failed' || runStatus === 'cancelled') {
                throw new Error(`Run ${runStatus}: ${runData.last_error?.message || 'Unknown error'}`);
            }
        }
        
        if (runStatus !== 'completed') {
            throw new Error('Run timeout - exceeded maximum attempts');
        }
        
        // Retrieve messages from the thread
        console.log('📥 Retrieving messages...');
        const messagesData = await simpleFetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
            method: 'GET',
            headers,
        });
        console.log('✅ Messages retrieved');
        
        const messages = messagesData.data;
        const assistantReply = messages.find((msg) => msg.role === 'assistant')?.content?.[0]?.text?.value;

        return assistantReply || 'No response from assistant.';
    } catch (error) {
        console.error('Error in sendToPromptOptimizer:', error);
        return `Error: ${error.message}`;
    }
}

async function sendToPromptOptimizerNL(prompt) {
    const apiKey = process.env.OPENAI_API_KEY;
    const promptOptimizerNL = process.env.PROMPT_OPTIMIZER_NL;

    if (!apiKey || !promptOptimizerNL) {
        return 'Missing API key or Prompt Optimizer NL Assistant ID';
    }

    const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
    };

    try {
        const threadData = await simpleFetch('https://api.openai.com/v1/threads', {
            method: 'POST',
            headers
        });
        const threadId = threadData.id;

        // Create a message asking the assistant to convert JSON to natural language prompt
        const messageContent = `Convert the following JSON prompt structure into a natural language prompt. Generate a complete, well-structured prompt in natural language format:

${prompt}`;

        console.log('=== SENDING TO PROMPT_OPTIMIZER_NL ===');
        console.log('JSON Input:', prompt);
        console.log('=== END OF INPUT ===');

        await simpleFetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ role: 'user', content: messageContent })
        });

        const runData = await simpleFetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ assistant_id: promptOptimizerNL })
        });
        const runId = runData.id;

        // Wait for run completion with simple polling
        console.log('⏳ Waiting for NL generation completion...');
        let runStatus = 'in_progress';
        let attempts = 0;
        const maxAttempts = 60;
        
        while (runStatus === 'in_progress' && attempts < maxAttempts) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            
            const runData = await simpleFetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
                method: 'GET',
                headers,
            });
            
            runStatus = runData.status;
            console.log(`⏳ Attempt ${attempts}/${maxAttempts}, status: ${runStatus}`);
            
            if (runStatus === 'completed') {
                console.log('✅ NL generation completed');
                break;
            } else if (runStatus === 'failed' || runStatus === 'cancelled') {
                throw new Error(`Run ${runStatus}: ${runData.last_error?.message || 'Unknown error'}`);
            }
        }
        
        if (runStatus !== 'completed') {
            throw new Error('Run timeout - exceeded maximum attempts');
        }
        
        // Retrieve messages from the thread
        console.log('📥 Retrieving NL messages...');
        const messagesData = await simpleFetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
            method: 'GET',
            headers,
        });
        console.log('✅ NL messages retrieved');
        
        const messages = messagesData.data;
        const assistantReply = messages.find((msg) => msg.role === 'assistant')?.content?.[0]?.text?.value;

        console.log('=== RESPONSE FROM PROMPT_OPTIMIZER_NL ===');
        console.log('Natural Language Prompt:');
        console.log(assistantReply);
        console.log('=== END OF RESPONSE ===');

        return assistantReply || 'No response from assistant.';
    } catch (error) {
        console.error('Error in sendToPromptOptimizerNL:', error);
        return `Error: ${error.message}`;
    }
}

async function sendToTaskIdentifier(taskData) {
    const apiKey = process.env.OPENAI_API_KEY;
    const taskIdentifier = process.env.TASK_IDENTIFIER;

    if (!apiKey || !taskIdentifier) {
        return 'Missing API key or Task Identifier Assistant ID';
    }

    const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
    };

    try {
        // Convert taskData object to JSON string for sending to the assistant
        const prompt = JSON.stringify(taskData);
        
        const threadData = await simpleFetch('https://api.openai.com/v1/threads', {
            method: 'POST',
            headers
        });
        const threadId = threadData.id;

        await simpleFetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ role: 'user', content: prompt })
        });

        const runData = await simpleFetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ assistant_id: taskIdentifier })
        });
        const runId = runData.id;

        // Wait for run completion with simple polling
        console.log('⏳ Waiting for task identification completion...');
        let runStatus = 'in_progress';
        let attempts = 0;
        const maxAttempts = 60;
        
        while (runStatus === 'in_progress' && attempts < maxAttempts) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            
            const runData = await simpleFetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
                method: 'GET',
                headers,
            });
            
            runStatus = runData.status;
            console.log(`⏳ Task identification attempt ${attempts}/${maxAttempts}, status: ${runStatus}`);
            
            if (runStatus === 'completed') {
                console.log('✅ Task identification completed');
                break;
            } else if (runStatus === 'failed' || runStatus === 'cancelled') {
                throw new Error(`Task identification ${runStatus}: ${runData.last_error?.message || 'Unknown error'}`);
            }
        }
        
        if (runStatus !== 'completed') {
            throw new Error('Task identification timeout - exceeded maximum attempts');
        }
        
        // Retrieve messages from the thread
        console.log('📥 Retrieving task identification results...');
        const messagesData = await simpleFetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
            method: 'GET',
            headers,
        });
        console.log('✅ Task identification results retrieved');
        
        const messages = messagesData.data;
        const assistantReply = messages.find((msg) => msg.role === 'assistant')?.content?.[0]?.text?.value;

        return assistantReply || 'base';
    } catch (error) {
        console.error('Error in sendToTaskIdentifier:', error);
        return 'base'; // Default fallback
    }
}

// Start the server
app.listen(PORT, () => {
    console.log('🚀 Simple server is running on http://localhost:3000');
}); 