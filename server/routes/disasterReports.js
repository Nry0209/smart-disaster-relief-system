const express = require('express');
const router = express.Router();

// Placeholder routes for disaster reports
// TODO: Implement with actual controllers

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Disaster reports endpoint - Coming soon',
    data: []
  });
});

router.post('/', (req, res) => {
  res.json({
    success: true,
    message: 'Create disaster report - Coming soon',
    data: null
  });
});

module.exports = router;
