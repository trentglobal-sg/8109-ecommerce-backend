# ecommerce-backend-starter

Do get started, 

1. `chmod +x db.sh` - allow the `db.sh` script to be runnable
2. `./db.sh < schema.sql` - setup the database
3. `./db.sh < data.sql` - insert sample table
4. Apply schema changes in order from `migrations/*.sql`:
   - `./db.sh < migrations/001_add_role_to_users.sql`
   - `./db.sh < migrations/002_add_stock_to_products.sql`
5. Set `JWT_SECRET` in `.env`.
6. Create an admin with `npm run create-admin -- admin@example.com strong-password "Admin Name"`.
7. Open `/admin/login` and sign in to use the EJS dashboard.
8. Set `GEMINI_API_KEY` in `.env`, then open `/admin/chat` to use the single-session store assistant. A page refresh starts a new in-memory conversation.

## Store assistant prompts to try

Single tool call:

- `Which products mention wireless in their name or description?`
- `How much stock is left for the 27-inch 4K Monitor?`
- `Show me the orders for aisha.tan@example.com.`
- `What is currently sitting in customer carts?`

Chained tool calls:

- `What did aisha.tan@example.com buy in her most recent order?` (orders, then order details)
- `Find the Portable Mini Projector and tell me if we have enough stock to cover the pending orders that include it.` (product search, stock, orders by status with items)
- `Who are our top 5 selling products and how much revenue did each bring in?`
- `Give me a profile of ben.carter@example.com: where is he from, what are his marketing preferences, and what is his lifetime value?`
- `Break down our order value by status for July 2026 and tell me how much revenue is at risk from pending orders.`

Limitations worth demonstrating:

- `Which customers have never placed an order?` (the assistant should explain it cannot list all customers with the current tools)

## LFS Error
Sometimes, when pushing in CodeSpace, you may get an error related to LFS. If that's the case, run the commands below in the terminal: (make sure the current working directory is the project folder)
```
rm .git/hooks/post-checkout
rm .git/hooks/post-commit
rm .git/hooks/post-merge
rm .git/hooks/pre-push
```