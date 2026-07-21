const express = require('express');
const router = express.Router();

const cartServices = require('../services/cartServices');
const AuthenticateWithJWT = require('../middlewares/AuthenticateWithJWT');

router.get('/', [AuthenticateWithJWT], async function (req, res) {
    const userId = req.userId;
    const cart = await cartServices.getCartContents(userId);
    res.json(cart);
})


router.put('/', [AuthenticateWithJWT], async function (req, res) {
    try {
        const userId = req.userId;
        await cartServices.updateCart(userId, req.body.cartItems);
        res.json({
            'message': "Cart has been updated successfully"
        })
    } catch (e) {
        res.status(500).json({
            error: e.message
        })
    }

})

module.exports = router;