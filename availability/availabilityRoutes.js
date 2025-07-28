
const express = require('express');
const router = express.Router();
const availabilityController = require('./availabilityController');

router.get('/availability', availabilityController.getAllAvailability);
router.post('/addAvailability', availabilityController.addAvailability);
router.get('/editAvailability/:id', availabilityController.editAvailabilityForm);
router.post('/updateAvailability/:id', availabilityController.updateAvailability);
router.get('/deleteAvailability/:id', availabilityController.deleteAvailability);
router.get('/searchAvailability', availabilityController.searchAvailability);

module.exports = router;
