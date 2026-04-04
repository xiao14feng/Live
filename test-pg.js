const { Client } = require('./live-gateway-main/node_modules/pg');
const client = new Client({
    connectionString: 'postgresql://postgres:AXEluapKUwGzOlHEYJSHZrysYYVfnHNz@junction.proxy.rlwy.net:35905/railway',
    ssl: { rejectUnauthorized: false }
});
client.connect()
    .then(() => {
        console.log('Connected OK');
        return client.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
    })
    .then(r => {
        const tables = r.rows.map(x => x.tablename);
        console.log('Tables:', tables.length ? tables.join(', ') : '(none - empty DB)');
        client.end();
    })
    .catch(e => {
        console.log('Error:', e.message);
        process.exit(1);
    });
