const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const pool = require('../../database');

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 
 * @param {{
 * query: String}} input Parameters
 * @returns 
 */
async function runSearchProducts(input) {
    const searchTerm = '%' + input.query + '%';
    const [rows] = await pool.execute(
        `SELECT id, name, price, stock, description
         FROM products
         WHERE name LIKE ? OR description LIKE ?
         ORDER BY name
         LIMIT ?`,
        [searchTerm, searchTerm, input.limit]
    );
    return JSON.stringify(rows);
}

// the first argument of tool:
// the function you want to run
// the second argument:
// the description of the function
const searchProducts = tool(runSearchProducts, {
    name: 'search_products',
    description: 'Search the product catalog by product name or description. Returns id, name, price, stock, and description.',
    // the `input` sent to the runSearchproducts is an object with two keys: query and limit
    schema: z.object({
        query: z.string().min(1),
        limit: z.number().int().min(1).max(20).default(10)
    })
});

async function runCheckStock(input) {
    const [rows] = await pool.execute(
        `SELECT id, name, price, stock
         FROM products
         WHERE id = ?`,
        [input.productId]
    );
    if (rows.length === 0) {
        return JSON.stringify({ error: 'No product found with id ' + input.productId });
    }
    return JSON.stringify(rows[0]);
}

const checkStock = tool(runCheckStock, {
    name: 'check_stock',
    description: 'Get the current stock level for a single product by its product id. Use search_products first if you only know the product name.',
    schema: z.object({
        productId: z.number().int().min(1)
    })
});

module.exports = {
    searchProducts,
    checkStock
};