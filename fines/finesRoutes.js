const express = require('express');
const router = express.Router();
const finesController = require('./finesController');

// ✅ Middleware to block non-logged-in users
function checkAuthenticated(req, res, next) {
    if (req.session && req.session.user) return next();

    req.flash('error', 'Please log in to view your fines.');
    res.redirect('/login');
}

router.get('/', checkAuthenticated, finesController.getFines);

module.exports = router;
