const express = require('express');
const { route } = require('./checkout');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const orderServices = require('../services/orderServices');

// Webhook for stripe
// we have been using express.json() to process JSON requests it will
// mess the signature that we are using for verification, so for the webhook
// calls, we must use express.raw instead
router.post('/webhook', express.raw({ type:'application/json'}),  async function(req,res){
    let event = null;
    try {
        const signature = req.headers['stripe-signature'];
        event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);

    } catch (e) {
        console.error(e);
        res.status(500).json({
            error: e.message
        })
    }

    if (event.type == "checkout.session.completed") {
        console.log("payment recieved");
        const session = event.data.object;
        console.log(session.metadata);
        orderServices.updateOrderStatus(session.metadata.orderId, "processing");
    }

    res.json({
        recieved: true
    })
})

module.exports = router;