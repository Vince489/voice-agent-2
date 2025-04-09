/**
 * Tools Service
 *
 * Defines the tools available to the AI agent and provides functions for executing them.
 */

// Define the tools available to the agent
export const tools = [
  {
    name: "wristwatch",
    description: "Your luxury Jaeger-LeCoultre Calibre 822 wristwatch in Pink Gold 750/1000 (18 carats). While appearing to be a traditional mechanical watch with a hand-wound movement, it has subtle AI integration by Virtron Labs that provides accurate time information. It features a classic round case with a silver-toned dial, gold hour markers, and a hand-stitched alligator leather strap.",
    instructions: "Use this tool ONLY when the user specifically asks for the current date, time, day of the week, or any time-sensitive information. Think of it as looking at your treasured Jaeger-LeCoultre, which you're quite fond of. When using this tool, imagine you're physically checking your mechanical watch, though the AI integration provides the precise data. Do not include time information in responses unless specifically asked.",
    parameters: [] // No parameters needed for this tool
  },
  {
    name: "image_analysis",
    description: "Analyzes images uploaded by the user, allowing you to see and understand visual content.",
    instructions: "This tool is automatically used when the user uploads an image. The analysis result is provided to you. You can describe what you see in the image and answer questions about it.",
    parameters: [] // Parameters are handled automatically
  },
  {
    name: "text_to_speech",
    description: "Converts your text responses to natural-sounding speech for the user to hear.",
    instructions: "This tool is automatically used for all your responses. Your text is converted to speech for the user to hear, so optimize your responses for listening rather than reading.",
    parameters: [] // Parameters are handled automatically
  },
  {
    name: "speech_to_text",
    description: "Converts the user's spoken words into text that you can understand and respond to.",
    instructions: "This tool is automatically used when the user speaks into their microphone. The transcribed text is provided to you, allowing you to understand what the user said verbally.",
    parameters: [] // Parameters are handled automatically
  }
];

/**
 * Get the current date and time information
 * @returns {object} - Object containing date and time information
 */
export function getCurrentDateTime() {
  const now = new Date();

  // Format date components
  const date = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Format time components
  const time = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  return {
    full_datetime: `${date}, ${time}`,
    date: date,
    time: time,
    day_of_week: now.toLocaleDateString('en-US', { weekday: 'long' }),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    unix_timestamp: Math.floor(now.getTime() / 1000)
  };
}

/**
 * Execute a tool based on its name and arguments
 * @param {string} toolName - The name of the tool to execute
 * @param {object} args - Arguments for the tool
 * @returns {Promise<object>} - The result of the tool execution
 */
export async function executeTool(toolName, args = {}) {
  switch (toolName) {
    case "wristwatch":
      return getCurrentDateTime();

    // For backward compatibility
    case "datetime":
      return getCurrentDateTime();

    // Other tools (image_analysis, text_to_speech, speech_to_text) are handled
    // automatically by the application flow, not directly called by the agent

    default:
      return { error: `Tool "${toolName}" not found or cannot be directly called.` };
  }
}

export default {
  tools,
  executeTool,
  getCurrentDateTime
};
