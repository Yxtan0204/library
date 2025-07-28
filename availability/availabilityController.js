
const db = require('../database');

// Get all availability records
exports.getAllAvailability = (req, res) => {
    db.query('SELECT * FROM availability', (err, results) => {
        if (err) throw err;
        res.render('availability', { availability: results });
    });
};

// Add availability record
exports.addAvailability = (req, res) => {
    const { book_id, publisher_id } = req.body;
    db.query('INSERT INTO availability (book_id, publisher_id) VALUES (?, ?)', 
        [book_id, publisher_id], (err) => {
        if (err) throw err;
        res.redirect('/availability');
    });
};

// Edit availability form
exports.editAvailabilityForm = (req, res) => {
    const id = req.params.id;
    db.query('SELECT * FROM availability WHERE id = ?', [id], (err, results) => {
        if (err) throw err;
        res.render('editAvailability', { availability: results[0] });
    });
};

// Update availability
exports.updateAvailability = (req, res) => {
    const id = req.params.id;
    const { book_id, publisher_id } = req.body;
    db.query('UPDATE availability SET book_id = ?, publisher_id = ? WHERE id = ?', 
        [book_id, publisher_id, id], (err) => {
        if (err) throw err;
        res.redirect('/availability');
    });
};

// Delete availability
exports.deleteAvailability = (req, res) => {
    const id = req.params.id;
    db.query('DELETE FROM availability WHERE id = ?', [id], (err) => {
        if (err) throw err;
        res.redirect('/availability');
    });
};

// Search availability
exports.searchAvailability = (req, res) => {
    const keyword = `%${req.query.q}%`;
    db.query(
        `SELECT * FROM availability WHERE book_id LIKE ? OR publisher_id LIKE ?`, 
        [keyword, keyword], 
        (err, results) => {
            if (err) throw err;
            res.render('availability', { availability: results });
        });
};
