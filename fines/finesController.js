const db = require('../config/db'); 

exports.getFines = (req, res) => {
    const query = 'SELECT * FROM UserMonthlyFines';

    db.query(query, (err, results) => {
        if (err) {
            console.error("DB Error:", err);
            return res.status(500).send("Server error");
        }
        res.render('fines', { fines: results }); 
    });
};
