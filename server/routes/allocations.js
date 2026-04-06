const express = require('express');
const router = express.Router();

// Placeholder routes for allocation management
// TODO: Implement with actual controllers

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Allocations endpoint - Coming soon',
    data: []
  });
});

router.post('/', (req, res) => {
  res.json({
    success: true,
    message: 'Create allocation - Coming soon',
    data: null
  });
});

module.exports = router;
