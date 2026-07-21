const orderData = require('../data/orderData');

async function createOrder(userId, orderItems) {
    return await orderData.createOrder(userId, orderItems);
}

module.exports = {
    createOrder
}