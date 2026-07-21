const cartData = require('../data/cartData');

/**
 * 
 * @param {*} userId 
 * @returns {[
 *  {
 *    id: integer,
 *    product_id: integer,
 *    name: string,
 *    price: number,
 *    description: string,
 *    quantity: number
 *  }
 * ]}
 */
async function getCartContents(userId) {
    return await cartData.getCartContents(userId);
}

async function updateCart(userId, cartItems) {
    await cartData.updateCart(userId, cartItems);
}

module.exports = {
    getCartContents, updateCart
}