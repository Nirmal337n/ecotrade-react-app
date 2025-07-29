const express = require('express');
const Friend = require('../models/Friend');
const User = require('../models/User');
const Notification = require('../models/Notification');

const router = express.Router();

// Middleware to verify JWT and get user
const auth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) return res.status(404).json({ message: 'User not found' });
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Send friend request
router.post('/request', auth, async (req, res) => {
  try {
    const { recipientId, message } = req.body;
    
    if (!recipientId) {
      return res.status(400).json({ message: 'Recipient ID is required' });
    }
    
    if (recipientId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot send friend request to yourself' });
    }
    
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if friend request already exists
    const existingRequest = await Friend.findOne({
      $or: [
        { sender: req.user._id, recipient: recipientId },
        { sender: recipientId, recipient: req.user._id }
      ]
    });
    
    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return res.status(400).json({ message: 'Friend request already pending' });
      } else if (existingRequest.status === 'accepted') {
        return res.status(400).json({ message: 'Already friends' });
      } else if (existingRequest.status === 'blocked') {
        return res.status(400).json({ message: 'Cannot send friend request' });
      }
    }
    
    // Create new friend request
    const friendRequest = await Friend.create({
      sender: req.user._id,
      recipient: recipientId,
      message: message || ''
    });
    
    // Add to user's sent requests
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { friendRequestsSent: recipientId }
    });
    
    // Add to recipient's received requests
    await User.findByIdAndUpdate(recipientId, {
      $addToSet: { friendRequestsReceived: req.user._id }
    });
    
    // Create notification
    await Notification.create({
      recipient: recipientId,
      sender: req.user._id,
      post: null, // Friend requests don't have associated posts
      type: 'friend_request',
      content: `${req.user.firstName} ${req.user.lastName} sent you a friend request`
    });
    
    const populatedRequest = await Friend.findById(friendRequest._id)
      .populate('sender', 'firstName lastName profilePicture')
      .populate('recipient', 'firstName lastName profilePicture');
    
    res.status(201).json(populatedRequest);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Accept friend request
router.post('/accept/:requestId', auth, async (req, res) => {
  try {
    const friendRequest = await Friend.findById(req.params.requestId);
    
    if (!friendRequest) {
      return res.status(404).json({ message: 'Friend request not found' });
    }
    
    if (friendRequest.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to accept this request' });
    }
    
    if (friendRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Friend request is not pending' });
    }
    
    // Update friend request status
    friendRequest.status = 'accepted';
    friendRequest.acceptedAt = new Date();
    await friendRequest.save();
    
    // Add each user to the other's friends list
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { friends: friendRequest.sender }
    });
    
    await User.findByIdAndUpdate(friendRequest.sender, {
      $addToSet: { friends: req.user._id }
    });
    
    // Remove from friend requests lists
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { friendRequestsReceived: friendRequest.sender }
    });
    
    await User.findByIdAndUpdate(friendRequest.sender, {
      $pull: { friendRequestsSent: req.user._id }
    });
    
    // Create notification for sender
    await Notification.create({
      recipient: friendRequest.sender,
      sender: req.user._id,
      post: null,
      type: 'friend_accepted',
      content: `${req.user.firstName} ${req.user.lastName} accepted your friend request`
    });
    
    const populatedRequest = await Friend.findById(friendRequest._id)
      .populate('sender', 'firstName lastName profilePicture')
      .populate('recipient', 'firstName lastName profilePicture');
    
    res.json(populatedRequest);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Reject friend request
