const productData = require('../data/productData');

async function getAllProducts() {
    // TODO: business logic
    return await productData.getAllProducts();
}

async function getProductById(id) {
    // TODO: business logic
    return await productData.getProductById(id);
}

async function getLatestProducts(limit=10){
    // TODO: business logic
    return await productData.getLatestProducts(limit);
}

module.exports = {
    getAllProducts, getProductById, getLatestProducts
}