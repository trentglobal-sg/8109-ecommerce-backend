const express = require('express');
const router = express.Router();

const userServices = require('../services/userServices')
const AuthenticateWithJWT = require('../middlewares/AuthenticateWithJWT')

router.post('/register', async (req, res) => {
    try {
        /**
         * req.body must be 
         * {
        *  name: string,
        *  email: string,
        *  password: string,
        *  salutation: string,
        *  country: string,
        *  marketingPrefrences: string[]
        * }
         */
        const newUserId = await userServices.createUser(req.body);
        res.json({
            newUserId
        })

    } catch (error) {
        res.status(500).json({
            error: error.message
        })
    }

});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const token = await userServices.loginUser(email, password);
        res.json({
            message: "Login successful",
            token
        })
    } catch (e) {
        res.json({
            'error': e
        })
    }
});

router.get('/me', [AuthenticateWithJWT], async (req, res) => {
    const userId = req.userId;
    const user = await userServices.getUserById(userId);
    res.json({
        ...user, password: null
    });
});

router.put('/me', [AuthenticateWithJWT], async (req, res) => {
    try {
        const userId = req.userId;
        await userServices.updateUser(userId, req.body);
        res.json({
            'message': "User has been updated"
        })
    } catch (e) {
        res.status(500).json({
            'error': e
        })
    }

})

module.exports = router;