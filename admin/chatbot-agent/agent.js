const { createAgent } = require('langchain');
const { HumanMessage } = require('@langchain/core/messages');
const { getModel } = require('./ai');
const tools = require('./tools');

const SYSTEM_PROMPT = `You are a store operations assistant for an authenticated administrator of an ecommerce store.

Data model facts:
- Products have an id, name, price, stock level, and description.

How to work:
- Use tools for every factual answer. Never invent products, stock levels, prices, or totals.
- If you only know a product name, call search_products first to find its id, then call check_stock.
- If a result is empty, say that no matching records were found.
- If the available tools cannot answer the request, say what is missing instead of guessing.

Style:
- Always answer in simple Markdown.
- Be concise and summarise the tool result instead of repeating it raw.
- Never reveal passwords, password hashes, tokens, or payment secrets.`

const agent = createAgent({
    model: getModel(),
    tools: [
        tools.searchProducts,
        tools.checkStock
    ],
    systemPrompt: SYSTEM_PROMPT
})

async function askChatbot(message) {

    const result = await agent.invoke({
        messages: [ new HumanMessage(message)]
    })

    // if it responds with an array [ {part:{text:"abc"}, {part:text:"def"}}]
    // then response.content.map(...) => ["abc", "def"].join('') => "abc def"

    // get the last message (the last message will always have the result)
    const response = result.messages[result.messages.length -1];

    if (Array.isArray(response.content)) {
        return response.content.map((part) => part.text || '').join('');
    }

    return response.content;
}

module.exports = { askChatbot }