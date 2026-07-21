const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userData = require('../../data/userData');
const requireAdmin = require('../middlewares/requireAdmin');
const { askChatbot, resetChatSession } = require('../chatbot-agent/agent');

const router = express.Router();

router.get('/login', (req, res) => {
    res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await userData.getUserByEmail(email);
        const isValidPassword = user && await bcrypt.compare(password, user.password);

        if (!user || !isValidPassword || user.role !== 'admin') {
            return res.status(401).render('login', { error: 'Invalid admin email or password' });
        }

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '4h' });
        const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : '';
        res.setHeader('Set-Cookie', `adminToken=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Max-Age=14400${secureFlag}`);
        res.redirect('/admin');
    } catch (error) {
        res.status(500).render('login', { error: 'Unable to log in' });
    }
});

router.get('/', requireAdmin, (req, res) => {
    res.render('dashboard', { admin: req.admin, openChat: false });
});

router.get('/chat', requireAdmin, (req, res) => {
    resetChatSession();
    res.render('dashboard', { admin: req.admin, openChat: true });
});

router.post('/chat', requireAdmin, async (req, res) => {
    const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    try {
        const response = await askChatbot(message);
        res.json({ response });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'The chatbot could not answer right now' });
    }
});

router.post('/logout', (req, res) => {
    res.setHeader('Set-Cookie', 'adminToken=; HttpOnly; SameSite=Lax; Max-Age=0');
    res.redirect('/admin/login');
});

module.exports = router;
