const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.render('dashboard', {
        admin: {
            name: 'Temporary Admin',
            email: 'admin@example.com',
            role: 'admin'
        },
        openChat: false
    });
});

router.get('/login', (req,res)=>{
    res.render('login', {
        error: null
    });
})

router.post('/login', async (req,res)=>{
    console.log("Login form recieved", req.body);
    res.send("Logn form recieved");
})  

module.exports = router;