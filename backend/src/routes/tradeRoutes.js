const express = require('express');
const jwt = require('jsonwebtoken');
const Trade = require('../models/Trade');
const Product = require('../models/Product');
const User = require('../models/User');
const Notification = require('../models/Notification');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Setup multer for image uploads in chat
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, '../../uploads/'));
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
});

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

// Initiate a trade
router.post('/', auth, async (req, res) => {
  try {
    const { 
      productId, 
      exchangedProductId, 
      tradeType, 
      amount, 
      message,
      isAuction,
      auctionSettings 
    } = req.body;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (product.user.equals(req.user._id)) {
      return res.status(400).json({ message: 'Cannot trade with yourself' });
    }

    let exchangedProduct = null;
    if (exchangedProductId) {
      exchangedProduct = await Product.findById(exchangedProductId);
      if (!exchangedProduct) return res.status(404).json({ message: 'Exchanged product not found' });
      if (!exchangedProduct.user.equals(req.user._id)) {
        return res.status(400).json({ message: 'Exchanged product must belong to you' });
      }
    }

    const tradeData = {
      buyer: req.user._id,
      seller: product.user,
      product: productId,
      exchangedProduct: exchangedProductId,
      tradeType,
      amount: amount ? parseFloat(amount) : null,
      deliveryMethod: product.delivery_type,
      messages: message ? [{
        sender: req.user._id,
        message,
        isSystemMessage: false,
        messageType: 'general'
      }] : []
    };

    // Add auction settings if it's an auction
    if (isAuction && auctionSettings) {
      tradeData.auction = {
        isAuction: true,
        startingPrice: auctionSettings.startingPrice,
        reservePrice: auctionSettings.reservePrice,
        currentHighestBid: auctionSettings.startingPrice,
        auctionEndDate: auctionSettings.auctionEndDate,
        autoAcceptPrice: auctionSettings.autoAcceptPrice,
        allowCounterOffers: auctionSettings.allowCounterOffers !== false
      };
      tradeData.status = 'auction_active';
    }

    const trade = await Trade.create(tradeData);

    // Increment product.activity.offers
    product.activity = product.activity || { views: 0, clicks: 0, offers: 0 };
    product.activity.offers = (product.activity.offers || 0) + 1;
    await product.save();

    // Add system message
    trade.messages.push({
      sender: req.user._id,
      message: isAuction ? 
        `Auction initiated for ${product.title} starting at NPR ${auctionSettings.startingPrice}` :
        `Trade initiated for ${product.title}`,
      isSystemMessage: true,
      messageType: 'system'
    });

    await trade.save();

    // Create notification for seller
    await Notification.create({
      recipient: product.user,
      sender: req.user._id,
      post: productId,
      type: 'comment',
      content: isAuction ? 
        `New auction for ${product.title}` :
        `New trade request for ${product.title}`
    });

    await trade.populate('buyer', 'firstName lastName profilePicture');
    await trade.populate('seller', 'firstName lastName profilePicture');
    await trade.populate('product', 'title primaryImage');
    await trade.populate('exchangedProduct', 'title primaryImage');

    res.status(201).json(trade);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Submit an offer/bid
router.post('/:id/offer', auth, async (req, res) => {
  try {
    const { amount, message } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }

    const trade = await Trade.findById(req.params.id);
    if (!trade) return res.status(404).json({ message: 'Trade not found' });

    // Check if user is the buyer
    if (!trade.buyer.equals(req.user._id)) {
      return res.status(403).json({ message: 'Only the buyer can submit offers' });
    }

    // Check if trade allows multiple offers
    if (!trade.settings.allowMultipleOffers) {
      const existingOffer = trade.offers.find(offer => 
        offer.buyer.equals(req.user._id) && offer.status === 'pending'
      );
      if (existingOffer) {
        return res.status(400).json({ message: 'You already have a pending offer' });
      }
    }

    // Check auto-reject price
    if (trade.settings.autoRejectBelowPrice && amount < trade.settings.autoRejectBelowPrice) {
      return res.status(400).json({ 
        message: `Offer must be at least NPR ${trade.settings.autoRejectBelowPrice}` 
      });
    }

    // Set offer expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (trade.settings.offerExpirationHours || 72));

    const offer = {
      buyer: req.user._id,
      amount: parseFloat(amount),
      message: message || '',
      status: 'pending',
      createdAt: new Date(),
      expiresAt
    };

    trade.offers.push(offer);

    // Update auction highest bid if applicable
    if (trade.auction && trade.auction.isAuction) {
      if (amount > trade.auction.currentHighestBid) {
        trade.auction.currentHighestBid = amount;
      }
    }

    // Add message
    trade.messages.push({
      sender: req.user._id,
      message: `New offer: NPR ${amount}${message ? ` - ${message}` : ''}`,
      isSystemMessage: false,
      messageType: 'offer',
      offerId: offer._id
    });

    await trade.save();

    // Create notification for seller
    await Notification.create({
      recipient: trade.seller,
      sender: req.user._id,
      post: trade.product,
      type: 'comment',
      content: `New offer of NPR ${amount} for ${trade.product.title}`
    });

    await trade.populate('buyer', 'firstName lastName profilePicture');
    await trade.populate('seller', 'firstName lastName profilePicture');
    await trade.populate('product', 'title primaryImage');
    await trade.populate('exchangedProduct', 'title primaryImage');

    res.json(trade);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Respond to an offer (accept/reject/counter)
router.put('/:id/offer/:offerId', auth, async (req, res) => {
  try {
    const { action, counterAmount, counterMessage } = req.body;
    const { offerId } = req.params;

    const trade = await Trade.findById(req.params.id);
    if (!trade) return res.status(404).json({ message: 'Trade not found' });

    // Check if user is the seller
    if (!trade.seller.equals(req.user._id)) {
      return res.status(403).json({ message: 'Only the seller can respond to offers' });
    }

    const offer = trade.offers.id(offerId);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    if (offer.status !== 'pending') {
      return res.status(400).json({ message: 'Offer has already been responded to' });
    }

    const oldStatus = offer.status;
    offer.status = action;
    offer.respondedAt = new Date();

    let message = '';
    let messageType = '';

    switch (action) {
      case 'accepted':
        message = `Offer of NPR ${offer.amount} accepted`;
        messageType = 'acceptance';
        trade.status = 'agreed';
        trade.amount = offer.amount;
        trade.agreedAt = new Date();
        
        // Reject all other pending offers
        trade.offers.forEach(o => {
          if (o._id.toString() !== offerId && o.status === 'pending') {
            o.status = 'rejected';
            o.respondedAt = new Date();
          }
        });
        break;

      case 'rejected':
        message = `Offer of NPR ${offer.amount} rejected`;
        messageType = 'rejection';
        break;

      case 'countered':
        if (!counterAmount || counterAmount <= 0) {
          return res.status(400).json({ message: 'Valid counter amount is required' });
        }
        offer.counterOffer = {
          amount: parseFloat(counterAmount),
          message: counterMessage || '',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        };
        message = `Counter offer: NPR ${counterAmount}${counterMessage ? ` - ${counterMessage}` : ''}`;
        messageType = 'counter_offer';
        break;

      default:
        return res.status(400).json({ message: 'Invalid action' });
    }

    // Add message
    trade.messages.push({
      sender: req.user._id,
      message,
      isSystemMessage: false,
      messageType,
      offerId: offer._id
    });

    await trade.save();

    // Create notification for buyer
    await Notification.create({
      recipient: offer.buyer,
      sender: req.user._id,
      post: trade.product,
      type: 'comment',
      content: `Your offer for ${trade.product.title} was ${action}`
    });

    await trade.populate('buyer', 'firstName lastName profilePicture');
    await trade.populate('seller', 'firstName lastName profilePicture');
    await trade.populate('product', 'title primaryImage');
    await trade.populate('exchangedProduct', 'title primaryImage');

    res.json(trade);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Respond to counter offer
router.put('/:id/counter/:offerId', auth, async (req, res) => {
  try {
    const { action } = req.body;
    const { offerId } = req.params;

    const trade = await Trade.findById(req.params.id);
    if (!trade) return res.status(404).json({ message: 'Trade not found' });

    const offer = trade.offers.id(offerId);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    // Check if user is the buyer
    if (!offer.buyer.equals(req.user._id)) {
      return res.status(403).json({ message: 'Only the buyer can respond to counter offers' });
    }

    if (!offer.counterOffer) {
      return res.status(400).json({ message: 'No counter offer to respond to' });
    }

    if (offer.counterOffer.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Counter offer has expired' });
    }

    let message = '';
    let messageType = '';

    switch (action) {
      case 'accept':
        offer.amount = offer.counterOffer.amount;
        offer.status = 'accepted';
        message = `Counter offer of NPR ${offer.counterOffer.amount} accepted`;
        messageType = 'acceptance';
        trade.status = 'agreed';
        trade.amount = offer.counterOffer.amount;
        trade.agreedAt = new Date();
        break;

      case 'reject':
        offer.status = 'rejected';
        message = `Counter offer of NPR ${offer.counterOffer.amount} rejected`;
        messageType = 'rejection';
        break;

      default:
        return res.status(400).json({ message: 'Invalid action' });
    }

    offer.respondedAt = new Date();
    delete offer.counterOffer;

    // Add message
    trade.messages.push({
      sender: req.user._id,
      message,
      isSystemMessage: false,
      messageType,
      offerId: offer._id
    });

    await trade.save();

    await trade.populate('buyer', 'firstName lastName profilePicture');
    await trade.populate('seller', 'firstName lastName profilePicture');
    await trade.populate('product', 'title primaryImage');
    await trade.populate('exchangedProduct', 'title primaryImage');

    res.json(trade);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get user's trades (as buyer or seller)
router.get('/', auth, async (req, res) => {
  try {
    const { role, filter } = req.query; // role: 'buyer' or 'seller', filter: 'active' or 'history'
    let query = {};

    if (role === 'buyer') {
      query.buyer = req.user._id;
    } else if (role === 'seller') {
      query.seller = req.user._id;
    } else {
      // If no role is specified, get all trades for the user
      query = { $or: [{ buyer: req.user._id }, { seller: req.user._id }] };
    }
      
    // Add status filtering
    if (filter === 'active') {
        query.status = { $in: ['pending', 'agreed', 'in_progress', 'auction_active', 'negotiating'] };
    } else if (filter === 'history') {
        query.status = { $in: ['completed', 'rejected', 'cancelled', 'auction_ended', 'disputed', 'accepted'] };
    }

    const trades = await Trade.find(query)
      .populate('buyer', 'firstName lastName')
      .populate('seller', 'firstName lastName')
      .populate('product', 'title type minimum_price condition location brand subcategory sell_price')
      .populate('exchangedProduct', 'title')
      .sort({ createdAt: -1 });

    res.json(trades);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get trades by product
router.get('/product/:productId', auth, async (req, res) => {
  try {
    const { productId } = req.params;
    
    const trades = await Trade.find({
      product: productId,
      $or: [{ buyer: req.user._id }, { seller: req.user._id }]
    })
    .populate('buyer', 'firstName lastName profilePicture')
    .populate('seller', 'firstName lastName profilePicture')
    .populate('product', 'title primaryImage')
    .populate('exchangedProduct', 'title primaryImage')
    .populate('offers.buyer', 'firstName lastName profilePicture')
    .sort({ createdAt: -1 });

    res.json(trades);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a single trade
router.get('/:id', auth, async (req, res) => {
  try {
    const trade = await Trade.findById(req.params.id)
      .populate('buyer', 'firstName lastName profilePicture')
      .populate('seller', 'firstName lastName profilePicture')
      .populate('product', 'title primaryImage description')
      .populate('exchangedProduct', 'title primaryImage description')
      .populate('offers.buyer', 'firstName lastName profilePicture');

    if (!trade) return res.status(404).json({ message: 'Trade not found' });

    // Check if user is part of this trade
    if (!trade.buyer._id.equals(req.user._id) && !trade.seller._id.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(trade);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update trade status
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status, details } = req.body;
    const trade = await Trade.findById(req.params.id);

    if (!trade) return res.status(404).json({ message: 'Trade not found' });

    // Check if user is part of this trade
    if (!trade.buyer.equals(req.user._id) && !trade.seller.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const oldStatus = trade.status;
    trade.status = status;

    // Update timestamps based on status
    if (status === 'agreed') {
      trade.agreedAt = new Date();
    } else if (status === 'completed') {
      trade.completedAt = new Date();
    }

    // Add system message
    trade.messages.push({
      sender: req.user._id,
      message: `Trade status changed from ${oldStatus} to ${status}${details ? `: ${details}` : ''}`,
      isSystemMessage: true,
      messageType: 'system'
    });

    await trade.save();

    // Update product status if trade is completed
    if (status === 'completed') {
      await Product.findByIdAndUpdate(trade.product, { status: 'sold' });
      if (trade.exchangedProduct) {
        await Product.findByIdAndUpdate(trade.exchangedProduct, { status: 'exchanged' });
      }
    }

    await trade.populate('buyer', 'firstName lastName profilePicture');
    await trade.populate('seller', 'firstName lastName profilePicture');
    await trade.populate('product', 'title primaryImage');
    await trade.populate('exchangedProduct', 'title primaryImage');

    res.json(trade);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add message to trade
router.post('/:id/message', auth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ message: 'Message is required' });

    const trade = await Trade.findById(req.params.id);
    if (!trade) return res.status(404).json({ message: 'Trade not found' });

    // Check if user is part of this trade
    if (!trade.buyer.equals(req.user._id) && !trade.seller.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    trade.messages.push({
      sender: req.user._id,
      message,
      isSystemMessage: false,
      messageType: 'general'
    });

    await trade.save();

    // Create notification for the other party
    const recipient = trade.buyer.equals(req.user._id) ? trade.seller : trade.buyer;
    await Notification.create({
      recipient,
      sender: req.user._id,
      post: trade.product,
      type: 'comment',
      content: `New message in trade for ${trade.product.title}`
    });

    await trade.populate('buyer', 'firstName lastName profilePicture');
    await trade.populate('seller', 'firstName lastName profilePicture');
    await trade.populate('product', 'title primaryImage');
    await trade.populate('exchangedProduct', 'title primaryImage');

    res.json(trade);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get active auctions
router.get('/auctions/active', auth, async (req, res) => {
  try {
    const auctions = await Trade.find({
      'auction.isAuction': true,
      status: 'auction_active',
      'auction.auctionEndDate': { $gt: new Date() }
    })
    .populate('buyer', 'firstName lastName profilePicture')
    .populate('seller', 'firstName lastName profilePicture')
    .populate('product', 'title primaryImage description')
    .populate('offers.buyer', 'firstName lastName profilePicture')
    .sort({ 'auction.auctionEndDate': 1 });

    res.json(auctions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// End auction manually
router.put('/:id/end-auction', auth, async (req, res) => {
  try {
    const trade = await Trade.findById(req.params.id);
    if (!trade) return res.status(404).json({ message: 'Trade not found' });

    // Check if user is the seller
    if (!trade.seller.equals(req.user._id)) {
      return res.status(403).json({ message: 'Only the seller can end the auction' });
    }

    if (!trade.auction || !trade.auction.isAuction) {
      return res.status(400).json({ message: 'This is not an auction' });
    }

    if (trade.status !== 'auction_active') {
      return res.status(400).json({ message: 'Auction is not active' });
    }

    trade.status = 'auction_ended';
    trade.auction.auctionEndDate = new Date();

    // Find the best offer
    const bestOffer = trade.offers
      .filter(offer => offer.status === 'pending')
      .sort((a, b) => b.amount - a.amount)[0];

    if (bestOffer) {
      // Check if it meets reserve price
      if (!trade.auction.reservePrice || bestOffer.amount >= trade.auction.reservePrice) {
        bestOffer.status = 'accepted';
        trade.status = 'agreed';
        trade.amount = bestOffer.amount;
        trade.agreedAt = new Date();
        
        trade.messages.push({
          sender: req.user._id,
          message: `Auction ended. Best offer of NPR ${bestOffer.amount} accepted.`,
          isSystemMessage: true,
          messageType: 'system'
        });
      } else {
        trade.messages.push({
          sender: req.user._id,
          message: `Auction ended. Best offer of NPR ${bestOffer.amount} did not meet reserve price.`,
          isSystemMessage: true,
          messageType: 'system'
        });
      }
    } else {
      trade.messages.push({
        sender: req.user._id,
        message: 'Auction ended with no valid offers.',
        isSystemMessage: true,
        messageType: 'system'
      });
    }

    await trade.save();

    await trade.populate('buyer', 'firstName lastName profilePicture');
    await trade.populate('seller', 'firstName lastName profilePicture');
    await trade.populate('product', 'title primaryImage');
    await trade.populate('exchangedProduct', 'title primaryImage');

    res.json(trade);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Rate a trade
router.post('/:id/rate', auth, async (req, res) => {
  try {
    const { rating, review, role } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Valid rating (1-5) is required' });
    }

    const trade = await Trade.findById(req.params.id);
    if (!trade) return res.status(404).json({ message: 'Trade not found' });

    // Check if user is part of this trade
    if (!trade.buyer.equals(req.user._id) && !trade.seller.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Check if trade is completed
    if (trade.status !== 'completed') {
      return res.status(400).json({ message: 'Can only rate completed trades' });
    }

    // Update rating based on role
    if (role === 'buyer' && trade.buyer.equals(req.user._id)) {
      trade.buyerRating = { rating, review, createdAt: new Date() };
    } else if (role === 'seller' && trade.seller.equals(req.user._id)) {
      trade.sellerRating = { rating, review, createdAt: new Date() };
    } else {
      return res.status(400).json({ message: 'Invalid role or not authorized' });
    }

    await trade.save();

    res.json(trade);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Raise a dispute
router.post('/:id/dispute', auth, async (req, res) => {
  try {
    const { reason, description } = req.body;
    if (!reason || !description) {
      return res.status(400).json({ message: 'Reason and description are required' });
    }

    const trade = await Trade.findById(req.params.id);
    if (!trade) return res.status(404).json({ message: 'Trade not found' });

    // Check if user is part of this trade
    if (!trade.buyer.equals(req.user._id) && !trade.seller.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Check if dispute already exists
    if (trade.dispute && trade.dispute.status === 'open') {
      return res.status(400).json({ message: 'Dispute already exists' });
    }

    trade.dispute = {
      raisedBy: req.user._id,
      reason,
      description,
      status: 'open',
      createdAt: new Date()
    };

    trade.status = 'disputed';

    await trade.save();

    res.json(trade);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get trade statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = await Trade.aggregate([
      {
        $match: {
          $or: [{ buyer: userId }, { seller: userId }]
        }
      },
      {
        $group: {
          _id: null,
          totalTrades: { $sum: 1 },
          completedTrades: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          pendingTrades: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          disputedTrades: {
            $sum: { $cond: [{ $eq: ['$status', 'disputed'] }, 1, 0] }
          },
          totalAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] }
          }
        }
      }
    ]);

    res.json(stats[0] || {
      totalTrades: 0,
      completedTrades: 0,
      pendingTrades: 0,
      disputedTrades: 0,
      totalAmount: 0
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Seller responds to a trade (accept/reject)
router.post('/:id/respond', auth, async (req, res) => {
  try {
    const { response } = req.body; // 'accepted' or 'rejected'
    
    const trade = await Trade.findById(req.params.id);
    if (!trade) return res.status(404).json({ message: 'Trade not found' });
    
    // Ensure the person responding is the seller
    if (trade.seller.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized' });
    }
    
    const oldStatus = trade.status;
    if (response === 'accepted') {
      trade.status = 'accepted';
      trade.agreedAt = new Date();
    } else {
      trade.status = 'rejected';
      trade.rejectedAt = new Date();
      trade.rejectedBy = req.user._id;
    }

    await trade.save();

    // Create a notification for the buyer
    await Notification.create({
        recipient: trade.buyer,
        sender: trade.seller,
        trade: trade._id,
        type: response === 'accepted' ? 'trade_accepted' : 'trade_rejected',
        content: `Your offer for "${trade.product?.title}" has been ${response}.`
    });

    res.json({ message: `Trade ${response}`, status: trade.status });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST a new message to a trade (now with image support)
router.post('/:tradeId/messages', auth, upload.single('image'), async (req, res) => {
    try {
        const { message } = req.body;
        if (!message && !req.file) {
            return res.status(400).json({ message: 'Message content or an image is required.' });
        }

        const trade = await Trade.findById(req.params.tradeId);
        if (!trade) {
            return res.status(404).json({ message: 'Trade not found.' });
        }

        if (trade.buyer.toString() !== req.user.id && trade.seller.toString() !== req.user.id) {
            return res.status(403).json({ message: 'You are not authorized to post messages in this trade.' });
        }

        const newMessage = {
            sender: req.user.id,
            message: message || '', // Message can be empty if only sending an image
            messageType: 'general',
            imageUrl: req.file ? `/uploads/${req.file.filename}` : undefined
        };

        trade.messages.push(newMessage);
        await trade.save();
        
        const populatedTrade = await Trade.findById(trade._id).populate('messages.sender', 'firstName lastName profilePicture');

        res.status(201).json(populatedTrade.messages[populatedTrade.messages.length - 1]);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Accept trade (both parties must accept)
router.put('/:id/accept', auth, async (req, res) => {
  try {
    const trade = await Trade.findById(req.params.id);
    if (!trade) return res.status(404).json({ message: 'Trade not found' });

    // Check if user is either buyer or seller
    if (!trade.buyer.equals(req.user._id) && !trade.seller.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to accept this trade' });
    }

    // Mark the current user's acceptance
    if (trade.buyer.equals(req.user._id)) {
      trade.buyerAccepted = true;
    } else {
      trade.sellerAccepted = true;
    }

    // Check if both parties have accepted
    if (trade.buyerAccepted && trade.sellerAccepted) {
      trade.status = 'accepted';
      trade.agreedAt = new Date();
      
      // Update product status to sold/exchanged
      const product = await Product.findById(trade.product);
      if (product) {
        product.status = trade.tradeType === 'sale' ? 'sold' : 'exchanged';
        await product.save();
      }
    }

    await trade.save();

    // Add system message about acceptance
    trade.messages.push({
      sender: req.user._id,
      message: `${req.user.firstName} ${req.user.lastName} accepted the trade`,
      isSystemMessage: true,
      messageType: 'system',
      timestamp: new Date()
    });

    await trade.save();

    await trade.populate('buyer', 'firstName lastName profilePicture');
    await trade.populate('seller', 'firstName lastName profilePicture');
    await trade.populate('product', 'title primaryImage');
    await trade.populate('exchangedProduct', 'title primaryImage');

    res.json(trade);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Reject trade
router.put('/:id/reject', auth, async (req, res) => {
  try {
    const trade = await Trade.findById(req.params.id);
    if (!trade) return res.status(404).json({ message: 'Trade not found' });

    // Check if user is either buyer or seller
    if (!trade.buyer.equals(req.user._id) && !trade.seller.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to reject this trade' });
    }

    trade.status = 'rejected';
    trade.rejectedAt = new Date();
    trade.rejectedBy = req.user._id;

    await trade.save();

    // Add system message about rejection
    trade.messages.push({
      sender: req.user._id,
      message: `${req.user.firstName} ${req.user.lastName} rejected the trade`,
      isSystemMessage: true,
      messageType: 'system',
      timestamp: new Date()
    });

    await trade.save();

    await trade.populate('buyer', 'firstName lastName profilePicture');
    await trade.populate('seller', 'firstName lastName profilePicture');
    await trade.populate('product', 'title primaryImage');
    await trade.populate('exchangedProduct', 'title primaryImage');

    res.json(trade);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router; 