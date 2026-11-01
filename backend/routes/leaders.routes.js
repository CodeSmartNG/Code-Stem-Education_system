import { Router } from 'express';
import Leader from '../models/Leader.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { upload } from '../config/cloudinary.js';

const router = Router();

// Get all leaders (Public)
router.get('/', async (req, res, next) => {
  try {
    const leaders = await Leader.find().sort({ createdAt: -1 });
    res.json(leaders);
  } catch (err) {
    next(err);
  }
});

// Add a new leader (StateAdmin only)
router.post('/', authenticate, authorize('stateAdmin'), upload.single('image'), async (req, res, next) => {
  try {
    const { name, title } = req.body;
    if (!req.file) return res.status(400).json({ message: 'Image is required' });

    const leader = await Leader.create({
      name,
      title,
      imageUrl: req.file.path, // Cloudinary URL
    });

    res.status(201).json(leader);
  } catch (err) {
    next(err);
  }
});

// Delete a leader (StateAdmin only)
router.delete('/:id', authenticate, authorize('stateAdmin'), async (req, res, next) => {
  try {
    await Leader.findByIdAndDelete(req.params.id);
    res.json({ message: 'Leader removed' });
  } catch (err) {
    next(err);
  }
});

export default router;
