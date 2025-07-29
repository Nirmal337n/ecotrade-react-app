# Ecotrade Marketplace Backend

A comprehensive marketplace backend system for buying, selling, exchanging, and giving away items with social features.

## Features

### Core Marketplace Features
- **Product Management**: Create, read, update, delete products
- **Multiple Transaction Types**: Sell, Exchange, Giveaway
- **Image Upload**: Support for multiple product images
- **Search & Filtering**: Advanced search with multiple filters
- **Categories**: Hierarchical category system
- **Pagination**: Efficient data loading

### Social Features
- **Likes & Comments**: Social interaction on products
- **Notifications**: Real-time notifications for interactions
- **User Profiles**: User management and profiles
- **Trade History**: Track all marketplace activities

### Trade Management
- **Trade Initiation**: Start trades between users
- **Negotiation**: Built-in messaging system
- **Status Tracking**: Track trade progress
- **Dispute Resolution**: Handle trade disputes
- **Rating System**: Rate completed trades

### Security & Authentication
- **JWT Authentication**: Secure user authentication
- **Authorization**: Role-based access control
- **Input Validation**: Comprehensive validation
- **File Upload Security**: Secure image handling

## Database Models

### Product Model
```javascript
{
  user: ObjectId,           // Product owner
  title: String,           // Product title
  type: String,            // 'sell', 'exchange', 'giveaway'
  sell_price: String,      // Price for sale items
  desired_item: String,    // For exchange items
  condition: String,       // 'new', 'like-new', 'good', 'fair', 'poor'
  usage: String,           // How long used
  location: String,        // Product location
  delivery_type: String,   // 'physical', 'online'
  payment: String,         // Payment method
  description: String,     // Product description
  productGroup: ObjectId,  // Category reference
  minimum_price: String,   // For exchanges
  valid_till: Date,        // Expiration date
  
  // Images
  primaryImage: String,    // Main product image
  descriptiveImages: [String], // Additional images
  
  // Social features
  likes: [ObjectId],       // Users who liked
  comments: [Comment],     // Product comments
  
  // Status
  status: String,          // 'active', 'pending', 'sold', etc.
  
  // Trade tracking
  tradeHistory: [TradeEvent], // Activity history
  
  // Contact info
  contactInfo: Object,     // Contact preferences
  
  // Search
  tags: [String]           // Search tags
}
```

### Trade Model
```javascript
{
  buyer: ObjectId,         // Buyer user
  seller: ObjectId,        // Seller user
  product: ObjectId,       // Main product
  exchangedProduct: ObjectId, // For exchanges
  
  tradeType: String,       // 'sale', 'exchange', 'giveaway'
  amount: Number,          // Sale amount
  currency: String,        // Currency (default: NPR)
  
  status: String,          // Trade status
  initiatedAt: Date,       // Trade start
  agreedAt: Date,          // Agreement date
  completedAt: Date,       // Completion date
  
  messages: [Message],     // Trade communication
  deliveryMethod: String,  // Delivery type
  deliveryAddress: String, // Delivery location
  deliveryDate: Date,      // Delivery date
  
  paymentMethod: String,   // Payment method
  paymentStatus: String,   // Payment status
  
  buyerRating: Object,     // Buyer's rating
  sellerRating: Object,    // Seller's rating
  
  dispute: Object          // Dispute information
}
```

### Category Model
```javascript
{
  name: String,            // Category name
  slug: String,            // URL-friendly name
  description: String,     // Category description
  icon: String,            // Category icon
  color: String,           // Category color
  parentCategory: ObjectId, // Parent category
  subcategories: [ObjectId], // Child categories
  isActive: Boolean,       // Active status
  sortOrder: Number,       // Display order
  productCount: Number     // Product count
}
```

### Notification Model
```javascript
{
  recipient: ObjectId,     // Notification recipient
  sender: ObjectId,        // Notification sender
  post: ObjectId,          // Related post/product
  type: String,            // 'like', 'comment', 'reply'
  content: String,         // Notification content
  read: Boolean,           // Read status
  commentId: ObjectId      // For comment replies
}
```

## API Endpoints

### Products
- `GET /api/products` - Get all products with filtering
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `POST /api/products/:id/like` - Like/unlike product
- `POST /api/products/:id/comment` - Add comment
- `POST /api/products/:id/comment/:commentId/reply` - Reply to comment
- `GET /api/products/user/:userId` - Get user's products
- `GET /api/products/search/advanced` - Advanced search

### Trades
- `POST /api/trades` - Initiate trade
- `GET /api/trades/my-trades` - Get user's trades
- `GET /api/trades/:id` - Get specific trade
- `PUT /api/trades/:id/status` - Update trade status
- `POST /api/trades/:id/message` - Add trade message
- `POST /api/trades/:id/rate` - Rate trade
- `POST /api/trades/:id/dispute` - Raise dispute
- `GET /api/trades/stats/overview` - Trade statistics

### Categories
- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get category by ID
- `GET /api/categories/:id/products` - Get products by category
- `POST /api/categories` - Create category (admin)
- `PUT /api/categories/:id` - Update category (admin)
- `DELETE /api/categories/:id` - Delete category (admin)
- `GET /api/categories/:id/stats` - Category statistics

### Notifications
- `GET /api/notifications` - Get user's notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read
- `GET /api/notifications/unread-count` - Get unread count

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ecotrade-react-app/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the backend directory:
   ```env
   MONGO_URI=mongodb://localhost:27017/ecotrade
   JWT_SECRET=your_jwt_secret_here
   PORT=5000
   ```

4. **Database Setup**
   ```bash
   # Start MongoDB
   mongod
   
   # Seed the database with initial data
   npm run seed
   ```

5. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

### Database Seeding

The application includes a seed script to populate the database with initial data:

```bash
npm run seed
```

This will create:
- Sample categories (Electronics, Books, Clothing, etc.)
- Sample products
- Sample user (if none exists)

## File Structure

```
backend/
├── src/
│   ├── models/
│   │   ├── User.js
│   │   ├── Product.js
│   │   ├── Trade.js
│   │   ├── Category.js
│   │   ├── Post.js
│   │   └── Notification.js
│   ├── routes/
│   │   ├── userRoutes.js
│   │   ├── productRoutes.js
│   │   ├── tradeRoutes.js
│   │   ├── categoryRoutes.js
│   │   ├── postRoutes.js
│   │   └── notificationRoutes.js
│   ├── server.js
│   └── seedData.js
├── uploads/
├── package.json
└── README.md
```

## API Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Error Handling

The API returns consistent error responses:

```javascript
{
  "message": "Error description"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License. 