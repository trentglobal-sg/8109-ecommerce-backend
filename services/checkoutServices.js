const cartServices = require('../services/cartServices');
const orderServices = require('../services/orderServices');

// begins the checkout process with the stripe
async function checkout(userId) {

        // 1. get the cart content of the user
        const cartContent = await cartServices.getCartContents(userId);
        // 2. create an order
        const order = await orderServices.createOrder(userId, cartContent);
        // 3. send the order to Stripe to get a check out session
        // 4. update the order to store the ID of the checkout session
        // 5. return the checkout session
        return order;


}

module.exports = { checkout}