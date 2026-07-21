const express = require('express');
const path = require('path');
const cors = require('cors'); // enable cross origin resources sharing
require('dotenv').config();

const pool = require('./database');
const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'admin', 'views'));
app.use('/admin/assets', express.static(path.join(__dirname, 'admin', 'public')));

// enable cross origin resources sharing
app.use(cors());

// parse json bodies
app.use(express.json());

// parse urlencoded bodies
app.use(express.urlencoded({ extended: true }));

// TODO: routes
const productRouter = require('./routes/products');
const userRouter = require('./routes/users');
const cartRouter = require('./routes/cart');
const checkoutRouter = require('./routes/checkout');
const stripeRouter = require('./routes/stripe');
const adminRouter = require('./admin/routes');

app.get('/health', async function(req,res){
  res.json({
    'message':"Working fine"
  })
})

// register the router
app.use('/api/products', express.json(), productRouter);
app.use('/admin', adminRouter);
app.use('/api/users', express.json(), userRouter);
app.use('/api/cart', express.json(), cartRouter);
app.use('/api/checkout', express.json(), checkoutRouter);
app.use('/stripe', stripeRouter);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});