/**
 * Memory Service
 *
 * Provides a hybrid conversation memory system that combines:
 * - In-memory storage for recent messages
 * - MongoDB persistence for long-term storage
 * - Relevance-based pruning to maintain context
 * - Optional embedding-based similarity for better context retrieval
 */

import mongoose from 'mongoose';
import Conversation from '../models/conversation.js';

/**
 * HybridConversationMemory class for managing conversation history
 * with intelligent pruning and context retrieval
 * and MongoDB persistence
 */
export class HybridConversationMemory {
    /**
     * Create a new HybridConversationMemory instance
     * @param {Object} options - Configuration options
     * @param {number} options.maxSizeBytes - Maximum memory size in bytes (default: 5MB)
     * @param {number} options.maxMessageCount - Maximum number of messages to store (default: 20)
     * @param {Object} options.embeddingModel - Optional embedding model for semantic similarity
     * @param {string} options.sessionId - Session ID for MongoDB persistence (default: 'default-session')
     */
    constructor(options = {}) {
        this.maxSizeBytes = options.maxSizeBytes || 5 * 1024 * 1024; // 5MB default
        this.maxMessageCount = options.maxMessageCount || 20; // Limit total messages
        this.messages = [];
        this.embeddingModel = options.embeddingModel;
        this.sessionId = options.sessionId || 'default-session';

        // Check MongoDB connection status
        this.isMongoConnected = mongoose.connection.readyState === 1;
        console.log(`Memory constructor - MongoDB connection status: ${this.isMongoConnected ? 'Connected' : 'Not connected'}`);
        console.log(`MongoDB readyState: ${mongoose.connection.readyState}`);

        // Load conversation history from MongoDB if connected
        if (this.isMongoConnected) {
            this._loadFromMongoDB();
        }
    }

    /**
     * Load conversation history from MongoDB
     * @private
     */
    async _loadFromMongoDB() {
        try {
            const conversation = await Conversation.findOne({ sessionId: this.sessionId });
            if (conversation && conversation.messages) {
                // Convert MongoDB documents to plain objects and update timestamps
                this.messages = conversation.messages.map(msg => ({
                    role: msg.role,
                    text: msg.text,
                    timestamp: msg.timestamp.getTime()
                }));
                console.log(`Loaded ${this.messages.length} messages from MongoDB for session ${this.sessionId}`);
            }
        } catch (error) {
            console.error('Error loading conversation from MongoDB:', error);
            // Continue with empty messages array if there's an error
        }
    }

    /**
     * Save conversation to MongoDB
     * @private
     */
    async _saveToMongoDB() {
        if (!this.isMongoConnected) {
            console.log('MongoDB not connected, skipping save');
            return;
        }

        try {
            console.log(`Attempting to save ${this.messages.length} messages to MongoDB for session ${this.sessionId}`);

            // Find or create conversation document
            const result = await Conversation.findOneAndUpdate(
                { sessionId: this.sessionId },
                {
                    messages: this.messages,
                    lastUpdated: new Date()
                },
                { upsert: true, new: true }
            );

            console.log(`Successfully saved ${this.messages.length} messages to MongoDB for session ${this.sessionId}`);
            console.log(`MongoDB document ID: ${result._id}`);
        } catch (error) {
            console.error('Error saving conversation to MongoDB:', error);
            // Continue even if saving fails
        }
    }

    /**
     * Estimate the size of a message in bytes
     * @param {Object} message - The message to estimate
     * @returns {number} - Estimated size in bytes
     * @private
     */
    _estimateMessageSize(message) {
        return JSON.stringify(message).length;
    }

    /**
     * Calculate relevance score between a message and current context
     * @param {Object} message - The message to evaluate
     * @param {string} currentContext - The current context to compare against
     * @returns {Promise<number>} - Relevance score (0-1)
     * @private
     */
    async _calculateRelevanceScore(message, currentContext) {
        try {
            if (!this.embeddingModel) {
                const textScore = this._basicTextSimilarity(message.text, currentContext);
                return textScore;
            }

            // If embedding model is available, use it for better similarity
            const messageEmbedding = await this.embeddingModel.embedContent(message.text);
            const contextEmbedding = await this.embeddingModel.embedContent(currentContext);

            return this._cosineSimilarity(
                messageEmbedding.embedding.values,
                contextEmbedding.embedding.values
            );
        } catch (error) {
            console.warn('Relevance calculation error:', error);
            return 0;
        }
    }

    /**
     * Calculate basic text similarity using word overlap
     * @param {string} text1 - First text
     * @param {string} text2 - Second text
     * @returns {number} - Similarity score (0-1)
     * @private
     */
    _basicTextSimilarity(text1, text2) {
        const words1 = new Set(text1.toLowerCase().split(/\W+/));
        const words2 = new Set(text2.toLowerCase().split(/\W+/));

        const intersection = [...words1].filter(word => words2.has(word));
        return intersection.length / Math.sqrt(words1.size * words2.size);
    }

    /**
     * Calculate cosine similarity between two vectors
     * @param {Array<number>} vec1 - First vector
     * @param {Array<number>} vec2 - Second vector
     * @returns {number} - Similarity score (0-1)
     * @private
     */
    _cosineSimilarity(vec1, vec2) {
        if (vec1.length !== vec2.length) return 0;

        let dotProduct = 0;
        let mag1 = 0;
        let mag2 = 0;

        for (let i = 0; i < vec1.length; i++) {
            dotProduct += vec1[i] * vec2[i];
            mag1 += vec1[i] * vec1[i];
            mag2 += vec2[i] * vec2[i];
        }

        return dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
    }

