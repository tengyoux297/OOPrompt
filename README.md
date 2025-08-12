# OOPrompt Web - Prompt Optimization Tool

A web-based prompt optimization tool that helps you generate, edit, and optimize prompts using AI assistants.

## Features

- **Feature Generation**: Convert your initial prompt into structured features
- **Feature Editing**: Edit feature names, values, and fixed states
- **Feature Ranking**: Drag and drop features to reorder by importance

- **Prompt Regeneration**: Create optimized prompts from features (prioritizing ranked features)
- **Copy to Clipboard**: Easily copy the final optimized prompt
- **Chat Integration**: Insert optimized prompts into a ChatGPT-like interface

## Setup

### Prerequisites

- Node.js (version 16 or higher)
- OpenAI API key
- OpenAI Assistant IDs for:
  - Feature Generator
  - Prompt Generator  

  - General GPT (for chat interface)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ooprompt
```

2. Install dependencies:
```bash
npm install
```

3. **Set up environment variables**:
   
   **Option 1: Copy the example file**
   ```bash
   cp env.example .env
   ```
   
   **Option 2: Create manually**
   Create a `.env` file in the root directory with your API keys:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   FEATURE_GENERATOR=your_feature_generator_assistant_id
   PROMPT_GENERATOR=your_prompt_generator_assistant_id
   
   GENERAL_GPT=your_general_gpt_assistant_id
   PORT=3000
   ```

### Running the Application

1. Start the development server:
```bash
npm run dev
```

2. Open your browser and navigate to `http://localhost:3000`

3. **If you see environment variable errors**, make sure your `.env` file is properly configured with your actual API keys and Assistant IDs.

## Usage

1. **Enter Initial Prompt**: Type your initial prompt in the text area on the right
2. **Generate Features**: Click "Generate Features" to convert your prompt into structured features
3. **Rank Features**: Drag and drop features to reorder them by importance (rank 1 is most important)
4. **Edit Features**: Modify feature names, values, and fixed states as needed

6. **Regenerate Prompt**: Click "Regenerate Prompt" to create optimized prompts from the features (higher-ranked features will be prioritized)
7. **Insert to Chat**: Click "Insert to Chat" to add the optimized prompt to the left chat interface
8. **Send to AI**: Use the chat interface to send the prompt to your General GPT assistant

## Base Classes

The application includes several pre-defined base classes for different types of prompts, each following the new hierarchical structure:

- **base.json**: Generic template for any prompt type
- **text_generator.json**: Template for text generation tasks (writing, stories, articles)
- **image_generator.json**: Template for image generation tasks
- **trip_planner.json**: Template for trip planning tasks
- **summarizer.json**: Template for summarization tasks
- **translator.json**: Template for translation tasks
- **code_generator.json**: Template for code generation tasks
- **classifier.json**: Template for classification tasks
- **explainer.json**: Template for explanation tasks
- **copywriter.json**: Template for copywriting and marketing tasks

Each base class follows the structure:
```json
{
  "Main Task": "task-type",
  "Requirements": [
    {
      "property_name": "property_name",
      "value": "default_value"
    }
  ],
  "Audience": ["target_audience"]
}
```

## Feature Ranking

The application includes a drag-and-drop ranking system for features:

- **Visual Ranking**: Each feature displays a rank badge (1, 2, 3, etc.)
- **Drag to Reorder**: Click and drag features to change their order
- **Importance Priority**: Higher-ranked features (rank 1, 2, 3) are prioritized in prompt generation
- **Real-time Updates**: The feature order is automatically saved and used in prompt regeneration

## Environment Variables

| Variable                | Description                           | Required |
| ----------------------- | ------------------------------------- | -------- |
| `OPENAI_API_KEY`      | Your OpenAI API key                   | ✅       |
| `FEATURE_GENERATOR`   | Assistant ID for feature generation   | ✅       |
| `PROMPT_GENERATOR`    | Assistant ID for prompt regeneration  | ✅       |

| `GENERAL_GPT`         | Assistant ID for chat interface       | ✅       |
| `PORT`                | Server port (default: 3000)           | ❌       |

## API Endpoints

- `POST /api/query` - Generate features from a prompt

- `POST /api/regenerate` - Regenerate optimized prompts
- `POST /api/send-to-gpt` - Send prompt to General GPT assistant

## Development

- `npm start` - Start the production server
- `npm run dev` - Start the development server with auto-reload

## Architecture

- **Frontend**: HTML, CSS, JavaScript (vanilla)
- **Backend**: Node.js with Express
- **AI Integration**: OpenAI Assistants API
- **Styling**: Modern CSS with responsive design

## Troubleshooting

### Environment Variables Not Set

If you see errors about missing environment variables:

1. Make sure you have a `.env` file in the root directory
2. Copy from `env.example` and replace placeholder values with your actual API keys
3. Restart the server after making changes

### API Errors

- Verify your OpenAI API key is valid
- Check that your Assistant IDs are correct
- Ensure you have sufficient API credits

## License

MIT
