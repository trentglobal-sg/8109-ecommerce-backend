const express = require('express');
const cors = require('cors'); // enable cross origin resources sharing
require('dotenv').config();

const pool = require('./database');
const app = express();

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


app.get('/health', async function(req,res){
  res.json({
    'message':"Working fine"
  })
})

// register the router
app.use('/api/products', productRouter);
app.use('/api/users', userRouter);
app.use('/api/cart', cartRouter);
app.use('/api/checkout', checkoutRouter);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});