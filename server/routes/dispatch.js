const express = require('express');
const router = express.Router();

// Placeholder routes for dispatch management
// TODO: Implement with actual controllers

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Dispatch endpoint - Coming soon',
    data: []
  });
});

router.post('/', (req, res) => {
  res.json({
    success: true,
    message: 'Create dispatch - Coming soon',
    data: null
  });
});

module.exports = router;
