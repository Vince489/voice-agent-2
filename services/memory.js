/**
 * Memory Service
 * 
 * Provides a hybrid conversation memory system that combines:
 * - In-memory storage for recent messages
 * - Relevance-based pruning to maintain context
 * - Optional embedding-based similarity for better context retrieval
 */

/**
 * HybridConversationMemory class for managing conversation history
 * with intelligent pruning and context retrieval
 */
export class HybridConversationMemory {
    /**
     * Create a new HybridConversationMemory instance
     * @param {Object} options - Configuration options
     * @param {number} options.maxSizeBytes - Maximum memory size in bytes (default: 5MB)
     * @param {number} options.maxMessageCount - Maximum number of messages to store (default: 20)
     * @param {Object} options.embeddingModel - Optional embedding model for semantic similarity
     */
    constructor(options = {}) {
        this.maxSizeBytes = options.maxSizeBytes || 5 * 1024 * 1024; // 5MB default
        this.maxMessageCount = options.maxMessageCount || 20; // Limit total messages
        this.messages = [];
        this.embeddingModel = options.embeddingModel;
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
    }

    /**
     * Add a message to the conversation history
     * @param {Object} message - The message to add
     * @param {string} currentContext - The current context
     * @returns {Promise<void>}
     */
    async addMessage(message, currentContext) {
        const messageSize = this._estimateMessageSize(message);
        
        if (this.messages.reduce((sum, m) => sum + this._estimateMessageSize(m), 0) + messageSize > this.maxSizeBytes) {
            await this.prune(currentContext);
        }

        this.messages.push({
            ...message,
            timestamp: Date.now()
        });
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
    clear() {
        this.messages = [];
    }
}

export default HybridConversationMemory;
