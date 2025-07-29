const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  // Trade participants
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Products involved
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  exchangedProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, // For exchanges
  
  // Trade details
  tradeType: { 
    type: String, 
    enum: ['sale', 'exchange', 'giveaway', 'auction'], 
    required: true 
  },
  amount: { type: Number }, // For sales
  currency: { type: String, default: 'NPR' },
  
  // Auction/Bidding specific fields
  auction: {
    isAuction: { type: Boolean, default: false },
    startingPrice: { type: Number },
    reservePrice: { type: Number }, // Minimum price seller will accept
    currentHighestBid: { type: Number },
    auctionEndDate: { type: Date },
    autoAcceptPrice: { type: Number }, // Price at which seller automatically accepts
    allowCounterOffers: { type: Boolean, default: true }
  },
  
  // Multiple offers/bids for auction-style trading
  offers: [{
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    message: { type: String },
    status: { 
      type: String, 
      enum: ['pending', 'accepted', 'rejected', 'countered', 'expired'], 
      default: 'pending' 
    },
    counterOffer: {
      amount: { type: Number },
      message: { type: String },
      expiresAt: { type: Date }
    },
    createdAt: { type: Date, default: Date.now },
    respondedAt: { type: Date },
    expiresAt: { type: Date } // Offer expiration
  }],
  
  // Status tracking
  status: { 
    type: String, 
    enum: ['pending', 'negotiating', 'agreed', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled', 'disputed', 'auction_active', 'auction_ended'], 
    default: 'pending' 
  },
  
  // Acceptance tracking
  buyerAccepted: { type: Boolean, default: false },
  sellerAccepted: { type: Boolean, default: false },
  rejectedAt: { type: Date },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Timeline
  initiatedAt: { type: Date, default: Date.now },
  agreedAt: { type: Date },
  completedAt: { type: Date },
  
  // Communication
  messages: [{
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: { type: String, required: true },
    imageUrl: { type: String }, // To store URL of sent images
    timestamp: { type: Date, default: Date.now },
    isSystemMessage: { type: Boolean, default: false },
    offerId: { type: mongoose.Schema.Types.ObjectId }, // Link message to specific offer
    messageType: { 
      type: String, 
      enum: ['general', 'offer', 'counter_offer', 'acceptance', 'rejection', 'system'] 
    }
  }],
  
  // Delivery details
  deliveryMethod: { type: String, enum: ['physical', 'online'] },
  deliveryAddress: { type: String },
  deliveryDate: { type: Date },
  
  // Payment details
  paymentMethod: { type: String },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'paid', 'refunded'], 
    default: 'pending' 
  },
  
  // Ratings and reviews
  buyerRating: {
    rating: { type: Number, min: 1, max: 5 },
    review: { type: String },
    createdAt: { type: Date }
  },
  sellerRating: {
    rating: { type: Number, min: 1, max: 5 },
    review: { type: String },
    createdAt: { type: Date }
  },
  
  // Dispute handling
  dispute: {
    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String },
    description: { type: String },
    status: { type: String, enum: ['open', 'resolved', 'closed'] },
    resolution: { type: String },
    createdAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date }
  },
  
  // Trade settings
  settings: {
    allowMultipleOffers: { type: Boolean, default: true },
    offerExpirationHours: { type: Number, default: 72 }, // Default 3 days
    autoRejectBelowPrice: { type: Number }, // Auto-reject offers below this price
    requireDeposit: { type: Boolean, default: false },
    depositAmount: { type: Number }
  }
}, { timestamps: true });

// Indexes for better query performance
tradeSchema.index({ product: 1, status: 1 });
tradeSchema.index({ buyer: 1, status: 1 });
tradeSchema.index({ seller: 1, status: 1 });
tradeSchema.index({ 'auction.auctionEndDate': 1 });
tradeSchema.index({ 'offers.expiresAt': 1 });

// Virtual for getting the best offer
tradeSchema.virtual('bestOffer').get(function() {
  if (!this.offers || this.offers.length === 0) return null;
  
  const validOffers = this.offers.filter(offer => 
    offer.status === 'pending' && 
    (!offer.expiresAt || offer.expiresAt > new Date())
  );
  
  if (validOffers.length === 0) return null;
  
  return validOffers.reduce((best, current) => 
    current.amount > best.amount ? current : best
  );
});

// Virtual for getting offer count
tradeSchema.virtual('offerCount').get(function() {
  if (!this.offers) return 0;
  return this.offers.filter(offer => 
    offer.status === 'pending' && 
    (!offer.expiresAt || offer.expiresAt > new Date())
  ).length;
});

// Pre-save middleware to update auction status
tradeSchema.pre('save', function(next) {
  if (this.auction && this.auction.auctionEndDate && this.auction.auctionEndDate < new Date()) {
    this.status = 'auction_ended';
  }
  next();
});

module.exports = mongoose.model('Trade', tradeSchema); 