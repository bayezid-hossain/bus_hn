const express = require('express');
const { registerBus } = require('../controllers/busController');

const router = express.Router();

router.route('/api/v1/bus/add').post(registerBus);

module.exports = router;
