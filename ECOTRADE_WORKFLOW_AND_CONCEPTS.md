# ECOTRADE - WORKFLOW AND KEY CONCEPTS

## Project Overview
EcoTrade is a sustainable marketplace platform that enables users to buy, sell, exchange, and give away products within their local communities. The platform promotes environmental sustainability through product reuse and community-driven sharing practices.

## System Architecture

### Current Stack (MERN)
- **Frontend**: React.js with Vite
- **Backend**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer middleware
- **Real-time Communication**: Socket.IO (planned)

### Target Stack (Spring Boot)
- **Frontend**: React.js (unchanged)
- **Backend**: Spring Boot with Spring Data MongoDB
- **Database**: MongoDB
- **Authentication**: Spring Security with JWT
- **File Upload**: Spring MultipartFile
- **Real-time Communication**: WebSocket with STOMP

## Core Workflows

### 1. User Authentication Workflow
```
1. User Registration
   ├── Input: username, email, password, location
   ├── Validation: email format, password strength, unique username
   ├── Process: Hash password, create user profile
   └── Output: JWT token, user profile

2. User Login
   ├── Input: username/email, password
   ├── Validation: Credential verification
   ├── Process: Generate JWT token
   └── Output: JWT token, user data

3. Authentication Middleware
   ├── Input: JWT token from request header
   ├── Validation: Token signature, expiration
   ├── Process: Decode user information
   └── Output: User object attached to request
```

### 2. Product Management Workflow
```
1. Add Product
   ├── Input: title, description, price, type (sell/exchange/giveaway), images
   ├── Validation: Required fields, price constraints, image format
   ├── Process: Upload images, create product record
   └── Output: Product created with unique ID

2. Product Search & Filtering
   ├── Input: Search term, filters (category, location, type, condition)
   ├── Process: MongoDB aggregation with regex search
   ├── Algorithm: Activity-based filtering for recommendations
   └── Output: Filtered and ranked product list

3. Product Viewing
   ├── Input: Product ID
   ├── Process: Increment view count, fetch product details
   ├── Algorithm: Track user activity for recommendations
   └── Output: Product details with seller information
```

### 3. Trade Management Workflow
```
1. Make Offer
   ├── Input: Product ID, offer amount, message
   ├── Validation: Minimum price check, user authorization
   ├── Process: Create trade record, increment product offers
   └── Output: Trade initiated with automated message

2. Offer Negotiation
   ├── Input: Trade ID, message
   ├── Process: Add message to trade conversation
   ├── Real-time: WebSocket notification to other party
   └── Output: Updated trade with new message

3. Offer Acceptance/Rejection
   ├── Input: Trade ID, action (accept/reject)
   ├── Process: Update trade status, handle mutual acceptance
   ├── Business Logic: Remove product from marketplace if accepted
   └── Output: Updated trade status and notifications
```

### 4. Recommendation System Workflow
```
1. Personalized Tag-Based Collaborative Filtering
   ├── Input: User's interaction history
   ├── Process: 
   │   ├── Build user tag vector (tag -> interaction count)
   │   ├── Calculate cosine similarity with other users
   │   ├── Precompute similar users (top 10)
   │   └── Score posts from similar users
   └── Output: Recommended posts ranked by relevance

2. Activity-Based Filtering (Marketplace)
   ├── Input: Product interaction data (views, clicks, offers)
   ├── Process:
   │   ├── Track implicit user activities
   │   ├── Calculate weighted scores: Score = (wv × views) + (wc × clicks) + (wo × offers)
   │   └── Rank products by engagement
   └── Output: Top-scoring products for recommendation
```

## Key Concepts and Algorithms

### 1. User-Tag Interaction Tracking
**Concept**: Track user interactions with content tags to build preference profiles
**Implementation**:
```javascript
// Tag Vector Structure (MongoDB Map)
tagVector: {
  "books": 5,      // User liked/commented on 5 posts with "books" tag
  "electronics": 3, // User interacted with 3 posts tagged "electronics"
  "furniture": 1    // User interacted with 1 post tagged "furniture"
}
```

**Update Triggers**:
- Creating a post with tags
- Liking a post with tags
- Commenting on a post with tags

### 2. Cosine Similarity for User Matching
**Concept**: Measure similarity between users based on their tag interaction patterns
**Formula**: 
```
cosine_similarity(A, B) = (A · B) / (||A|| × ||B||)
```
Where:
- A · B = dot product of tag vectors
- ||A|| = magnitude of user A's tag vector
- ||B|| = magnitude of user B's tag vector

**Implementation**:
```javascript
function cosineSimilarity(vecA, vecB) {
  const allTags = new Set([...vecA.keys(), ...vecB.keys()]);
  let dot = 0, normA = 0, normB = 0;
  
  for (const tag of allTags) {
    const a = vecA.get(tag) || 0;
    const b = vecB.get(tag) || 0;
    dot += a * b;
    normA += a * a;
    normB += b * b;
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

### 3. Activity-Based Product Scoring
**Concept**: Rank marketplace products based on aggregate user engagement
**Formula**:
```
Product_Score = (wv × views) + (wc × clicks) + (wo × offers)
```
Where:
- wv = view weight (0.1) - lowest engagement
- wc = click weight (0.3) - medium engagement  
- wo = offer weight (0.6) - highest engagement

**Example**:
```
Product X: 150 views, 50 clicks, 15 offers
Score = (0.1 × 150) + (0.3 × 50) + (0.6 × 15) = 15 + 15 + 9 = 39

