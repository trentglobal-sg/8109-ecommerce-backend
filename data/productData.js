const pool = require('../database');

// All the CRUd are in the data layers

async function getAllProducts() {
    const [rows] = await pool.execute(
        `SELECT id, name, CAST(price AS DOUBLE) AS price, imageUrl, description FROM products`
    );
    return rows;
}

async function getProductById(id) {
    const [rows] = await pool.execute(
        `SELECT * FROM products WHERE id = ?`, [id]
    );
    return rows[0];
}

async function getLatestProducts(limit = 10) {
        const [rows] = await pool.execute(
        `SELECT id, name, CAST(price AS DOUBLE) AS price, imageUrl, description 
            FROM products
            ORDER BY id DESC
            LIMIT ?    
        `, [limit]
    );
    return rows;
}

// TODO: Create a new product

// TODO: Modify an existing product

// TODO: Delete an existing product

module.exports = {
    getAllProducts, getProductById, getLatestProducts
}