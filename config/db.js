// config/db.js
const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'ozitwa.h.filess.io',
    port: 3307,
    user: 'CA2library_fallennor',
    password: '377ad025e1933d3d05d3ee6580696b0f225b1daf',
    database: 'CA2library_fallennor',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;
