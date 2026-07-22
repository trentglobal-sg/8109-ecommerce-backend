const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');

function getModel() {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not configured');
    }

    return new ChatGoogleGenerativeAI({
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
        temperature: 0
    });
}

module.exports = { getModel };