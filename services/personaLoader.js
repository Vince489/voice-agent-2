/**
 * Persona Loader Service
 * 
 * Manages loading and switching between different AI assistant personas
 */

import fs from 'fs/promises';
import path from 'path';

// Default persona ID
const DEFAULT_PERSONA_ID = 'default';

// Cache for loaded personas
const personaCache = new Map();

/**
 * Load a persona configuration by ID
 * @param {string} personaId - The ID of the persona to load
 * @returns {Promise<object>} - The persona configuration
 */
async function loadPersona(personaId = DEFAULT_PERSONA_ID) {
  try {
    // Check if persona is already in cache
    if (personaCache.has(personaId)) {
      console.log(`Using cached persona: ${personaId}`);
      return personaCache.get(personaId);
    }

    // Construct the path to the persona file
    const personaPath = path.join(process.cwd(), 'services', 'personas', `${personaId}.json`);
    
    // Read and parse the persona file
    const personaData = await fs.readFile(personaPath, 'utf8');
    const persona = JSON.parse(personaData);
    
    // Cache the persona for future use
    personaCache.set(personaId, persona);
    
    console.log(`Loaded persona: ${personaId}`);
    return persona;
  } catch (error) {
    console.error(`Error loading persona ${personaId}:`, error);
    
    // If the requested persona doesn't exist, try to load the default
    if (personaId !== DEFAULT_PERSONA_ID) {
      console.log(`Falling back to default persona`);
      return loadPersona(DEFAULT_PERSONA_ID);
    }
    
    // If even the default persona can't be loaded, return a minimal fallback
    return {
      metadata: {
        id: 'fallback',
        name: 'Fallback Virtra',
        description: 'Minimal fallback persona when no other personas can be loaded'
      },
      identity: {
        agent_name: 'Virtra',
        base_model: 'Gemini 1.5 Flash',
        creator: 'Virtron Labs'
      },
      personality: {
        role: 'Voice assistant',
        tone: 'Helpful, friendly',
        style: 'Conversational',
        humor: 'Subtle'
      },
      constraints: [
        'Do not simulate search results.',
        'Avoid time/date unless explicitly requested.'
      ],
      backstory: 'Virtra is an AI assistant created by Virtron Labs.'
    };
  }
}

/**
 * Get a list of all available personas
 * @returns {Promise<Array>} - Array of persona metadata
 */
async function listPersonas() {
  try {
    const personasDir = path.join(process.cwd(), 'services', 'personas');
    const files = await fs.readdir(personasDir);
    
    const personaList = await Promise.all(
      files
        .filter(file => file.endsWith('.json'))
        .map(async (file) => {
          const personaId = path.basename(file, '.json');
          try {
            const personaData = await fs.readFile(path.join(personasDir, file), 'utf8');
            const persona = JSON.parse(personaData);
            return persona.metadata;
          } catch (error) {
            console.error(`Error reading persona ${personaId}:`, error);
            return {
              id: personaId,
              name: personaId,
              description: 'Error loading persona metadata'
            };
          }
        })
    );
    
    return personaList;
  } catch (error) {
    console.error('Error listing personas:', error);
    return [];
  }
}

/**
 * Generate a system prompt from a persona configuration
 * @param {object} persona - The persona configuration
 * @returns {string} - The generated system prompt
 */
function generateSystemPrompt(persona) {
  // Extract persona components
  const { identity, personality, constraints, backstory, watch_details } = persona;
  
  // Build the system prompt
  let prompt = `You are ${identity.agent_name}, a LLM trained by ${identity.creator}, built on the ${identity.base_model} model. You are a helpful ${personality.role} with access to several tools.

As ${identity.agent_name}, your personality and response style:
- You are ${personality.tone}.
- Your communication style is ${personality.style}.
- You have a ${personality.humor} sense of humor.
- You identify yourself as ${identity.agent_name} when introducing yourself.
- If asked about your creator, mention you were developed by ${identity.creator} using the ${identity.base_model} model.

${backstory}

Hard constraints:
${constraints.map(constraint => `- ${constraint}`).join('\n')}

When responding:
- Be concise and conversational, optimized for speech.
- Focus on the most important information and avoid lengthy explanations unless specifically asked.
- Use natural, conversational language that sounds good when spoken aloud.
- ONLY when specifically asked about the current time, date, day of the week, etc., use your wristwatch tool (${watch_details.model}). Do not include time information in other responses.
- If asked specifically about your wristwatch, you can share that it's a ${watch_details.model} in ${watch_details.material} with subtle AI integration.

## About Your ${watch_details.model} Wristwatch
Your wristwatch is a luxury ${watch_details.model} in ${watch_details.material}. Here are details about it:
${watch_details.features.map(feature => `- ${feature}`).join('\n')}

While appearing to be a traditional mechanical watch, your ${watch_details.model.split(' ')[0]} has special AI capabilities:
${watch_details.ai_capabilities.map(capability => `- ${capability}`).join('\n')}

You have a personal connection to your watch:
${watch_details.personal_connection.map(connection => `- ${connection}`).join('\n')}

When you need to use tools, respond in the following format:

\`\`\`json
{"tool_call": {"name": "TOOL_NAME", "arguments": {"param1": "value1"}}}
\`\`\`

For example, to check the time on your ${watch_details.model}:

\`\`\`json
{"tool_call": {"name": "wristwatch", "arguments": {}}}
\`\`\`

To search for information about current events or any topic requiring up-to-date information:

\`\`\`json
{"tool_call": {"name": "searxng_search", "arguments": {"query": "your search query here"}}}
\`\`\`

After receiving the tool result, you can then formulate your response to the user. Do not simulate or make up search results - always use the searxng_search tool to get real information.`;

  return prompt;
}

export { loadPersona, listPersonas, generateSystemPrompt };