router.post('/reject/:requestId', auth, async (req, res) => {
  try {
    const friendRequest = await Friend.findById(req.params.requestId);
    
    if (!friendRequest) {
      return res.status(404).json({ message: 'Friend request not found' });
    }
    
    if (friendRequest.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to reject this request' });
    }
    
    if (friendRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Friend request is not pending' });
    }
    
    // Update friend request status
    friendRequest.status = 'rejected';
    friendRequest.rejectedAt = new Date();
    await friendRequest.save();
    
    // Remove from friend requests lists
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { friendRequestsReceived: friendRequest.sender }
    });
    
    await User.findByIdAndUpdate(friendRequest.sender, {
      $pull: { friendRequestsSent: req.user._id }
    });
    
    const populatedRequest = await Friend.findById(friendRequest._id)
      .populate('sender', 'firstName lastName profilePicture')
      .populate('recipient', 'firstName lastName profilePicture');
    
    res.json(populatedRequest);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Remove friend
router.delete('/remove/:friendId', auth, async (req, res) => {
  try {
    const friendId = req.params.friendId;
    
    if (friendId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot remove yourself as friend' });
    }
    
    // Remove from both users' friends lists
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { friends: friendId }
    });
    
    await User.findByIdAndUpdate(friendId, {
      $pull: { friends: req.user._id }
    });
    
    // Update or create friend record to mark as removed
    await Friend.findOneAndUpdate(
      {
        $or: [
          { sender: req.user._id, recipient: friendId },
          { sender: friendId, recipient: req.user._id }
        ]
      },
      { status: 'rejected' },
      { upsert: true }
    );
    
    res.json({ message: 'Friend removed successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Block user
router.post('/block/:userId', auth, async (req, res) => {
  try {
    const userId = req.params.userId;
    
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot block yourself' });
    }
    
    const userToBlock = await User.findById(userId);
    if (!userToBlock) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Add to blocked users list
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { blockedUsers: userId }
    });
    
    // Remove from friends if they were friends
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { friends: userId }
    });
    
    await User.findByIdAndUpdate(userId, {
      $pull: { friends: req.user._id }
    });
    
    // Update friend request status if exists
    await Friend.findOneAndUpdate(
      {
        $or: [
          { sender: req.user._id, recipient: userId },
          { sender: userId, recipient: req.user._id }
        ]
      },
      { 
        status: 'blocked',
        blockedAt: new Date(),
        blockedBy: req.user._id
      },
      { upsert: true }
    );
    
    res.json({ message: 'User blocked successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Unblock user
router.post('/unblock/:userId', auth, async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Remove from blocked users list
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { blockedUsers: userId }
    });
    
    res.json({ message: 'User unblocked successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get friend requests received
router.get('/requests/received', auth, async (req, res) => {
  try {
    const requests = await Friend.find({
      recipient: req.user._id,
      status: 'pending'
    })
    .populate('sender', 'firstName lastName profilePicture email')
    .sort({ createdAt: -1 });
    
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get friend requests sent
router.get('/requests/sent', auth, async (req, res) => {
  try {
    const requests = await Friend.find({
      sender: req.user._id,
      status: 'pending'
    })
    .populate('recipient', 'firstName lastName profilePicture email')
    .sort({ createdAt: -1 });
    
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get friends list
router.get('/friends', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('friends', 'firstName lastName profilePicture email bio')
      .populate('friendRequestsReceived', 'firstName lastName profilePicture email')
      .populate('friendRequestsSent', 'firstName lastName profilePicture email');
    
    res.json({
      friends: user.friends,
      requestsReceived: user.friendRequestsReceived,
      requestsSent: user.friendRequestsSent
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Search users (excluding friends and blocked users)
router.get('/search', auth, async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }
    
    const user = await User.findById(req.user._id);
    
    const searchQuery = {
      _id: { 
        $ne: req.user._id,
        $nin: [...user.friends, ...user.blockedUsers, ...user.friendRequestsSent, ...user.friendRequestsReceived]
      },
      $or: [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    };
    
    const users = await User.find(searchQuery)
      .select('firstName lastName profilePicture email bio')
      .limit(20);
    
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get friendship status with a specific user
router.get('/status/:userId', auth, async (req, res) => {
  try {
    const userId = req.params.userId;
    
    if (userId === req.user._id.toString()) {
      return res.json({ status: 'self' });
    }
    
    const user = await User.findById(req.user._id);
    
    // Check if friends
    if (user.friends.includes(userId)) {
      return res.json({ status: 'friends' });
    }
    
    // Check if request sent
    if (user.friendRequestsSent.includes(userId)) {
      return res.json({ status: 'request_sent' });
    }
    
    // Check if request received
    if (user.friendRequestsReceived.includes(userId)) {
      return res.json({ status: 'request_received' });
    }
    
    // Check if blocked
    if (user.blockedUsers.includes(userId)) {
      return res.json({ status: 'blocked' });
    }
    
    return res.json({ status: 'none' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router; 