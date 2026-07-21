const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function createCheckoutSession(userId, orderItems, orderId) {
  // 1. create line order items
  const lineItems = await createLineItems(orderItems);
 console.log(lineItems);
  // 2. create the stripe session
  const session = await stripe.checkout.sessions.create({
    payment_method_types:['card'],
    line_items: lineItems,
    mode: 'payment',
    success_url: "https://www.google.com",
    cancel_url: "https://www.yahoo.com",
    metadata: {
        userId, orderId
    }
  })
  return session;
}

/**
 * 
 * @param {[
 *  name: string,
 *  price: number,
 *  descritpion: string,
 *  product_id: integer,
 *  quantity: integer
 * ]} orderItems 
 * @returns 
 */
async function createLineItems(orderItems) {
    const lineItems = [];
    for (let item of orderItems) {
        // create a Stripe line item, according to Stripe LineItem API
        // link: stripe.com/docs/api/checkout/sessions/create#create_checkout_session-line_items

        const lineItem = {
            price_data: {
                'currency':'sgd',
                // convert price to cents
                'unit_amount': Math.round(item.price * 100),
                'product_data': {
                    'name': item.name,
                    'description': item.description,
                    'images': [item.imageUrl || 'https://placehold.co/600x400'],
                    'metadata': {
                        'product_id': item.product_id
                    }
                }
            },
            quantity: item.quantity
        }
        lineItems.push(lineItem);
    }
    return lineItems;
}

module.exports = {
    createCheckoutSession
}