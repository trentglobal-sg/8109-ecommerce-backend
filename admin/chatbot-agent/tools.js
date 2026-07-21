const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const pool = require('../../database');

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

async function runSearchProducts(input) {
    const searchTerm = '%' + input.query + '%';
    const [rows] = await pool.execute(
        `SELECT id, name, price, stock, description
         FROM products
         WHERE name LIKE ? OR description LIKE ?
         ORDER BY name
         LIMIT ?`,
        [searchTerm, searchTerm, input.limit]
    );
    return JSON.stringify(rows);
}

const searchProducts = tool(runSearchProducts, {
    name: 'search_products',
    description: 'Search the product catalog by product name or description. Returns id, name, price, stock, and description.',
    schema: z.object({
        query: z.string().min(1),
        limit: z.number().int().min(1).max(20).default(10)
    })
});

async function runCheckStock(input) {
    const [rows] = await pool.execute(
        `SELECT id, name, price, stock
         FROM products
         WHERE id = ?`,
        [input.productId]
    );
    if (rows.length === 0) {
        return JSON.stringify({ error: 'No product found with id ' + input.productId });
    }
    return JSON.stringify(rows[0]);
}

const checkStock = tool(runCheckStock, {
    name: 'check_stock',
    description: 'Get the current stock level for a single product by its product id. Use search_products first if you only know the product name.',
    schema: z.object({
        productId: z.number().int().min(1)
    })
});

async function runLookupOrders(input) {
    const conditions = ['u.email = ?'];
    const values = [input.email];

    if (input.status) {
        conditions.push('o.status = ?');
        values.push(input.status);
    }

    const [rows] = await pool.execute(
        `SELECT o.id, o.total, o.status, o.created_at, u.email
         FROM orders o
         JOIN users u ON u.id = o.user_id
         WHERE ${conditions.join(' AND ')}
         ORDER BY o.created_at DESC
         LIMIT 20`,
        values
    );
    return JSON.stringify(rows);
}

const lookupOrders = tool(runLookupOrders, {
    name: 'lookup_orders',
    description: 'Look up a customer\'s recent orders by email, optionally filtered by order status.',
    schema: z.object({
        email: z.string().email(),
        status: z.enum(['pending', 'completed', 'cancelled', 'shipping', 'processing']).optional()
    })
});

async function runGetOrderDetails(input) {
    const [orders] = await pool.execute(
        `SELECT o.id, o.total, o.status, o.created_at, u.name AS customer_name, u.email
         FROM orders o
         JOIN users u ON u.id = o.user_id
         WHERE o.id = ?`,
        [input.orderId]
    );
    if (orders.length === 0) {
        return JSON.stringify({ error: 'No order found with id ' + input.orderId });
    }

    const [items] = await pool.execute(
        `SELECT p.id AS product_id, p.name, p.price, oi.quantity,
                (p.price * oi.quantity) AS line_total
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = ?`,
        [input.orderId]
    );

    const order = orders[0];
    order.items = items;
    return JSON.stringify(order);
}

const getOrderDetails = tool(runGetOrderDetails, {
    name: 'get_order_details',
    description: 'Get one order with its customer and every line item (product, quantity, line total). Use lookup_orders first to find order ids.',
    schema: z.object({
        orderId: z.number().int().min(1)
    })
});

async function runGetTopProducts(input) {
    const conditions = ["o.status <> 'cancelled'"];
    const values = [];

    if (input.fromDate) {
        conditions.push('o.created_at >= ?');
        values.push(input.fromDate + ' 00:00:00');
    }
    if (input.toDate) {
        conditions.push('o.created_at < DATE_ADD(?, INTERVAL 1 DAY)');
        values.push(input.toDate);
    }
    values.push(input.limit);

    const [rows] = await pool.execute(
        `SELECT p.id, p.name, p.price,
                SUM(oi.quantity) AS units_sold,
                SUM(p.price * oi.quantity) AS revenue
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         JOIN products p ON p.id = oi.product_id
         WHERE ${conditions.join(' AND ')}
         GROUP BY p.id, p.name, p.price
         ORDER BY units_sold DESC
         LIMIT ?`,
        values
    );
    return JSON.stringify(rows);
}

const getTopProducts = tool(runGetTopProducts, {
    name: 'get_top_products',
    description: 'Get the best selling products by units sold and revenue, excluding cancelled orders. Supports an optional YYYY-MM-DD date range.',
    schema: z.object({
        limit: z.number().int().min(1).max(20).default(5),
        fromDate: z.string().regex(DATE_PATTERN).optional(),
        toDate: z.string().regex(DATE_PATTERN).optional()
    })
});

async function runGetCustomerOverview(input) {
    const [users] = await pool.execute(
        `SELECT id, name, email, salutation, country, created_at
         FROM users
         WHERE email = ?`,
        [input.email]
    );
    if (users.length === 0) {
        return JSON.stringify({ error: 'No customer found with email ' + input.email });
    }

    const customer = users[0];

    const [orderStats] = await pool.execute(
        `SELECT COUNT(*) AS order_count,
                COALESCE(SUM(total), 0) AS lifetime_value
         FROM orders
         WHERE user_id = ? AND status <> 'cancelled'`,
        [customer.id]
    );

    const [preferences] = await pool.execute(
        `SELECT mp.preference
         FROM user_marketing_preferences ump
         JOIN marketing_preferences mp ON mp.id = ump.preference_id
         WHERE ump.user_id = ?`,
        [customer.id]
    );

    const preferenceNames = [];
    for (const row of preferences) {
        preferenceNames.push(row.preference);
    }

    customer.order_count = orderStats[0].order_count;
    customer.lifetime_value = orderStats[0].lifetime_value;
    customer.marketing_preferences = preferenceNames;
    return JSON.stringify(customer);
}

