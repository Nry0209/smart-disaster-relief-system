const express = require('express');
const router = express.Router();

// Placeholder routes for partner management
// TODO: Implement with actual controllers

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Partners endpoint - Coming soon',
    data: []
  });
});

router.post('/', (req, res) => {
  res.json({
    success: true,
    message: 'Create partner - Coming soon',
    data: null
  });
});

module.exports = router;
