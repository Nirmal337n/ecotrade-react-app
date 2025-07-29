const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['sell', 'exchange', 'giveaway'], 
    required: true 
  },
  sell_price: { type: String },
  desired_item: { type: String }, // For exchange type
  condition: { 
    type: String, 
    enum: ['new', 'like-new', 'good', 'fair', 'poor'], 
    required: true 
  },
  usage: { type: String }, // How long used
  location: { type: String, required: true },
  delivery_type: { 
    type: String, 
    enum: ['physical', 'online'], 
    required: true 
  },
  payment: { type: String },
  description: { type: String, required: true },
  productGroup: { type: String }, // Category
  minimum_price: { type: String }, // For exchange
  valid_till: { type: Date },
  
  // Images
  primaryImage: { type: String },
  descriptiveImages: [{ type: String }],
  
  // Social features
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    replies: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      text: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    }]
  }],
  
  // Status
  status: { 
    type: String, 
    enum: ['active', 'pending', 'sold', 'exchanged', 'given', 'expired'], 
    default: 'active' 
  },
  
  // Trade details
  tradeHistory: [{
    action: { type: String, enum: ['viewed', 'liked', 'commented', 'contacted', 'sold', 'exchanged'] },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
    details: { type: String }
  }],
  
  // Contact and negotiation
  contactInfo: {
    phone: { type: String },
    email: { type: String },
    preferredContact: { type: String, enum: ['phone', 'email', 'message'] }
  },
  
  // Tags for search
  tags: [{ type: String }],

  // Activity counters for recommendation
  activity: {
    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    offers: { type: Number, default: 0 }
  }
}, { timestamps: true });

// Index for search functionality
productSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Product', productSchema); 