const getCustomerOverview = tool(runGetCustomerOverview, {
    name: 'get_customer_overview',
    description: 'Get a customer profile by email: country, signup date, marketing preferences, order count, and lifetime value excluding cancelled orders.',
    schema: z.object({
        email: z.string().email()
    })
});

async function runGetAbandonedCarts() {
    const [rows] = await pool.execute(
        `SELECT u.name AS customer_name, u.email,
                p.name AS product_name, p.price, ci.quantity,
                (p.price * ci.quantity) AS cart_value
         FROM cart_items ci
         JOIN users u ON u.id = ci.user_id
         JOIN products p ON p.id = ci.product_id
         ORDER BY u.email, p.name`
    );
    return JSON.stringify(rows);
}

const getAbandonedCarts = tool(runGetAbandonedCarts, {
    name: 'get_abandoned_carts',
    description: 'List every item currently sitting in customer shopping carts, with the customer email and the value of each cart line.',
    schema: z.object({})
});

async function runGetSalesByStatus(input) {
    const conditions = [];
    const values = [];

    if (input.fromDate) {
        conditions.push('created_at >= ?');
        values.push(input.fromDate + ' 00:00:00');
    }
    if (input.toDate) {
        conditions.push('created_at < DATE_ADD(?, INTERVAL 1 DAY)');
        values.push(input.toDate);
    }

    let whereClause = '';
    if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    const [rows] = await pool.execute(
        `SELECT status,
                COUNT(*) AS order_count,
                COALESCE(SUM(total), 0) AS total_value
         FROM orders
         ${whereClause}
         GROUP BY status
         ORDER BY total_value DESC`,
        values
    );
    return JSON.stringify(rows);
}

const getSalesByStatus = tool(runGetSalesByStatus, {
    name: 'get_sales_by_status',
    description: 'Get order counts and total order value grouped by order status (pending, completed, cancelled, shipping, processing). Supports an optional YYYY-MM-DD date range. Use this for revenue questions that depend on status.',
    schema: z.object({
        fromDate: z.string().regex(DATE_PATTERN).optional(),
        toDate: z.string().regex(DATE_PATTERN).optional()
    })
});

async function runGetSalesSummary(input) {
    const conditions = [];
    const values = [];

    if (input.fromDate) {
        conditions.push('created_at >= ?');
        values.push(input.fromDate + ' 00:00:00');
    }
    if (input.toDate) {
        conditions.push('created_at < DATE_ADD(?, INTERVAL 1 DAY)');
        values.push(input.toDate);
    }

    let whereClause = '';
    if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    const [rows] = await pool.execute(
        `SELECT COUNT(*) AS order_count,
                COALESCE(SUM(total), 0) AS gross_sales,
                SUM(status = 'completed') AS completed_orders
         FROM orders
         ${whereClause}`,
        values
    );
    return JSON.stringify(rows[0]);
}

const getSalesSummary = tool(runGetSalesSummary, {
    name: 'get_sales_summary',
    description: 'Get total order count, gross sales across all statuses, and completed order count for an optional date range. Dates must be YYYY-MM-DD.',
    schema: z.object({
        fromDate: z.string().regex(DATE_PATTERN).optional(),
        toDate: z.string().regex(DATE_PATTERN).optional()
    })
});

async function runGetOrdersByStatusWithItems(input) {
    const conditions = ['o.status = ?'];
    const values = [input.status];

    if (input.productId) {
        conditions.push('oi.product_id = ?');
        values.push(input.productId);
    }

    const [orders] = await pool.execute(
        `SELECT o.id, o.total, o.created_at, u.name AS customer_name, u.email
         FROM orders o
         JOIN users u ON u.id = o.user_id
         JOIN order_items oi ON oi.order_id = o.id
         WHERE ${conditions.join(' AND ')}
         GROUP BY o.id, o.total, o.created_at, u.name, u.email
         ORDER BY o.created_at DESC
         LIMIT 50`,
        values
    );

    const orderIds = [];
    for (const row of orders) {
        orderIds.push(row.id);
    }

    if (orderIds.length === 0) {
        return JSON.stringify([]);
    }

    const [items] = await pool.execute(
        `SELECT oi.order_id, p.id AS product_id, p.name, p.price, oi.quantity,
                (p.price * oi.quantity) AS line_total
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id IN (${orderIds.join(',')})
         ORDER BY oi.order_id`,
        []
    );

    const itemsByOrderId = {};
    for (const item of items) {
        if (!itemsByOrderId[item.order_id]) {
            itemsByOrderId[item.order_id] = [];
        }
        itemsByOrderId[item.order_id].push(item);
    }

    for (const order of orders) {
        order.items = itemsByOrderId[order.id] || [];
    }

    return JSON.stringify(orders);
}

const getOrdersByStatusWithItems = tool(runGetOrdersByStatusWithItems, {
    name: 'get_orders_by_status_with_items',
    description: 'List orders by status (pending, completed, cancelled, shipping, processing) with their line items. Optionally filter by product id to see only orders that include that product. Use this to check stock against pending orders for a specific product.',
    schema: z.object({
        status: z.enum(['pending', 'completed', 'cancelled', 'shipping', 'processing']),
        productId: z.number().int().min(1).optional()
    })
});

module.exports = {
    searchProducts,
    checkStock,
    lookupOrders,
    getOrderDetails,
    getTopProducts,
    getCustomerOverview,
    getAbandonedCarts,
    getSalesByStatus,
    getSalesSummary,
    getOrdersByStatusWithItems
};
