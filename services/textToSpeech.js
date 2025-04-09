/**
 * Text-to-Speech Service
 *
 * Provides functionality for converting text to speech using Google Cloud Text-to-Speech.
 */

import textToSpeech from '@google-cloud/text-to-speech';

// Create a client
let client;
try {
  // Create the client using GOOGLE_APPLICATION_CREDENTIALS
  client = new textToSpeech.TextToSpeechClient();
  console.log('Google Cloud Text-to-Speech client initialized successfully');
} catch (error) {
  console.error('Failed to initialize Google Cloud Text-to-Speech client:', error);
  console.error('Error details:', error.message);
}

// Default voice settings
export const DEFAULT_VOICE_SETTINGS = {
  languageCode: 'en-US',
  voiceName: 'en-US-Chirp3-HD-Zephyr',
  ssmlGender: 'NEUTRAL',
  audioEncoding: 'MP3',
  speakingRate: 0.90,
  pitch: 0.0,
  effectsProfileId: ['small-bluetooth-speaker-class-device'] // Optimize for faster processing
};

/**
 * Synthesize speech from text
 * @param {string} text - The text to convert to speech
 * @param {object} voiceSettings - Optional voice settings to override defaults
 * @returns {Promise<Buffer>} - The audio buffer
 */
export async function synthesizeSpeech(text, voiceSettings = {}) {
  try {
    // Merge default settings with provided settings
    const settings = { ...DEFAULT_VOICE_SETTINGS, ...voiceSettings };

    // Configure the request
    const request = {
      input: { text },
      voice: {
        languageCode: settings.languageCode,
        name: settings.voiceName,
        ssmlGender: settings.ssmlGender
      },
      audioConfig: {
        audioEncoding: settings.audioEncoding,
        speakingRate: settings.speakingRate,
        pitch: settings.pitch,
        effectsProfileId: settings.effectsProfileId
      }
    };

    // Perform the text-to-speech request
    const [response] = await client.synthesizeSpeech(request);

    // Return the audio content as a buffer
    return Buffer.from(response.audioContent);
  } catch (error) {
    console.error('Error in synthesizeSpeech:', error);
    throw error;
  }
}

export default {
  synthesizeSpeech,
  DEFAULT_VOICE_SETTINGS
};