    /**
     * Prune the conversation history based on relevance to current context
     * @param {string} currentContext - The current context
     * @returns {Promise<void>}
     */
    async prune(currentContext) {
        if (this.messages.length <= this.maxMessageCount) return;

        const scoredMessages = await Promise.all(
            this.messages.map(async (message, index) => ({
                index,
                message,
                score: await this._calculateRelevanceScore(message, currentContext)
            }))
        );

        const sortedByLeastRelevant = scoredMessages
            .sort((a, b) => a.score - b.score);

        const messagesToRemove = sortedByLeastRelevant
            .slice(0, this.messages.length - this.maxMessageCount)
            .map(item => item.index);

        messagesToRemove
            .sort((a, b) => b - a)
            .forEach(index => this.messages.splice(index, 1));

        // Save updated messages to MongoDB after pruning
        if (this.isMongoConnected) {
            await this._saveToMongoDB();
        }
    }

    /**
     * Check if MongoDB is connected and update the connection status
     * This should be called before any operation that requires MongoDB
     * @returns {Promise<boolean>} - Whether MongoDB is connected
     */
    async checkMongoConnection() {
        // Wait for MongoDB connection to be established
        if (mongoose.connection.readyState === 0) {
            console.log('MongoDB connection not yet established, waiting...');
            // Wait for up to 5 seconds for the connection to be established
            for (let i = 0; i < 10; i++) {
                if (mongoose.connection.readyState === 1) {
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        // Update the connection status
        this._updateMongoConnectionStatus();
        console.log(`MongoDB connection check: ${this.isMongoConnected ? 'Connected' : 'Not connected'}`);
        return Promise.resolve(this.isMongoConnected);
    }

    /**
     * Add a message to the conversation history
     * @param {Object} message - The message to add
     * @param {string} currentContext - The current context
     * @returns {Promise<void>}
     */
    async addMessage(message, currentContext) {
        console.log(`Adding message to memory: ${message.role}: ${message.text.substring(0, 50)}...`);
        console.log(`Current session ID: ${this.sessionId}`);

        // Check MongoDB connection before trying to save
        await this.checkMongoConnection();
        console.log(`MongoDB connected: ${this.isMongoConnected}`);

        const messageSize = this._estimateMessageSize(message);

        if (this.messages.reduce((sum, m) => sum + this._estimateMessageSize(m), 0) + messageSize > this.maxSizeBytes) {
            await this.prune(currentContext);
        }

        this.messages.push({
            ...message,
            timestamp: Date.now()
        });

        console.log(`Current memory size: ${this.messages.length} messages`);

        // Save to MongoDB after adding a message
        if (this.isMongoConnected) {
            await this._saveToMongoDB();
        } else {
            console.log('MongoDB not connected, skipping save in addMessage');
        }
    }

    /**
     * Get relevant context from conversation history
     * @param {string} currentQuery - The current query
     * @param {number} maxContextSize - Maximum context size in bytes
     * @returns {Promise<string>} - Formatted context string
     */
    async getRelevantContext(currentQuery, maxContextSize = 1024 * 1024) {
        if (this.messages.length === 0) return '';

        const scoredMessages = await Promise.all(
            this.messages.map(async (message) => ({
                message,
                score: await this._calculateRelevanceScore(message, currentQuery)
            }))
        );

        const sortedMessages = scoredMessages
            .sort((a, b) => b.score - a.score)
            .map(item => item.message);

        let contextString = '';
        const contextMessages = [];

        for (let msg of sortedMessages) {
            const msgText = `${msg.role || 'unknown'}: ${msg.text}`;
            if (contextString.length + msgText.length <= maxContextSize) {
                contextMessages.push(msg);
                contextString += msgText + '\n---\n';
            } else {
                break;
            }
        }

        return contextString;
    }

    /**
     * Get all messages in the conversation history
     * @returns {Array} - All messages
     */
    getAllMessages() {
        return this.messages;
    }

    /**
     * Clear the conversation history
     */
    async clear() {
        this.messages = [];

        // Clear from MongoDB as well
        if (this.isMongoConnected) {
            try {
                await Conversation.findOneAndDelete({ sessionId: this.sessionId });
                console.log(`Cleared conversation from MongoDB for session ${this.sessionId}`);
            } catch (error) {
                console.error('Error clearing conversation from MongoDB:', error);
            }
        }
    }

    /**
     * Update MongoDB connection status
     * @private
     */
    _updateMongoConnectionStatus() {
        const wasConnected = this.isMongoConnected;
        this.isMongoConnected = mongoose.connection.readyState === 1;

        if (wasConnected !== this.isMongoConnected) {
            console.log(`MongoDB connection status changed: ${this.isMongoConnected ? 'Connected' : 'Not connected'}`);
        }

        return this.isMongoConnected;
    }

    /**
     * Set the session ID and reload conversation history
     * @param {string} sessionId - The new session ID
     */
    async setSessionId(sessionId) {
        if (this.sessionId === sessionId) return;

        console.log(`Set conversation memory session ID to: ${sessionId}`);
        this.sessionId = sessionId;
        this.messages = [];

        // Check MongoDB connection before trying to load
        await this.checkMongoConnection();

        if (this.isMongoConnected) {
            await this._loadFromMongoDB();
        }
    }
}

export default HybridConversationMemory;
