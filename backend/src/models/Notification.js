const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' }, // Made optional for friend notifications
  trade: { type: mongoose.Schema.Types.ObjectId, ref: 'Trade' }, // For trade-related notifications
  type: { 
    type: String, 
    enum: ['like', 'comment', 'reply', 'friend_request', 'friend_accepted', 'new_offer', 'trade_accepted', 'trade_rejected'], 
    required: true 
  },
  content: { type: String }, // For comments/replies, store the text
  read: { type: Boolean, default: false },
  commentId: { type: mongoose.Schema.Types.ObjectId }, // For comment replies
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema); 