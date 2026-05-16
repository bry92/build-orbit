const express = require('express');

function createNuclearRouter() {
  const router = express.Router();
  router.post('/chat', (req, res) => res.status(501).json({ success: false, message: 'Nuclear agent is not available in this checkout' }));
  return router;
}

module.exports = { createNuclearRouter };
