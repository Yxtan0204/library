const pool = require('../config/db');

exports.getFines = (req, res) => {
    if (!req.session || !req.session.user) {
        req.flash('error', 'Please log in to view your fines.');
        return res.redirect('/login');
    }

    const query = 'SELECT * FROM UserMonthlyFines WHERE user_name = ?';
    const username = req.session.user.username;

    pool.query(query, [username], (err, results) => {
        if (err) {
            console.error("DB Error:", err);
            return res.status(500).send("Server error");
        }

        res.render('fines', {
            fines: results,
            user: req.session.user
        });
    });
};
