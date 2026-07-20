const userData = require('../data/userData');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

async function getUserByEmail(email) {
    return await userData.getUserByEmail(email);
}

async function getUserById(id) {
    return await userData.getUserById(id)
}

/**
 * 
 * @param {{
 *  name: string,
 *  email: string,
 *  password: string,
 *  salutation: string,
 *  country: string,
 *  marketingPrefrences: string[]
 * }} user 
 * @returns {Promise<Object>}
 */
async function createUser(user) {

    const hashedPassword = await bcrypt.hash(user.password, 10);
    // user.password = hashedPassword;

    return await userData.createUser({...user, password: hashedPassword});
}

async function loginUser(email, password) {
    // 1. get the user by their email
    const user = await userData.getUserByEmail(email);
    if (!user) {
        throw new Error("Invalid email or password");
    }

    // 2. check if the password is valid
    // bcrypt.compare(plain password, hashed password)
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new Error("Invalid email or password");
    }

    // 3. if password is valid then create the JWT
    const token = jwt.sign({
        userId: user.id
    }, process.env.JWT_SECRET, {
        expiresIn: "4w"
    })

    // 4. return JWT
    return token;

}

async function updateUser(id, newUserDetails) {
    await userData.updateUser(id, newUserDetails);
}

module.exports = {createUser, loginUser, getUserByEmail, getUserById, updateUser}