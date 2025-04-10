/**
 * Test script to check MongoDB connection and conversation saving
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Conversation from './models/conversation.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!mongoUri) {
  console.error('MongoDB URI not provided');
  process.exit(1);
}

async function testMongoDB() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Create a test conversation
    const testSessionId = 'test-session-' + Date.now();
    console.log(`Creating test conversation with session ID: ${testSessionId}`);

    const result = await Conversation.findOneAndUpdate(
      { sessionId: testSessionId },
      {
        messages: [
          {
            role: 'user',
            text: 'Hello, this is a test message',
            timestamp: new Date()
          },
          {
            role: 'assistant',
            text: 'Hello! This is a test response.',
            timestamp: new Date()
          }
        ],
        lastUpdated: new Date()
      },
      { upsert: true, new: true }
    );

    console.log('Test conversation created:');
    console.log(`- ID: ${result._id}`);
    console.log(`- Session ID: ${result.sessionId}`);
    console.log(`- Messages: ${result.messages.length}`);

    // Retrieve the conversation
    console.log('\nRetrieving test conversation...');
    const retrievedConversation = await Conversation.findOne({ sessionId: testSessionId });
    
    if (retrievedConversation) {
      console.log('Retrieved conversation:');
      console.log(`- ID: ${retrievedConversation._id}`);
      console.log(`- Session ID: ${retrievedConversation.sessionId}`);
      console.log(`- Messages: ${retrievedConversation.messages.length}`);
      
      // Print messages
      console.log('\nMessages:');
      retrievedConversation.messages.forEach((msg, index) => {
        console.log(`[${index + 1}] ${msg.role}: ${msg.text}`);
      });
    } else {
      console.error('Failed to retrieve conversation');
    }

    // List all conversations
    console.log('\nListing all conversations:');
    const allConversations = await Conversation.find({});
    console.log(`Found ${allConversations.length} conversations:`);
    
    allConversations.forEach((conv, index) => {
      console.log(`[${index + 1}] Session ID: ${conv.sessionId}, Messages: ${conv.messages.length}`);
    });

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testMongoDB();
