# Chatbot API Skill Prompt

Use this skill when implementing or modifying the chatbot feature in the e-commerce frontend (`src/ChatbotPage.jsx` and related components). This document defines the API contract and JSON message shapes expected between the React frontend and the backend chatbot service.

---

## 1. Base Configuration

- **Base URL:** Read from `import.meta.env.VITE_API_URL` (same as all other API calls).
- **HTTP client:** Use `axios`.
- **Authentication:** Include the user's JWT as a Bearer token for chat endpoints:
  ```js
  headers: { Authorization: `Bearer ${jwt}` }
  ```
- **Route:** The chatbot page is mounted at `/chat` (see `src/App.jsx`).

---

## 2. Endpoints

### 2.1 Create a new chat session

```http
POST /chat/sessions
```

**Request body:** empty or optional initial context object.

```json
{
  "title": "Shopping help",
  "metadata": { "source": "web" }
}
```

**Response:**

```json
{
  "sessionId": "uuid-string",
  "createdAt": "2026-07-21T07:57:51Z",
  "title": "Shopping help"
}
```

### 2.2 Send a message and receive a streaming response

```http
POST /chat/:sessionId/messages
```

**Request body:**

```json
{
  "message": {
    "role": "user",
    "type": "text",
    "content": "Show me the latest products"
  }
}
```

**Response:** Server-Sent Events (`text/event-stream`). Each event is a JSON chunk representing one assistant message fragment. The client appends chunks that share the same `id` and `parentId` until `done: true` is received.

Event stream example:

```text
event: message
data: {"id":"msg_2","parentId":"msg_1","role":"assistant","type":"thinking","content":"The user wants..."}

event: message
data: {"id":"msg_3","parentId":"msg_1","role":"assistant","type":"tool_call","toolCall":{"id":"call_1","name":"search_products","arguments":{"query":"latest products","limit":5}}}

event: message
data: {"id":"msg_4","parentId":"call_1","role":"tool","type":"tool_output","toolOutput":{"id":"call_1","result":[...]}}

event: message
data: {"id":"msg_5","parentId":"msg_1","role":"assistant","type":"text","content":"Here are the newest products..."}

event: message
data: {"id":"msg_5","parentId":"msg_1","role":"assistant","type":"text","content":"","done":true}
```

### 2.3 Get conversation history

```http
GET /chat/:sessionId/messages
```

**Response:**

```json
{
  "sessionId": "uuid-string",
  "messages": [
    { "id": "msg_1", "role": "user", "type": "text", "content": "Hi" },
    { "id": "msg_2", "role": "assistant", "type": "text", "content": "Hello! How can I help?" }
  ]
}
```

### 2.4 Delete a session

```http
DELETE /chat/:sessionId
```

**Response:** `204 No Content` or `{ "deleted": true }`.

---

## 3. Message Object Shape

Every message in the chat follows this shared base shape. Additional keys are added depending on `type`.

```json
{
  "id": "string (unique message id)",
  "parentId": "string (optional id of the message/tool this is a reply to)",
  "role": "user | assistant | tool | system",
  "type": "text | thinking | planning | tool_call | tool_output | chart | products | cart_update | error",
  "content": "string | object (depends on type)",
  "timestamp": "ISO-8601 string",
  "done": false
}
```

### 3.1 `text` — plain text message

Used by both user and assistant.

```json
{
  "id": "msg_1",
  "role": "user",
  "type": "text",
  "content": "Show me smartwatches under $200",
  "timestamp": "2026-07-21T07:57:51Z"
}
```

Assistant text:

```json
{
  "id": "msg_2",
  "parentId": "msg_1",
  "role": "assistant",
  "type": "text",
  "content": "Here are the smartwatches that match your budget.",
  "timestamp": "2026-07-21T07:57:52Z"
}
```

### 3.2 `thinking` — internal reasoning token

Optional, used only by assistant. UI should render in a muted style or collapsible panel. Usually streamed before a final answer.

```json
{
  "id": "msg_t1",
  "parentId": "msg_1",
  "role": "assistant",
  "type": "thinking",
  "content": "The user asked for smartwatches under $200. I should search products and filter by price.",
  "timestamp": "2026-07-21T07:57:51Z"
}
```

### 3.3 `planning` — multi-step plan

