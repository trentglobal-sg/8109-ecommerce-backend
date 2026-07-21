const cartServices = require('../services/cartServices');
const orderServices = require('../services/orderServices');
const stripeServices = require('../services/stripeServices')

// begins the checkout process with the stripe
async function checkout(userId) {

        // 1. get the cart content of the user
        const cartContent = await cartServices.getCartContents(userId);
        // 2. create an order
        const orderId = await orderServices.createOrder(userId, cartContent);
        // 3. send the order to Stripe to get a check out session
        const checkoutSession = await stripeServices.createCheckoutSession(
            userId, cartContent, orderId
        )
       
        // 4. update the order to store the ID of the checkout session
        await orderServices.updateOrderSessionId(orderId, checkoutSession.id);
        // 5. return the checkout session
        return checkoutSession;


}

module.exports = { checkout}