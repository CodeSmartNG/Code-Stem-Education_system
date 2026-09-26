// backend/routes/multimedia.js
const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
  console.log('📤 Multimedia received:', req.body);
  res.status(201).json({
    success: true,
    message: 'Multimedia received',
    data: { _id: Date.now().toString(), ...req.body }
  });
});

router.get('/lesson/:lessonId', (req, res) => {
  res.json({ success: true, data: [], multimedia: [] });
});

router.delete('/:id', (req, res) => {
  res.json({ success: true, message: 'Multimedia deleted' });
});

module.exports = router;