Used by assistant when the chatbot decides to break a request into steps. Render as a numbered or status list.

```json
{
  "id": "msg_p1",
  "parentId": "msg_1",
  "role": "assistant",
  "type": "planning",
  "content": [
    { "step": 1, "description": "Search for smartwatches", "status": "done" },
    { "step": 2, "description": "Filter by price under $200", "status": "done" },
    { "step": 3, "description": "Return recommendations", "status": "in_progress" }
  ],
  "timestamp": "2026-07-21T07:57:51Z"
}
```

Possible `status` values: `pending`, `in_progress`, `done`, `failed`.

### 3.4 `tool_call` — assistant requests a tool

The assistant invokes a tool by name with arguments. The frontend does not execute the tool directly; it is a signal from the backend that the LLM has called a function. The actual result is returned in a `tool_output` message.

```json
{
  "id": "msg_tc1",
  "parentId": "msg_1",
  "role": "assistant",
  "type": "tool_call",
  "toolCall": {
    "id": "call_1",
    "name": "search_products",
    "arguments": {
      "query": "smartwatch",
      "maxPrice": 200
    }
  },
  "timestamp": "2026-07-21T07:57:51Z"
}
```

### 3.5 `tool_output` — result of a tool execution

Returned by the backend with `role: "tool"`. The `parentId` or `toolOutput.id` must reference the matching `tool_call.id`.

```json
{
  "id": "msg_to1",
  "parentId": "msg_tc1",
  "role": "tool",
  "type": "tool_output",
  "toolOutput": {
    "id": "call_1",
    "name": "search_products",
    "result": [
      { "id": 1, "name": "Sleek Smartwatch", "price": 199.99, "imageUrl": "..." }
    ]
  },
  "timestamp": "2026-07-21T07:57:52Z"
}
```

### 3.6 `chart` — rendered chart

The frontend renders this using `react-apexcharts`. The `content` shape is passed directly to the `Chart` component as `options` and `series`.

```json
{
  "id": "msg_c1",
  "parentId": "msg_1",
  "role": "assistant",
  "type": "chart",
  "content": {
    "options": {
      "chart": { "id": "sales-chart", "type": "line" },
      "xaxis": { "categories": ["Jan", "Feb", "Mar"] },
      "title": { "text": "Sales Trend", "align": "center" }
    },
    "series": [{ "name": "Sales", "data": [30, 40, 35] }]
  },
  "timestamp": "2026-07-21T07:57:52Z"
}
```

### 3.7 `products` — product recommendation cards

The backend returns a list of products; the frontend renders them as product cards (reusing `ProductCard` if available).

```json
{
  "id": "msg_pr1",
  "parentId": "msg_1",
  "role": "assistant",
  "type": "products",
  "content": {
    "heading": "Recommended for you",
    "products": [
      {
        "id": 1,
        "name": "Sleek Smartwatch",
        "price": 199.99,
        "imageUrl": "https://picsum.photos/id/20/300/200"
      }
    ]
  },
  "timestamp": "2026-07-21T07:57:52Z"
}
```

### 3.8 `cart_update` — assistant updated the cart

Signals that a tool changed the user's shopping cart. The frontend should refresh cart state (e.g., call `fetchCart`).

```json
{
  "id": "msg_cu1",
  "parentId": "msg_1",
  "role": "assistant",
  "type": "cart_update",
  "content": {
    "action": "add | remove | update_quantity",
    "productId": 1,
    "quantity": 2,
    "message": "Added 2 Sleek Smartwatch to your cart."
  },
  "timestamp": "2026-07-21T07:57:52Z"
}
```

### 3.9 `error` — backend or tool error

```json
{
  "id": "msg_e1",
  "parentId": "msg_1",
  "role": "assistant",
  "type": "error",
  "content": {
    "code": "TOOL_EXECUTION_FAILED",
    "message": "Unable to search products right now."
  },
  "timestamp": "2026-07-21T07:57:52Z"
}
```

---

## 4. Tools Available to the Chatbot

The backend may expose these tools to the LLM. Tool calls and outputs use the shapes described in sections 3.4 and 3.5.

