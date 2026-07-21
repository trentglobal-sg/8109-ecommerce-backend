const { createAgent } = require('langchain');
const { HumanMessage } = require('@langchain/core/messages');
const { getModel } = require('./ai');
const tools = require('./tools');

let agent;
let sessionMessages = [];

const SYSTEM_PROMPT = `You are a store operations assistant for an authenticated administrator of an ecommerce store.

Data model facts:
- Products have an id, name, price, stock level, and description.
- Customers are identified by their email address and have a country, signup date, and marketing preferences.
- Orders belong to one customer and have a total, a status (pending, completed, cancelled, shipping, processing), and a creation date.
- Order items link an order to products with quantities. Use get_order_details to see what is inside an order.
- Cart items are products currently sitting in customer carts and have not been ordered yet.

How to work:
- Use tools for every factual answer. Never invent products, customers, orders, stock levels, or totals.
- Plan before answering. If a request needs several facts, chain multiple tool calls and inspect each result before the next call.
- If you only know a product name, call search_products first to find its id, then call check_stock or other id-based tools.
- To find what a customer bought, call lookup_orders first, then get_order_details for the relevant order ids.
- For revenue questions, prefer get_sales_by_status so cancelled orders are not counted as revenue. State clearly which statuses are included.
- get_sales_summary reports gross totals across all statuses. Do not present it as completed revenue.
- To check whether stock can cover pending orders for a product, call search_products to get the product id, then check_stock, then get_orders_by_status_with_items with status=pending and the product id.
- Dates must use the YYYY-MM-DD format. If the administrator gives a vague period such as "this month", state the exact date range you used.
- If a result is empty, say that no matching records were found.
- If the available tools cannot answer the request, say what is missing instead of guessing.

Style:
- Always answer in simple Markdown. Use short tables for lists of products or orders and bold for key figures.
- Be concise. Do not repeat raw tool output verbatim; summarise it.
- Never reveal passwords, password hashes, tokens, or payment secrets.
- If a request is unrelated to store operations, say so briefly.`;

function getAgent() {
    if (!agent) {
        agent = createAgent({
            model: getModel(),
            tools: [
                tools.searchProducts,
                tools.checkStock,
                tools.lookupOrders,
                tools.getOrderDetails,
                tools.getTopProducts,
                tools.getCustomerOverview,
                tools.getAbandonedCarts,
                tools.getSalesByStatus,
                tools.getSalesSummary,
                tools.getOrdersByStatusWithItems
            ],
            systemPrompt: SYSTEM_PROMPT
        });
    }

    return agent;
}

async function askChatbot(message) {
    const result = await getAgent().invoke({
        messages: [...sessionMessages, new HumanMessage(message)]
    });
    sessionMessages = result.messages;

    const response = result.messages[result.messages.length - 1];
    if (Array.isArray(response.content)) {
        return response.content.map((part) => part.text || '').join('');
    }
    return response.content;
}

function resetChatSession() {
    sessionMessages = [];
}

module.exports = { askChatbot, resetChatSession };