Product Y: 100 views, 80 clicks, 10 offers  
Score = (0.1 × 100) + (0.3 × 80) + (0.6 × 10) = 10 + 24 + 6 = 40

Result: Product Y (40) > Product X (39) - recommend Product Y first
```

### 4. Trade Status Management
**Concept**: Manage complex trade lifecycle with mutual acceptance requirements
**Status Flow**:
```
pending → negotiating → agreed → accepted/rejected → completed/cancelled
```

**Key Features**:
- **Mutual Acceptance**: Both buyer and seller must accept for trade completion
- **Automated Messages**: System generates contextual messages for trade events
- **Product Status Update**: Products removed from marketplace upon acceptance
- **Trade History**: Comprehensive tracking of all trade activities

## Database Schema Design

### User Collection
```javascript
{
  _id: ObjectId,
  username: String (unique),
  email: String (unique),
  password: String (hashed),
  location: String,
  friends: [ObjectId], // References to other users
  tagVector: Map<String, Number>, // tag -> interaction count
  similarUsers: [ObjectId], // Precomputed similar users
  createdAt: Date,
  updatedAt: Date
}
```

### Product Collection
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  type: String (enum: ['sell', 'exchange', 'giveaway']),
  sell_price: Number,
  minimum_price: Number,
  desired_item: String, // For exchange type
  category: String,
  condition: String,
  location: String,
  tags: [String],
  images: [String], // File paths
  user: ObjectId, // Reference to seller
  status: String (enum: ['active', 'sold', 'exchanged', 'removed']),
  activity: {
    views: Number,
    clicks: Number,
    offers: Number
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Trade Collection
```javascript
{
  _id: ObjectId,
  product: ObjectId, // Reference to product
  buyer: ObjectId, // Reference to buyer
  seller: ObjectId, // Reference to seller
  tradeType: String (enum: ['sale', 'exchange']),
  amount: Number, // For sale type
  status: String (enum: ['pending', 'negotiating', 'agreed', 'accepted', 'rejected', 'completed', 'cancelled']),
  buyerAccepted: Boolean,
  sellerAccepted: Boolean,
  messages: [{
    sender: ObjectId,
    content: String,
    timestamp: Date,
    seen: Boolean,
    isSystemMessage: Boolean
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### Post Collection
```javascript
{
  _id: ObjectId,
  content: String,
  images: [String],
  tags: [String],
  user: ObjectId, // Reference to author
  visibility: String (enum: ['public', 'friends', 'private']),
  likes: [ObjectId], // Array of user IDs
  comments: [{
    user: ObjectId,
    content: String,
    timestamp: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

## API Endpoints Structure

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile

### Users
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update user profile
- `GET /api/users/:id/recommended-posts` - Get recommended posts for user
- `POST /api/users/:id/friends` - Add friend
- `DELETE /api/users/:id/friends/:friendId` - Remove friend

### Products
- `GET /api/products` - Get products with search/filtering
- `POST /api/products` - Create new product
- `GET /api/products/:id` - Get product details
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `POST /api/products/:id/click` - Track product click
- `GET /api/products/recommended` - Get recommended products

### Trades
- `POST /api/trades` - Initiate trade
- `GET /api/trades` - Get user's trades
- `GET /api/trades/:id` - Get trade details
- `PUT /api/trades/:id/accept` - Accept trade
- `PUT /api/trades/:id/reject` - Reject trade
- `POST /api/trades/:id/messages` - Add message to trade

### Posts
- `GET /api/posts` - Get posts with filtering
- `POST /api/posts` - Create new post
- `POST /api/posts/:id/like` - Like/unlike post
- `POST /api/posts/:id/comments` - Add comment to post

## Security Considerations

### Authentication & Authorization
- JWT token-based authentication
- Password hashing with bcrypt
- Role-based access control
- Input validation and sanitization

### Data Protection
- MongoDB injection prevention
- XSS protection through input sanitization
- CORS configuration for frontend access
- File upload validation and size limits

### Business Logic Security
- Minimum price validation for offers
- User authorization for trade actions
- Product ownership verification
- Friend-only content visibility

## Performance Optimization

### Database Optimization
- Indexed fields: username, email, product status, trade status
- Text search indexes for product search
- Compound indexes for complex queries
- Aggregation pipeline optimization

### Caching Strategy
- User session caching
- Product recommendation caching
- Similar user computation caching
- Static asset caching

### Frontend Optimization
- Debounced search (500ms delay)
- Lazy loading for images
- Pagination for large datasets
- React component memoization

## Deployment Considerations

### Environment Configuration
- Environment variables for sensitive data
- Database connection pooling
- File storage configuration (local/cloud)
- CORS origins configuration

### Monitoring & Logging
- Request/response logging
- Error tracking and alerting
- Performance metrics collection
- User activity analytics

### Scalability
- Horizontal scaling with load balancers
- Database sharding for large datasets
- CDN for static assets
- Microservices architecture potential

## Future Enhancements

### Planned Features
- Real-time notifications with WebSocket
- Advanced search with filters
- Product categories and subcategories
- User ratings and reviews
- Mobile application
- Payment integration
- Social media integration

### Technical Improvements
- GraphQL API for efficient data fetching
- Redis caching for better performance
- Elasticsearch for advanced search
- Docker containerization
- CI/CD pipeline automation
- Automated testing suite

---

*This document provides a comprehensive overview of the EcoTrade platform's workflow, key concepts, and technical implementation details. It serves as a reference for development, maintenance, and future enhancements.* 