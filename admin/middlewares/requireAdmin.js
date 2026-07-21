const jwt = require('jsonwebtoken');
const userData = require('../../data/userData');

function getAdminToken(req) {
    const cookies = req.headers.cookie?.split(';').map((cookie) => cookie.trim()) || [];
    const adminToken = cookies.find((cookie) => cookie.startsWith('adminToken='));
    return adminToken ? decodeURIComponent(adminToken.slice('adminToken='.length)) : null;
}

async function requireAdmin(req, res, next) {
    const token = getAdminToken(req);

    if (!token) {
        return res.redirect('/admin/login');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userData.getUserById(decoded.userId);

        if (!user || user.role !== 'admin') {
            return res.redirect('/admin/login');
        }

        req.admin = user;
        next();
    } catch (error) {
        res.setHeader('Set-Cookie', 'adminToken=; HttpOnly; SameSite=Lax; Max-Age=0');
        return res.redirect('/admin/login');
    }
}

module.exports = requireAdmin;
