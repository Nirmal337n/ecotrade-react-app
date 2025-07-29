const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  interests: [{ type: String }],
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  name: { type: String }, // for backward compatibility
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profilePicture: { type: String },
  bio: { type: String },
  
  // Friend relationships
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friendRequestsSent: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friendRequestsReceived: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Collaborative filtering fields
  tagVector: {
    type: Map,
    of: Number,
    default: {}
  },
  similarUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema); 