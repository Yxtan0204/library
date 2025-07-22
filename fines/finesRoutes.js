const express = require('express');
const router = express.Router();
const finesController = require('./finesController');

router.get('/', finesController.getFines);

module.exports = router;
