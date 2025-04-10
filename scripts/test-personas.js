/**
 * Test script for the persona switching functionality
 * 
 * Run with: node scripts/test-personas.js
 */

import { loadPersona, listPersonas, generateSystemPrompt } from '../services/personaLoader.js';

async function testPersonas() {
  try {
    console.log('=== Testing Persona Switching System ===\n');
    
    // List all available personas
    console.log('Available personas:');
    const personas = await listPersonas();
    personas.forEach(persona => {
      console.log(`- ${persona.id}: ${persona.name} - ${persona.description}`);
    });
    console.log();
    
    // Test loading each persona
    for (const persona of personas) {
      console.log(`=== Testing Persona: ${persona.name} ===`);
      
      // Load the persona
      const personaData = await loadPersona(persona.id);
      console.log('Persona data loaded successfully.');
      
      // Generate a system prompt from the persona
      const systemPrompt = generateSystemPrompt(personaData);
      
      // Print a preview of the system prompt
      console.log('\nSystem prompt preview (first 200 characters):');
      console.log(systemPrompt.substring(0, 200) + '...');
      
      // Print personality traits
      console.log('\nPersonality traits:');
      console.log(`- Role: ${personaData.personality.role}`);
      console.log(`- Tone: ${personaData.personality.tone}`);
      console.log(`- Style: ${personaData.personality.style}`);
      console.log(`- Humor: ${personaData.personality.humor}`);
      
      console.log('\n');
    }
    
    console.log('All personas tested successfully!');
  } catch (error) {
    console.error('Error testing personas:', error);
  }
}

testPersonas();
