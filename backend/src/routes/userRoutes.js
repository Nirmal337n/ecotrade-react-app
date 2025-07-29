const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Post = require('../models/Post');

const router = express.Router();

// Set up multer for file uploads
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Helper validation functions
const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);
const validatePhone = (phone) => /^\+?\d{10,15}$/.test(phone);

// Register
router.post('/register', upload.single('profilePicture'), async (req, res) => {
  const {
    firstName, lastName, address, phone, dateOfBirth, interests, gender, email, password, bio
  } = req.body;
  // Validate required fields
  if (!firstName || !lastName || !address || !phone || !dateOfBirth || !gender || !email || !password) {
    return res.status(400).json({ message: 'All required fields must be filled.' });
  }
  if (!validateEmail(email)) {
    return res.status(400).json({ message: 'Invalid email format.' });
  }
  if (!validatePhone(phone)) {
    return res.status(400).json({ message: 'Invalid phone number format.' });
  }
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      firstName,
      lastName,
      address,
      phone,
      dateOfBirth,
      interests: Array.isArray(interests) ? interests : (interests ? [interests] : []),
      gender,
      email,
      password: hashedPassword,
      bio,
      profilePicture: req.file ? `/uploads/${req.file.filename}` : undefined
    });
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Middleware to verify JWT and get user
const auth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) return res.status(404).json({ message: 'User not found' });
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Get current user profile
router.get('/me', auth, (req, res) => {
  const user = req.user.toObject();
  delete user.password;
  res.json(user);
});

// Update current user profile
router.put('/me', auth, upload.single('profilePicture'), async (req, res) => {
    try {
        const { firstName, lastName, address, phone, dateOfBirth, interests, bio } = req.body;
        const updatedData = {
            firstName, lastName, address, phone, dateOfBirth, bio,
            interests: Array.isArray(interests) ? interests : (interests ? [interests] : []),
        };

        if (req.file) {
            updatedData.profilePicture = `/uploads/${req.file.filename}`;
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updatedData },
            { new: true, runValidators: true }
        ).select('-password');

        res.json(updatedUser);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get public user profile by ID
router.get('/:userId', auth, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get recommended posts for a user based on similar users
router.get('/:id/recommended-posts', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    // Get posts from similar users
    const posts = await Post.find({ user: { $in: user.similarUsers } });
    // Score posts by user's tagVector
    const tagVector = user.tagVector || new Map();
    const scoredPosts = posts.map(post => {
      let score = 0;
      if (Array.isArray(post.tags)) {
        post.tags.forEach(tag => {
          score += tagVector.get(tag) || 0;
        });
      }
      return { post, score };
    });
    scoredPosts.sort((a, b) => b.score - a.score);
    res.json(scoredPosts.map(sp => sp.post));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router; 