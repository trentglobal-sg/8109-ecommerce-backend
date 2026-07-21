const orderData = require('../data/orderData');

async function createOrder(userId, orderItems) {
    return await orderData.createOrder(userId, orderItems);
}

async function updateOrderStatus(orderId, status) {
    const oldOrder = await orderData.getOrder(orderId);
    await orderData.updateOrderStatus(orderId, status);
    if (oldOrder.status != "processing" && status === "processing") {
        console.log("Order's status has been changed to process. Tell people to start shipping the product")
    }
}

async function updateOrderSessionId(orderId, sessionId) {
    return await orderData.updateOrderSessionId(orderId, sessionId);
}

module.exports = {
    createOrder,
    updateOrderSessionId,
    updateOrderStatus
}