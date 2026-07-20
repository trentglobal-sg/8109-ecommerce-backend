const pool = require('../database');

async function getUserByEmail(email) {

    if (!email) {
        throw new Error("Invalid email");
    }

    const sql = "SELECT * FROM users WHERE email = ?";
    const [rows] = await pool.execute(sql, [email]);
    return rows[0] || null;
}

async function getUserById(id) {
    if (!id) {
        throw new Error("Invalid ID");
    }

    const sql = "SELECT * FROM users WHERE id = ?";
    const [rows] = await pool.execute(sql, [id]);
    const user = rows[0];

    if (user) {
        const marketingSql = "SELECT preference_id FROM user_marketing_preferences WHERE user_id = ?";
        const [marketingRows] = await pool.execute(marketingSql, [id]);
        const preferences = marketingRows.map(item => String(item.preference_id));
        user.marketingPreferences = preferences;
    }


    return user || null;
}

// use array destructuring to extract the various keys
// from object passed to createUser
// the object must be of the following shape
// - name
// - email
// - password
// - salutation
// - country
async function createUser({ name, email, password, salutation, country, marketingPreferences }) {

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        // 1. Create the user
        const createUserSql = `INSERT INTO users (
            name, email, password, salutation, country
        ) VALUES (?, ?, ?, ?, ?)`;

        const [userResult] = await connection.execute(createUserSql, [
            name, email, password, salutation, country
        ])

        // get the id of newly inserted row
        const newUserId = userResult.insertId;

        // 2. For each marketing preference the user has selected
        // insert into the user_marketing_prefrences table as one row
        for (let marketing_preference_id of marketingPreferences) {
            const sql = `INSERT INTO user_marketing_preferences (user_id, preference_id)
                VALUES (?, ?)
            `
            await connection.execute(sql, [newUserId, marketing_preference_id])
        }
        await connection.commit();
        return newUserId;
    } catch (e) {
        await connection.rollback();
        console.error(e);
        throw (e);
    } finally {
        await connection.release();
    }


}

async function updateUser(id, { name, email, salutation, country, marketingPreferences }) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Update the user
        const sql = `UPDATE users SET name=?, email=?, salutation=?, country=? WHERE id = ?`;
        await connection.execute(sql, [name, email, salutation, country, id]);

        // 2. Update the marketing preferences
        // 2a. delete all the existing marketing preferences for the user
        await connection.execute("DELETE FROM user_marketing_preferences WHERE user_id = ?", [id]);

        // 2b. reinsert all the marketing preferences
         for (let marketing_preference_id of marketingPreferences) {
            const sql = `INSERT INTO user_marketing_preferences (user_id, preference_id)
                VALUES (?, ?)
            `
            await connection.execute(sql, [id, marketing_preference_id])
        }
        await connection.commit();

    } catch (e) {
        await connection.rollback();
        console.error(e);
        throw(e)
    } finally {
        await connection.release();
    }
}

module.exports = {
    getUserByEmail,
    getUserById,
    createUser,
    updateUser
}