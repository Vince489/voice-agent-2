# Voice Agent

A voice-enabled AI agent with speech-to-text and text-to-speech capabilities.

## Features

- Speech-to-text conversion using Google Cloud Speech-to-Text
- Text-to-speech conversion using Google Cloud Text-to-Speech
- AI-powered conversational agent using Google's Gemini API
- MongoDB integration for storing transcripts and TTS logs
- Cloudinary integration for storing audio files
- Simple web interface for interacting with the agent

## Project Structure

```
/voice-agent/
├── /node_modules/
├── /routes/
│   ├── transcribe.js    // Routes for speech-to-text functionality
│   ├── speak.js         // Routes for text-to-speech functionality
│   └── agent.js         // Routes for agent functionality
├── /services/
│   ├── speechToText.js  // Service for speech-to-text conversion
│   ├── textToSpeech.js  // Service for text-to-speech conversion
│   └── agentLogic.js    // Service for agent logic
├── /models/
│   └── transcript.js    // MongoDB schema for storing transcripts and TTS logs
├── /config/
│   └── cloudinary.js    // Cloudinary configuration
├── /public/
│   └── index.html       // Web interface
├── app.js               // Main Express app setup
├── .env                 // Environment variables
└── package.json         // Project dependencies
```

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (optional, for storing transcripts and TTS logs)
- Google Cloud account with Speech-to-Text and Text-to-Speech APIs enabled
- Google API key for Gemini API
- Cloudinary account (optional, for storing audio files)

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   cd voice-agent
   npm install
   ```
3. Create a `.env` file based on `.env.example` and fill in your credentials
4. Start the server:
   ```
   npm start
   ```
5. Open your browser and navigate to `http://localhost:3000`

## API Endpoints

### Speech-to-Text

- `POST /api/transcribe`: Transcribe an audio file to text
  - Request: Form data with an audio file
  - Response: JSON with transcription result

### Text-to-Speech

- `POST /api/speak`: Convert text to speech
  - Request: JSON with text and optional voice settings
  - Response: Audio file or URL to audio file

### Agent

- `POST /api/agent/chat`: Process a text message with the agent
  - Request: JSON with message and optional context
  - Response: JSON with agent response

- `POST /api/agent/voice`: Process a voice message with the agent
  - Request: JSON with transcription and optional context
  - Response: JSON with agent response and optional audio URL

## License

MIT
