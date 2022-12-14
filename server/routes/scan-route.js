const express = require('express');
const scanController = require('../controller/scan-controller');

const router = express.Router();

router.post('/scan/:scanTehn', scanController.getScanData);
router.post('/network-env/:recTehn', scanController.getNetworkEnv);
router.post('/network-testing/:recTehn', scanController.getNetworkEnvTesting);
router.get('/reset-iteratii', scanController.resetIteratii);
router.delete('/delete-cellid', scanController.deleteScanCellid);

module.exports = router;