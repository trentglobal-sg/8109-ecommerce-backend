const pool = require('../database');


async function getOrdersByUserId(userId) {
    const [rows] = await pool.execute('SELECT * FROM orders WHERE user_id = ?', [userId]);
    return rows;
}

/**
 * 
 * @param {integer} userId ID of the User
 * @param {[
 *  {
 *    product_id: integer,
 *    quantity: integer,
 *    price: double
 *  }
 * 
 * ]
 * } orderItems Array of products the user is purchasing
 */
async function createOrder(userId, orderItems) {

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // create the order
        let total = 0;
        for (let item of orderItems) {
            total += item.price * item.quantity;
        }

        const sql = `INSERT INTO orders (
          user_id,
          total
        ) VALUES (?, ?)`

        const [results] = await connection.execute(sql, [userId, total]);
        const newOrderId = results.insertId;

        // insert the order items
        for (let item of orderItems) {
            const sql = `INSERT INTO order_items 
                (order_id, product_id, quantity) VALUES (?, ?, ?)
                `;
            await connection.execute(sql, [newOrderId, item.product_id, item.quantity]);
        }

        await connection.commit();
        return newOrderId;

    } catch (e) {
        await connection.rollback();
        console.error(e);
        throw e;
    } finally {
        await connection.release();
    }

}

async function getOrder(orderId) {
        const sql = `
        SELECT * FROM orders 
        WHERE orders.id = ?
    `;

    const [orders] = await pool.execute(sql, [orderId]);
    return orders;
}

async function getOrderDetails(orderId) {
    const sql = `
        SELECT * FROM orders JOIN order_items ON orders.id = order_items.order_id
        WHERE orders.id = ?
    `;

    const [orders] = pool.execute(sql, [orderId]);
    return orders;
}

async function updateOrderStatus(orderId, status) {
    const sql = `UPDATE orders SET status = ? WHERE id = ?`;
    await pool.execute(sql, [status, orderId]);
}

async function updateOrderSessionId(orderId, sessionId) {
    const sql = `UPDATE orders SET checkout_session_id = ?
            WHERE id = ?
    `;

    await pool.execute(sql, [sessionId, orderId]);
}

module.exports = {
    createOrder,
    getOrderDetails,
    getOrdersByUserId,
    updateOrderSessionId,
    updateOrderStatus,
    getOrder
}