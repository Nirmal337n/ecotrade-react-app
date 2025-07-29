const mongoose = require('mongoose');
const Category = require('./models/Category');
const Product = require('./models/Product');
const User = require('./models/User');
require('dotenv').config();

const seedCategories = async () => {
  const categories = [
    {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic devices and gadgets',
      icon: '📱',
      color: '#007bff',
      sortOrder: 1
    },
    {
      name: 'Books',
      slug: 'books',
      description: 'Books and literature',
      icon: '📚',
      color: '#28a745',
      sortOrder: 2
    },
    {
      name: 'Clothing',
      slug: 'clothing',
      description: 'Apparel and accessories',
      icon: '👕',
      color: '#dc3545',
      sortOrder: 3
    },
    {
      name: 'Home & Garden',
      slug: 'home-garden',
      description: 'Home improvement and gardening items',
      icon: '🏠',
      color: '#ffc107',
      sortOrder: 4
    },
    {
      name: 'Sports & Recreation',
      slug: 'sports-recreation',
      description: 'Sports equipment and recreational items',
      icon: '⚽',
      color: '#17a2b8',
      sortOrder: 5
    },
    {
      name: 'Vehicles',
      slug: 'vehicles',
      description: 'Cars, bikes, and other vehicles',
      icon: '🚗',
      color: '#6f42c1',
      sortOrder: 6
    },
    {
      name: 'Art & Collectibles',
      slug: 'art-collectibles',
      description: 'Artwork and collectible items',
      icon: '🎨',
      color: '#e83e8c',
      sortOrder: 7
    },
    {
      name: 'Other',
      slug: 'other',
      description: 'Miscellaneous items',
      icon: '📦',
      color: '#6c757d',
      sortOrder: 8
    }
  ];

  for (const category of categories) {
    await Category.findOneAndUpdate(
      { slug: category.slug },
      category,
      { upsert: true, new: true }
    );
  }

  console.log('Categories seeded successfully');
};

const seedSampleProducts = async () => {
  // Get a sample user (create one if doesn't exist)
  let user = await User.findOne();
  if (!user) {
    user = await User.create({
      firstName: 'Sample',
      lastName: 'User',
      email: 'sample@example.com',
      password: 'password123',
      profilePicture: '/assets/images/helmet.jpg'
    });
  }

  // Get categories
  const electronics = await Category.findOne({ slug: 'electronics' });
  const books = await Category.findOne({ slug: 'books' });
  const clothing = await Category.findOne({ slug: 'clothing' });
  const home = await Category.findOne({ slug: 'home-garden' });
  const sports = await Category.findOne({ slug: 'sports-recreation' });

  const sampleProducts = [
    {
      user: user._id,
      title: 'iPhone 11',
      type: 'sell',
      sell_price: '30000',
      condition: 'good',
      usage: '1 year',
      location: 'Kathmandu',
      delivery_type: 'physical',
      payment: 'Cash',
      description: 'A slightly used iPhone 11 in good condition. Comes with the original box and charger. Battery health is at 85%.',
      productGroup: electronics._id,
      primaryImage: '/assets/images/iphone.jpg',
      descriptiveImages: ['/assets/images/iphone.jpg'],
      tags: ['iphone', 'smartphone', 'apple', 'mobile']
    },
    {
      user: user._id,
      title: 'Bike Helmet',
      type: 'giveaway',
      condition: 'new',
      location: 'Lalitpur',
      delivery_type: 'physical',
      description: 'Brand new bike helmet, never used. Size is medium. Perfect for city cycling.',
      productGroup: sports._id,
      primaryImage: '/assets/images/helmet.jpg',
      descriptiveImages: ['/assets/images/helmet.jpg'],
      tags: ['helmet', 'bike', 'safety', 'cycling']
    },
    {
      user: user._id,
      title: 'Classic Novels Collection',
      type: 'exchange',
      desired_item: 'Modern sci-fi books',
      condition: 'good',
      usage: '6 months',
      location: 'Bhaktapur',
      delivery_type: 'physical',
      payment: 'Exchange only',
      description: 'A collection of classic novels. Includes works by Hemingway, Fitzgerald, and Orwell. Looking to exchange for modern sci-fi.',
      productGroup: books._id,
      primaryImage: '/assets/images/books.jpg',
      descriptiveImages: ['/assets/images/books.jpg'],
      tags: ['books', 'novels', 'classic', 'literature']
    },
    {
      user: user._id,
      title: 'Vintage Sunset Print',
      type: 'sell',
      sell_price: '5000',
      condition: 'new',
      location: 'Pokhara',
      delivery_type: 'online',
      payment: 'Online transfer',
      description: 'A beautiful vintage print of a sunset over the mountains. Framed and ready to hang.',
      productGroup: home._id,
      primaryImage: '/assets/images/sunset.jpg',
      descriptiveImages: ['/assets/images/sunset.jpg'],
      tags: ['art', 'print', 'vintage', 'decoration']
    },
    {
      user: user._id,
      title: 'HD Video Camera',
      type: 'sell',
      sell_price: '15000',
      condition: 'good',
      usage: '2 years',
      location: 'Butwal',
      delivery_type: 'physical',
      payment: 'Cash',
      description: 'A reliable HD video camera, great for vlogging or family videos. Comes with a carrying case and extra batteries.',
      productGroup: electronics._id,
      primaryImage: '/assets/images/reuse.png',
      descriptiveImages: ['/assets/images/reuse.png'],
      tags: ['camera', 'video', 'vlogging', 'hd']
    }
  ];

  for (const product of sampleProducts) {
    await Product.findOneAndUpdate(
      { title: product.title },
      product,
      { upsert: true, new: true }
    );
  }

  console.log('Sample products seeded successfully');
};

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    await seedCategories();
    await seedSampleProducts();

    console.log('Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

// Run the seed function if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedCategories, seedSampleProducts }; 