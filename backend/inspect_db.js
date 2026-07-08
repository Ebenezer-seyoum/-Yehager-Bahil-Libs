import pg from 'pg';

const connectionString = 'postgres://postgres:kXd9f61H0cCe2nRJe9PacddqnEOG0zv581tBaPq0hShsAUOjY5ZaiMKSByN1BM8F@adi1gektho1tgs12yjn9fg89:5432/postgres';
const client = new pg.Client({ connectionString });

async function main() {
  try {
    await client.connect();
    const res = await client.query('SELECT id, email, name, role, password_hash, length(password_hash) as len FROM users');
    console.log('--- USERS ---');
    console.log(JSON.stringify(res.rows, null, 2));

    const pendingRes = await client.query('SELECT email, name, password_hash, length(password_hash) as len FROM pending_customer_registrations');
    console.log('--- PENDING REGISTRATIONS ---');
    console.log(JSON.stringify(pendingRes.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
