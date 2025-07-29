const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const Product = require('../models/Product');
const User = require('../models/User');
const Trade = require('../models/Trade');
const Category = require('../models/Category');
const Notification = require('../models/Notification');

const router = express.Router();

// Auth middleware
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

// Multer setup for product images
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Create a product
router.post('/', auth, upload.array('images', 10), async (req, res) => {
  try {
    const {
      title, type, sell_price, desired_item, condition, usage, location,
      delivery_type, payment, description, productGroup, minimum_price,
      valid_till, tags, contactInfo
    } = req.body;

    if (!title || !type || !condition || !location || !delivery_type || !description) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const imageFiles = req.files || [];
    const primaryImage = imageFiles.length > 0 ? `/uploads/${imageFiles[0].filename}` : null;
    const descriptiveImages = imageFiles.slice(1).map(file => `/uploads/${file.filename}`);

    const product = await Product.create({
      user: req.user._id,
      title,
      type,
      sell_price,
      desired_item,
      condition,
      usage,
      location,
      delivery_type,
      payment,
      description,
      productGroup,
      minimum_price,
      valid_till: valid_till ? new Date(valid_till) : null,
      primaryImage,
      descriptiveImages,
      tags: tags ? JSON.parse(tags) : [],
      contactInfo: contactInfo ? JSON.parse(contactInfo) : {}
    });

    await product.populate('user', 'firstName lastName profilePicture');
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all products with filtering
router.get('/', auth, async (req, res) => {
  try {
    const {
      type, condition, location, delivery_type, productGroup,
      minPrice, maxPrice, search, sortBy, sortOrder, page, limit,
      user, status
    } = req.query;

    let filter = { status: 'active' };
    
    // Apply filters
    if (type) filter.type = type;
    if (condition) filter.condition = condition;
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (delivery_type) filter.delivery_type = delivery_type;
    if (productGroup) filter.productGroup = productGroup;
    if (user) filter.user = user;
    if (status) filter.status = status;

    // Price filtering (for sell type)
    if (minPrice || maxPrice) {
      filter.sell_price = {};
      if (minPrice) filter.sell_price.$gte = minPrice;
      if (maxPrice) filter.sell_price.$lte = maxPrice;
    }

    // Search functionality
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
        { productGroup: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    // Sorting
    let sort = {};
    if (sortBy) {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    } else {
      sort.createdAt = -1; // Default sort by newest
    }

    // Pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const products = await Product.find(filter)
      .populate('user', 'firstName lastName profilePicture')
      .populate('comments.user', 'firstName lastName profilePicture')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    const total = await Product.countDocuments(filter);

    res.json({
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a single product
router.get('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('user', 'firstName lastName profilePicture')
      .populate('comments.user', 'firstName lastName profilePicture')
      .populate('comments.replies.user', 'firstName lastName profilePicture');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Add view to trade history
    if (!product.user.equals(req.user._id)) {
      product.tradeHistory.push({
        action: 'viewed',
        user: req.user._id,
        details: 'Product viewed'
      });
      // Increment activity.views
      product.activity = product.activity || { views: 0, clicks: 0, offers: 0 };
      product.activity.views = (product.activity.views || 0) + 1;
      await product.save();
    }

    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update a product
router.put('/:id', auth, upload.array('images', 10), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (!product.user.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updateData = { ...req.body };
    
    // Handle image updates
    if (req.files && req.files.length > 0) {
      const imageFiles = req.files;
      updateData.primaryImage = `/uploads/${imageFiles[0].filename}`;
      updateData.descriptiveImages = imageFiles.slice(1).map(file => `/uploads/${file.filename}`);
    }

    // Parse JSON fields
    if (updateData.tags) updateData.tags = JSON.parse(updateData.tags);
    if (updateData.contactInfo) updateData.contactInfo = JSON.parse(updateData.contactInfo);
    if (updateData.valid_till) updateData.valid_till = new Date(updateData.valid_till);

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('user', 'firstName lastName profilePicture');

    res.json(updatedProduct);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete a product
router.delete('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (!product.user.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await product.deleteOne();
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Like/unlike a product
router.post('/:id/like', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const userId = req.user._id;
    const liked = product.likes.includes(userId);

    if (liked) {
      product.likes.pull(userId);
      // Remove notification
      await Notification.findOneAndDelete({
        recipient: product.user,
        sender: userId,
        post: product._id,
        type: 'like'
      });
    } else {
      product.likes.push(userId);
      // Create notification
      if (!product.user.equals(userId)) {
        await Notification.create({
          recipient: product.user,
          sender: userId,
          post: product._id,
          type: 'like'
        });
      }
    }

    await product.save();
    res.json({ liked: !liked, likesCount: product.likes.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a comment to a product
router.post('/:id/comment', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'Comment text is required' });

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const comment = { user: req.user._id, text };
    product.comments.push(comment);
    await product.save();

    // Create notification
    if (!product.user.equals(req.user._id)) {
      await Notification.create({
        recipient: product.user,
        sender: req.user._id,
        post: product._id,
        type: 'comment',
        content: text
      });
    }

    await product.populate('comments.user', 'firstName lastName profilePicture');
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Reply to a comment
router.post('/:id/comment/:commentId/reply', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'Reply text is required' });

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const comment = product.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    if (!comment.replies) comment.replies = [];
    comment.replies.push({
      user: req.user._id,
      text,
      createdAt: new Date()
    });

    await product.save();

    // Create notification
    if (!comment.user.equals(req.user._id)) {
      await Notification.create({
        recipient: comment.user,
        sender: req.user._id,
        post: product._id,
        type: 'reply',
        content: text,
        commentId: comment._id
      });
    }

    await product.populate('comments.user', 'firstName lastName profilePicture');
    await product.populate('comments.replies.user', 'firstName lastName profilePicture');
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get user's products
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { status, type } = req.query;
    let filter = { user: req.params.userId };
    
    if (status) filter.status = status;
    if (type) filter.type = type;

    const products = await Product.find(filter)
      .populate('user', 'firstName lastName profilePicture')
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get categories
router.get('/categories/all', auth, async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .populate('subcategories')
      .sort({ sortOrder: 1, name: 1 });
    
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Search products
router.get('/search/advanced', auth, async (req, res) => {
  try {
    const {
      query, type, condition, location, minPrice, maxPrice,
      delivery_type, productGroup, sortBy, sortOrder, page, limit
    } = req.query;

    let filter = { status: 'active' };
    let sort = { createdAt: -1 };

    // Text search
    if (query) {
      filter.$text = { $search: query };
    }

    // Apply other filters
    if (type) filter.type = type;
    if (condition) filter.condition = condition;
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (delivery_type) filter.delivery_type = delivery_type;
    if (productGroup) filter.productGroup = productGroup;

    // Price filtering
    if (minPrice || maxPrice) {
      filter.sell_price = {};
      if (minPrice) filter.sell_price.$gte = minPrice;
      if (maxPrice) filter.sell_price.$lte = maxPrice;
    }

    // Sorting
    if (sortBy) {
      sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    }

    // Pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const products = await Product.find(filter)
      .populate('user', 'firstName lastName profilePicture')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    const total = await Product.countDocuments(filter);

    res.json({
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Increment product clicks (call this from frontend when a product is clicked for details)
router.post('/:id/click', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    product.activity = product.activity || { views: 0, clicks: 0, offers: 0 };
    product.activity.clicks = (product.activity.clicks || 0) + 1;
    await product.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Recommend top products based on activity-based filtering
router.get('/recommended', auth, async (req, res) => {
  try {
    const wv = 0.1, wc = 0.3, wo = 0.6;
    const N = parseInt(req.query.limit) || 10;
    const products = await Product.find({ status: 'active' });
    const scoredProducts = products.map(product => {
      const { views = 0, clicks = 0, offers = 0 } = product.activity || {};
      const score = (wv * views) + (wc * clicks) + (wo * offers);
      return { ...product.toObject(), score };
    });
    scoredProducts.sort((a, b) => b.score - a.score);
    res.json(scoredProducts.slice(0, N));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router; 