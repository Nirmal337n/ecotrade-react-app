const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String },
  icon: { type: String }, // Icon class or emoji
  color: { type: String }, // Hex color code
  parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  subcategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  productCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema); 