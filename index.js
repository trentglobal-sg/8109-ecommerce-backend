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


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});