# Customer Chat Agent Implementation Plan

## Goal
Add a customer-facing chat agent to the existing Express e-commerce backend, following the API contract in `chatbot_agent_skill.md`. Use LangChain (not LangGraph) with `createAgent` from the `langchain` package.

## Reference
- Local skill: `chatbot_agent_skill.md`
- Reference agent: `https://github.com/kunxin-chor/ecommerce-agent/tree/03-agent`
- Current project: `8109-ecommerce-backend`

## Tech Choices
- **Agent harness:** `createAgent` from `langchain`
- **LLM:** `ChatGoogle` from `@langchain/google` (Gemini)
- **Tool schemas:** `zod`
- **Chat history:** MariaDB-backed `BaseChatMessageHistory` (manual, like the reference repo)
- **Auth:** existing `AuthenticateWithJWT` middleware
- **Streaming:** `createAgent.invoke()` + emit SSE events after the run completes

## Dependencies
- `langchain`
- `@langchain/core`
- `@langchain/google`
- `zod`

## Schema Migration
Create `migrations/001_chatbot.sql`:

```sql
USE ecommerce;

CREATE TABLE IF NOT EXISTS chat_sessions (
  id CHAR(36) PRIMARY KEY,
  user_id INT UNSIGNED,
  title VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id CHAR(36) PRIMARY KEY,
  session_id CHAR(36) NOT NULL,
  parent_id CHAR(36) NULL,
  role VARCHAR(20) NOT NULL,
  type VARCHAR(30) NOT NULL,
  content TEXT,
  tool_call_id VARCHAR(50) NULL,
  payload JSON,
  created_at DATETIME DEFAULT NOW(),
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);
```

No changes to existing frontend-facing tables.

## Files to Create
- `agent.js` — LLM + `createAgent` setup
- `chatbot/tools/createCustomerTools.js` — factory that returns per-request tools with `userId` bound
- `chatbot/modules/history.js` — `MariaDBChatHistory` class
- `chatbot/modules/runAgent.js` — invoke agent, format messages, save history
- `chatbot/modules/formatMessages.js` — convert LangChain messages to skill format
- `routes/chat.js` — chat endpoints
- `migrations/001_chatbot.sql` — schema

## Files to Modify
- `index.js` — register `chatRouter`
- `package.json` — add dependencies
- `.env.example` — add `GEMINI_API_KEY`
- `services/cartServices.js` + `data/cartData.js` — add `addToCart` and `removeFromCart`
- `services/orderServices.js` — add `getOrderSummary`

## API Endpoints
```http
POST   /api/chat/sessions
GET    /api/chat/:sessionId/messages
POST   /api/chat/:sessionId/messages   # SSE response
DELETE /api/chat/:sessionId
```

All endpoints require JWT via the existing `AuthenticateWithJWT` middleware.

## Tools
1. `search_products` — `query`, `maxPrice`, `category`, `limit`
2. `get_product_details` — `productId`
3. `get_cart` — uses logged-in `userId`
4. `add_to_cart` — `productId`, `quantity`
5. `remove_from_cart` — `productId`
6. `get_order_summary` — returns `{ subtotal, shipping, discount, total }`
7. `render_chart` — `chartType`, `title`, `categories`, `series`, `xaxisTitle`, `yaxisTitle`; returns ApexCharts-compatible `{ options, series }`

## Message Flow (SSE Example)
User: “Show me smartwatches under $200”

1. Save user message as `type: text`.
2. Run `createAgent.invoke()` with history + tools.
3. Format results:
   - `tool_call` for `search_products`
   - `tool_output` for the search result
   - `products` derived message for the frontend product cards
   - `text` final assistant message
4. Save all messages to the database.
5. Emit each message as an SSE `event: message`.

## Demo Scenarios
- “Show me smartwatches under $200” → `tool_call`, `tool_output`, `products`, `text`
- “Tell me about product 1” → `tool_call`, `tool_output`, `text`
- “What’s in my cart?” → `tool_call`, `tool_output`, `text`
- “Add 2 of product 1 to my cart” → `tool_call`, `tool_output`, `cart_update`, `text`
- “Compare prices of earbuds and headphones” → `tool_call`, `tool_output`, `chart`, `text`
- “What will my order total be?” → `tool_call`, `tool_output`, `text`

## Environment Variables
Add to `.env.example`:
```
GEMINI_API_KEY=your_gemini_api_key_here
```

## Open Decisions / Notes
- Optional: `migrations/002_demo_chart_data.sql` to seed more historical orders for richer chart demos.
- Tool `userId` injection uses a closure pattern for simplicity and version-robustness.
- If `createAgent.stream()` is available and reliable, we can switch to true streaming later.

## Acceptance Criteria
- [ ] `npm install` succeeds with new dependencies.
- [ ] Migration `001_chatbot.sql` runs successfully.
- [ ] `POST /api/chat/sessions` returns a new session.
- [ ] `GET /api/chat/:sessionId/messages` returns conversation history in skill format.
- [ ] `POST /api/chat/:sessionId/messages` returns SSE events matching the skill contract.
- [ ] Product search, cart add/remove, and chart tools produce correct SSE messages.
- [ ] No admin login or EJS frontend is added.
- [ ] Existing frontend-facing routes remain unchanged.
