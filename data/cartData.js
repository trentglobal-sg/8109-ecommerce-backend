const pool = require('../database');

async function getCartContents(userId) {
    const sql = `SELECT 
                    cart_items.id,
                    cart_items.product_id,
                    products.name,
                    CAST (products.price AS DOUBLE) AS price,
                    products.imageUrl,
                    products.description,
                    cart_items.quantity
                FROM 
                cart_items JOIN products
                    ON cart_items.product_id = products.id
                WHERE cart_items.user_id = ?`

    const [rows] = await pool.execute(sql, [userId]);
    return rows;
}

/**
 * 
 * @param {number} userId 
 * @param {[
 *  {
 *    product_id: number,
 *    quantity: number
 *  }
 * ]} cartItems 
 */
async function updateCart(userId, cartItems) {

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. delete everything from the user's shopping cart
        await connection.execute("DELETE FROM cart_items WHERE user_id = ?", [userId]);

        // 2. go through  cartItems and reinsert everything
        for (let item of cartItems) {
            await connection.execute(`INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)`,
                [userId, item.product_id, item.quantity])
        }

        await connection.commit();
    } catch (e) {
        await connection.rollback();
        console.error(e);
        throw (e);
    } finally {
        await connection.release();
    }


}

module.exports = {
    getCartContents, updateCart
}