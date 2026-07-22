const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt')
const userServices = require('../../services/userServices');
const jwt = require('jsonwebtoken');
const requireAdmin = require('../middlewares/requireAdmin');
const { askChatbot } = require('../chatbot-agent/agent')

router.get('/', [requireAdmin], (req, res) => {
    res.render('dashboard', {
        admin: {
            name: 'Temporary Admin',
            email: 'admin@example.com',
            role: 'admin'
        },
        openChat: false
    });
});

router.get('/login', (req, res) => {
    res.render('login', {
        error: null
    });
})

router.post('/login', async (req, res) => {

    const { email, password } = req.body;

    try {

        const user = await userServices.getUserByEmail(email);
        const isValidPassword = user && await bcrypt.compare(password, user.password);

        if (!user || !isValidPassword || user.role !== 'admin') {
            return res.status(401).render('login', { error: 'Invalid admin email or password' });
        }

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '4h' });
        res.setHeader('Set-Cookie', `adminToken=${encodeURIComponent(token)};HttpOnly; SameSite=Lax; Max-Age=14400`)
        res.redirect('/admin')

    } catch (e) {
        console.error(e);
        res.status(500).render("login", {
            error: "Unable to log in"
        })
    }
})

router.get('/chat', requireAdmin, (req, res) => {
    res.render('dashboard', { admin: req.admin, openChat: true });
});

router.post('/chat', requireAdmin, express.json(), async (req, res) => {
    const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    try {
        const response = await askChatbot(message);
        res.json({
            response
        })

    } catch (e) {
        console.error(e);
        res.status(500).json({
            'error': "Unable to get reply from chatbot"
        })
    }
});

module.exports = router;