const express = require('express');
const jwt = require('jsonwebtoken');
const Category = require('../models/Category');
const Product = require('../models/Product');
const User = require('../models/User');

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

// Get all categories
router.get('/', auth, async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .populate('subcategories')
      .sort({ sortOrder: 1, name: 1 });
    
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get category by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
      .populate('subcategories')
      .populate('parentCategory');
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get products by category
router.get('/:id/products', auth, async (req, res) => {
  try {
    const { page, limit, sortBy, sortOrder } = req.query;
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Get all subcategories recursively
    const getAllSubcategoryIds = async (categoryId) => {
      const category = await Category.findById(categoryId);
      if (!category) return [categoryId];
      
      const subcategoryIds = [categoryId];
      for (const subId of category.subcategories) {
        const subIds = await getAllSubcategoryIds(subId);
        subcategoryIds.push(...subIds);
      }
      return subcategoryIds;
    };

    const categoryIds = await getAllSubcategoryIds(req.params.id);
    
    let filter = { 
      productGroup: { $in: categoryIds },
      status: 'active'
    };

    // Sorting
    let sort = {};
    if (sortBy) {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    } else {
      sort.createdAt = -1;
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
      category,
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

// Create category (admin only)
router.post('/', auth, async (req, res) => {
  try {
    // Check if user is admin (you can implement admin check based on your user model)
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { name, slug, description, icon, color, parentCategory, sortOrder } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ message: 'Name and slug are required' });
    }

    // Check if slug already exists
    const existingCategory = await Category.findOne({ slug });
    if (existingCategory) {
      return res.status(400).json({ message: 'Slug already exists' });
    }

    const category = await Category.create({
      name,
      slug,
      description,
      icon,
      color,
      parentCategory,
      sortOrder: sortOrder || 0
    });

    // Update parent category's subcategories
    if (parentCategory) {
      await Category.findByIdAndUpdate(parentCategory, {
        $push: { subcategories: category._id }
      });
    }

    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update category (admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const updateData = { ...req.body };

    // Check if slug is being changed and if it already exists
    if (updateData.slug && updateData.slug !== category.slug) {
      const existingCategory = await Category.findOne({ slug: updateData.slug });
      if (existingCategory) {
        return res.status(400).json({ message: 'Slug already exists' });
      }
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('subcategories');

    res.json(updatedCategory);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete category (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Check if category has products
    const productCount = await Product.countDocuments({ productGroup: req.params.id });
    if (productCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete category with existing products',
        productCount 
      });
    }

    // Remove from parent category's subcategories
    if (category.parentCategory) {
      await Category.findByIdAndUpdate(category.parentCategory, {
        $pull: { subcategories: category._id }
      });
    }

    await category.deleteOne();
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get category statistics
router.get('/:id/stats', auth, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Get all subcategories recursively
    const getAllSubcategoryIds = async (categoryId) => {
      const category = await Category.findById(categoryId);
      if (!category) return [categoryId];
      
      const subcategoryIds = [categoryId];
      for (const subId of category.subcategories) {
        const subIds = await getAllSubcategoryIds(subId);
        subcategoryIds.push(...subIds);
      }
      return subcategoryIds;
    };

    const categoryIds = await getAllSubcategoryIds(req.params.id);

    const stats = await Product.aggregate([
      {
        $match: {
          productGroup: { $in: categoryIds },
          status: 'active'
        }
      },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          sellProducts: {
            $sum: { $cond: [{ $eq: ['$type', 'sell'] }, 1, 0] }
          },
          exchangeProducts: {
            $sum: { $cond: [{ $eq: ['$type', 'exchange'] }, 1, 0] }
          },
          giveawayProducts: {
            $sum: { $cond: [{ $eq: ['$type', 'giveaway'] }, 1, 0] }
          },
          avgPrice: { $avg: { $toDouble: '$sell_price' } }
        }
      }
    ]);

    res.json(stats[0] || {
      totalProducts: 0,
      sellProducts: 0,
      exchangeProducts: 0,
      giveawayProducts: 0,
      avgPrice: 0
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router; 