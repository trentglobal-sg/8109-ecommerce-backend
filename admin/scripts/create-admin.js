const bcrypt = require('bcrypt');
const pool = require('../../database');

const [email, password, name = 'Administrator'] = process.argv.slice(2);

if (!email || !password) {
    console.error('Usage: node admin/scripts/create-admin.js <email> <password> [name]');
    process.exitCode = 1;
} else {
    async function createAdmin() {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = `
            INSERT INTO users (name, email, password, role)
            VALUES (?, ?, ?, 'admin')
            ON DUPLICATE KEY UPDATE name = VALUES(name), password = VALUES(password), role = 'admin'
        `;

        await pool.execute(sql, [name, email, hashedPassword]);
        console.log(`Admin user ready: ${email}`);
        await pool.end();
    }

    createAdmin().catch(async (error) => {
        console.error(error.message);
        await pool.end();
        process.exitCode = 1;
    });
}