| Tool name | Description | Expected arguments | Expected result shape |
|-----------|-------------|--------------------|------------------------|
| `search_products` | Search the product catalog. | `{ query: string, maxPrice?: number, category?: string, limit?: number }` | Array of product objects `{ id, name, price, imageUrl }` |
| `get_product_details` | Fetch details for one product. | `{ productId: number }` | Product object with `description`, `price`, `stock`, etc. |
| `get_cart` | Fetch the current user's cart. | `{}` | Array of cart items `{ id, product_id, quantity, name, price, imageUrl }` |
| `add_to_cart` | Add a product to the cart. | `{ productId: number, quantity?: number }` | Updated cart summary `{ cartItems, total }` |
| `remove_from_cart` | Remove a product from the cart. | `{ productId: number }` | Updated cart summary `{ cartItems, total }` |
| `get_order_summary` | Show order totals and discounts. | `{}` | `{ subtotal, shipping, discount, total }` |
| `render_chart` | Return a chart config to display. | `{ chartType: string, title: string, data: any }` | ApexCharts-compatible `{ options, series }` |

---

## 5. Streaming Protocol

Use **Server-Sent Events (SSE)** for the chat response endpoint.

- Each event is a line: `event: message\ndata: <json>\n\n`.
- The client decodes each chunk and appends it to the message list.
- For a `text` message, the backend may stream many partial chunks. The client should concatenate `content` on the same `id` until `done: true`.
- For `thinking`, `planning`, and `tool_call` types, the full payload is usually sent once, but the same `done` convention applies.

Fallback: If the backend does not support SSE, return a single JSON array of messages with a `200 OK` response:

```json
{
  "messages": [
    { "id": "msg_2", "role": "assistant", "type": "text", "content": "Here is the answer." }
  ]
}
```

---

## 6. Frontend Implementation Notes

- `ChatbotPage.jsx` currently stores messages in local state. When integrating the API:
  - Create a session on first user message (or on mount) via `POST /chat/sessions`.
  - POST the user message to `/chat/:sessionId/messages` and open an EventSource.
  - Append each streamed chunk to the `messages` state.
  - Handle `type: "chart"` with `<Chart options={content.options} series={content.series} ... />`.
  - Handle `type: "products"` by rendering product cards with an "Add to Cart" button that calls `addToCart` from `CartStore.jsx`.
  - Handle `type: "cart_update"` by calling `fetchCart()` from `CartStore.jsx` to refresh the global cart.
- Preserve the existing message rendering style:
  - User messages: `bg-primary text-white`, aligned right.
  - Assistant/tool messages: `bg-light border`, aligned left.
- Use `Date.now()` only as a fallback client-side ID; prefer the backend-provided `id`.

---

## 7. Example Full Conversation

### Request

```http
POST /chat/550e8400-e29b-41d4-a716-446655440000/messages
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "message": {
    "role": "user",
    "type": "text",
    "content": "What smartwatches do you have under $200?"
  }
}
```

### SSE Response

```text
event: message
data: {"id":"msg_2","parentId":"msg_1","role":"assistant","type":"thinking","content":"The user wants smartwatches under $200. I will search the catalog."}

event: message
data: {"id":"msg_3","parentId":"msg_1","role":"assistant","type":"tool_call","toolCall":{"id":"call_1","name":"search_products","arguments":{"query":"smartwatch","maxPrice":200}}}

event: message
data: {"id":"msg_4","parentId":"msg_3","role":"tool","type":"tool_output","toolOutput":{"id":"call_1","name":"search_products","result":[{"id":1,"name":"Sleek Smartwatch","price":199.99,"imageUrl":"https://picsum.photos/id/20/300/200"}]}}

event: message
data: {"id":"msg_5","parentId":"msg_1","role":"assistant","type":"text","content":"We have the Sleek Smartwatch at $199.99."}

event: message
data: {"id":"msg_5","parentId":"msg_1","role":"assistant","type":"text","content":"","done":true}
```

---

## 8. Validation Checklist

When implementing or reviewing the chatbot integration, confirm:

- [ ] All requests include the `VITE_API_URL` base and the Bearer token when the user is logged in.
- [ ] The SSE stream is closed and cleaned up when the component unmounts.
- [ ] Every message has a unique `id`, and streamed text chunks are merged by `id` until `done: true`.
- [ ] `tool_call` and matching `tool_output` share the same `toolCall.id` / `toolOutput.id`.
- [ ] `type: "chart"` content is compatible with `react-apexcharts` (`options` + `series`).
- [ ] Cart-related message types call the existing cart refresh logic from `CartStore.jsx`.
- [ ] Errors are shown via `FlashMessageStore` or inline in the chat UI.

