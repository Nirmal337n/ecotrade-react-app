const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');

const router = express.Router();

// Auth middleware (reuse from userRoutes if possible)
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

// Multer setup for post images
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Create a post
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { content, visibility = 'public', context, tags } = req.body;
    if (!content) return res.status(400).json({ message: 'Content is required' });
    const post = await Post.create({
      user: req.user._id,
      content,
      image: req.file ? `/uploads/${req.file.filename}` : undefined,
      visibility,
      context,
      tags: tags ? JSON.parse(tags) : []
    });
    // Update tagVector for the creator
    if (Array.isArray(post.tags)) {
      post.tags.forEach(tag => {
        req.user.tagVector.set(tag, (req.user.tagVector.get(tag) || 0) + 1);
      });
      await req.user.save();
    }
    console.log('Post saved:', post);
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Fetch posts with filtering and privacy
router.get('/', auth, async (req, res) => {
  try {
    const { visibility, user, keyword, since } = req.query;
    let filter = {};
    
    // Filtering
    if (user) filter.user = user;
    if (keyword) filter.content = { $regex: keyword, $options: 'i' };
    if (since) filter.createdAt = { $gte: new Date(since) };
    
    // Privacy logic
    if (user) {
      // If filtering by specific user, show all their posts (including private ones) to the user themselves
      if (user === req.user._id.toString()) {
        // User viewing their own posts - show all
      } else {
        // User viewing someone else's posts - only show public
        filter.visibility = 'public';
      }
    } else {
      // Handle different visibility filters
      if (visibility === 'friends') {
        // Get posts from friends only
        const user = await User.findById(req.user._id).populate('friends');
        const friendIds = user.friends.map(friend => friend._id);
        filter.user = { $in: friendIds };
        filter.visibility = { $in: ['public', 'friends'] };
      } else if (visibility === 'public') {
        // Show only public posts
        filter.visibility = 'public';
      } else if (visibility) {
        // For any other visibility filter
        filter.visibility = visibility;
      } else {
        // Default: show public posts
        filter.visibility = 'public';
      }
    }
    
    const posts = await Post.find(filter)
      .populate('user', 'firstName lastName profilePicture')
      .populate('comments.user', 'firstName lastName profilePicture')
      .populate('comments.replies.user', 'firstName lastName profilePicture')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Like/unlike a post
router.post('/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const userId = req.user._id;
    const liked = post.likes.includes(userId);
    
    if (liked) {
      post.likes.pull(userId);
      // Remove notification if unliking
      await Notification.findOneAndDelete({
        recipient: post.user,
        sender: userId,
        post: post._id,
        type: 'like'
      });
    } else {
      post.likes.push(userId);
      // Update tagVector for the liker
      if (Array.isArray(post.tags)) {
        post.tags.forEach(tag => {
          req.user.tagVector.set(tag, (req.user.tagVector.get(tag) || 0) + 1);
        });
        await req.user.save();
      }
      // Create notification for like (only if not liking own post)
      if (!post.user.equals(userId)) {
        await Notification.create({
          recipient: post.user,
          sender: userId,
          post: post._id,
          type: 'like'
        });
      }
    }
    await post.save();
    res.json({ liked: !liked, likesCount: post.likes.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a comment
router.post('/:id/comment', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'Comment text is required' });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    
    const comment = { user: req.user._id, text };
    post.comments.push(comment);
    await post.save();
    
    // Update tagVector for the commenter
    if (Array.isArray(post.tags)) {
      post.tags.forEach(tag => {
        req.user.tagVector.set(tag, (req.user.tagVector.get(tag) || 0) + 1);
      });
      await req.user.save();
    }
    
    // Create notification for comment (only if not commenting on own post)
    if (!post.user.equals(req.user._id)) {
      await Notification.create({
        recipient: post.user,
        sender: req.user._id,
        post: post._id,
        type: 'comment',
        content: text
      });
    }
    
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Reply to a comment
router.post('/:id/comment/:commentId/reply', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'Reply text is required' });
    
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    
    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    
    // Add reply to the comment
    if (!comment.replies) comment.replies = [];
    comment.replies.push({ 
      user: req.user._id, 
      text,
      createdAt: new Date()
    });
    
    await post.save();
    
    // Create notification for reply (only if not replying to own comment)
    if (!comment.user.equals(req.user._id)) {
      await Notification.create({
        recipient: comment.user,
        sender: req.user._id,
        post: post._id,
        type: 'reply',
        content: text,
        commentId: comment._id
      });
    }
    
    // Populate user info for the response
    await post.populate('comments.user', 'firstName lastName profilePicture');
    await post.populate('comments.replies.user', 'firstName lastName profilePicture');
    
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update a comment (author only)
router.put('/:id/comment/:commentId', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'Comment text is required' });
    
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    
    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    
    // Check if user is the author of the comment
    if (!comment.user.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to edit this comment' });
    }
    
    // Update the comment text
    comment.text = text;
    
    await post.save();
    
    // Populate user info for the response
    await post.populate('comments.user', 'firstName lastName profilePicture');
    await post.populate('comments.replies.user', 'firstName lastName profilePicture');
    
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete a post (author only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (!post.user.equals(req.user._id)) return res.status(403).json({ message: 'Not authorized' });
    await post.deleteOne();
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Report a post
router.post('/:id/report', auth, async (req, res) => {
  // For now, just acknowledge the report
  res.json({ message: 'Post reported. Thank you!' });
});

// Update a post (author only, supports image upload)
router.put('/:id', auth, upload.single('image'), async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (!post.user.equals(req.user._id)) return res.status(403).json({ message: 'Not authorized' });

    // Update fields if provided
    if (req.body.content) post.content = req.body.content;
    if (req.body.context) post.context = req.body.context;
    if (req.body.visibility) post.visibility = req.body.visibility;
    if (req.body.tags) post.tags = JSON.parse(req.body.tags);
    if (req.file) post.image = `/uploads/${req.file.filename}`;

    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router; 