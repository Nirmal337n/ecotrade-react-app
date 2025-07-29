const mongoose = require('mongoose');

const friendSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected', 'blocked'], 
    default: 'pending' 
  },
  message: { type: String }, // Optional message with friend request
  acceptedAt: { type: Date },
  rejectedAt: { type: Date },
  blockedAt: { type: Date },
  blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Who blocked whom
}, { timestamps: true });

// Ensure unique friend relationships
friendSchema.index({ sender: 1, recipient: 1 }, { unique: true });

// Virtual for checking if request is active
friendSchema.virtual('isActive').get(function() {
  return this.status === 'pending';
});

module.exports = mongoose.model('Friend', friendSchema); 