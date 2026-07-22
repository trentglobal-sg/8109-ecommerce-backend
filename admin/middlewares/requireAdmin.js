const jwt = require('jsonwebtoken');
const userServices = require('../../services/userServices');


async function requireAdmin(req, res, next) {

    const token = getAdminToken(req);

    if (!token) {
        return res.redirect('admin/login')
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userServices.getUserById(decoded.userId);

        if (!user || user.role !== "admin") {
            return res.redirect('admin/login')
        }

        req.admin = user;
        next();
    } catch (e) {
        console.error(e);
        res.setHeader('Set-Cookie', 'adminToken=; HttpOnly; SameSite=Lax; Max-Age=0');
        return res.redirect('/admin/login');

    }


}

function getAdminToken(req) {
    // format of a cookie: "key1=value1;key2=value2;key3=value3"
    // req.headers.cookies.split(";") => ["key1=value1", :"key2=value2", "key3=value3"]
    const cookies = req.headers.cookie?.split(";") || [];

    // let cookies = null;
    // if (req.headers.cookies) {
    //     cookies = req.heders.cookies.split(";")
    // } else {
    //     cookies = [];
    // }

    // .find is like filter
    // the biggest difference .filter will give you an array of all items that matches the criteria
    // but .find will return the only the first match
    const adminToken = cookies.find(function (cookie) {
        return cookie.startsWith("adminToken=");
    });
    

    if (adminToken) {
        return decodeURIComponent(adminToken.split("=")[1]);
    } else {
        return null;
    }
}

module.exports = requireAdmin;