---

## Appendix A: Exact API Shape to Generate an ApexChart

When the backend wants the assistant to render a chart in the chat, it MUST return a message with `type: "chart"`. The `content` object is passed almost directly to `react-apexcharts` as `<Chart options={content.options} series={content.series} type={...} />`.

### Minimal valid `chart` message

```json
{
  "id": "msg_chart_1",
  "parentId": "msg_user_1",
  "role": "assistant",
  "type": "chart",
  "content": {
    "options": {
      "chart": {
        "id": "sales-chart",
        "type": "line"
      },
      "xaxis": {
        "categories": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
      }
    },
    "series": [
      { "name": "Sales", "data": [30, 40, 35, 50, 49, 60] }
    ]
  },
  "timestamp": "2026-07-21T07:57:52Z",
  "done": true
}
```

### Full ApexCharts-compatible `chart` message

```json
{
  "id": "msg_chart_2",
  "parentId": "msg_user_2",
  "role": "assistant",
  "type": "chart",
  "content": {
    "options": {
      "chart": {
        "id": "revenue-chart",
        "type": "bar",
        "toolbar": { "show": true },
        "animations": { "enabled": true }
      },
      "title": {
        "text": "Monthly Revenue",
        "align": "center"
      },
      "subtitle": {
        "text": "USD",
        "align": "center"
      },
      "xaxis": {
        "categories": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        "title": { "text": "Month" }
      },
      "yaxis": {
        "title": { "text": "Revenue (USD)" }
      },
      "colors": ["#008FFB", "#00E396"],
      "dataLabels": { "enabled": true },
      "legend": { "position": "top" },
      "grid": { "show": true }
    },
    "series": [
      { "name": "2025", "data": [12000, 15000, 13000, 17000, 16000, 19000] },
      { "name": "2026", "data": [14000, 16500, 15500, 18500, 17500, 21000] }
    ]
  },
  "timestamp": "2026-07-21T07:57:52Z",
  "done": true
}
```

### Rendering contract

The frontend maps the message to the `react-apexcharts` component like this:

```jsx
<Chart
  options={msg.content.options}
  series={msg.content.series}
  type={msg.content.options?.chart?.type || "line"}
  width={400}
  height={300}
/>
```

Therefore:

- `content.options` MUST be a valid ApexCharts `options` object.
- `content.series` MUST be a valid ApexCharts `series` array.
- `content.options.chart.type` (if present) determines the default chart type rendered. If omitted, the frontend falls back to `"line"`.
- The `width` and `height` are chosen by the frontend; the backend should not rely on them.
- The backend should set `done: true` on the final chart message so the frontend knows the stream for this message is complete.

### Supported chart types

Any `type` supported by ApexCharts may be returned via `content.options.chart.type`. Common values include: `line`, `area`, `bar`, `pie`, `donut`, `radialBar`, `scatter`, `bubble`, `heatmap`, `candlestick`, `radar`.

### Streaming a chart

Charts are usually sent as a single complete payload, not streamed character-by-character. Example SSE event:

```text
event: message
data: {"id":"msg_chart_1","parentId":"msg_user_1","role":"assistant","type":"chart","content":{"options":{"chart":{"id":"sales-chart","type":"line"},"xaxis":{"categories":["Jan","Feb","Mar"]}},"series":[{"name":"Sales","data":[30,40,35]}]},"done":true}
```

### Returning a chart from a tool

If the assistant uses a `render_chart` tool, the tool output should return the same `options`/`series` object, and the assistant can then emit a final `type: "chart"` message referencing that output.

```json
{
  "id": "msg_tool_out_1",
  "parentId": "msg_tool_call_1",
  "role": "tool",
  "type": "tool_output",
  "toolOutput": {
    "id": "call_chart_1",
    "name": "render_chart",
    "result": {
      "options": { "chart": { "id": "sales-chart", "type": "line" }, "xaxis": { "categories": ["Jan", "Feb", "Mar"] } },
      "series": [{ "name": "Sales", "data": [30, 40, 35] }]
    }
  }
}
```
