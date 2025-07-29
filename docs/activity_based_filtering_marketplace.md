# Activity-Based Filtering for Marketplace Products

## Concept
Recommends products based on aggregate implicit user interactions (views, clicks, offers/requests) across all users. Products with higher engagement, weighted by action importance, are prioritized in recommendations.

---

## Mechanics

### 1. Track Activities
Log user actions for each product:
- **Views:** User sees a product in the marketplace.
- **Clicks:** User clicks to view product details.
- **Offers/Requests:** User initiates a trade, offer, or purchase.

### 2. Calculate Relevance Scores
Assign weights to each action (e.g., offer > click > view).

### 3. Compute for Each Product
For each product, calculate:

    Score = (wv × views) + (wc × clicks) + (wo × offers)

Where:
- `wv`, `wc`, `wo` are predefined weights (e.g., 0.1, 0.3, 0.6).
- Weights reflect action intent (e.g., an offer signals stronger interest than a view).

### 4. Recommend Top-Scoring Products
Rank products by their scores and recommend the highest-scoring ones to users.

---

## Example

- **Products:** Product X, Product Y
- **Activity Counts:**
  - Product X: 150 views, 50 clicks, 15 offers
  - Product Y: 100 views, 80 clicks, 10 offers
- **Weights:** wv = 0.1, wc = 0.3, wo = 0.6

**Calculate Scores:**
- Product X: (0.1×150) + (0.3×50) + (0.6×15) = 15 + 15 + 9 = **39**
- Product Y: (0.1×100) + (0.3×80) + (0.6×10) = 10 + 24 + 6 = **40**

**Result:** Product Y (score 40) > Product X (score 39). Recommend Product Y more prominently.

---

## Implementation Details

### Data Model (MongoDB Example)
Add activity counters to each product document:
```js
// In Product.js (Mongoose schema)
activity: {
  views: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  offers: { type: Number, default: 0 }
}
```

### Logging Activities
Increment counters on each relevant API endpoint:
```js
// When a product is viewed
await Product.findByIdAndUpdate(productId, { $inc: { 'activity.views': 1 } });

// When a product is clicked (details viewed)
await Product.findByIdAndUpdate(productId, { $inc: { 'activity.clicks': 1 } });

// When an offer/request is made
await Product.findByIdAndUpdate(productId, { $inc: { 'activity.offers': 1 } });
```

### Recommendation Algorithm (Node.js Example)
```js
// Weights
const wv = 0.1, wc = 0.3, wo = 0.6;

// Fetch all products
const products = await Product.find();

// Compute scores
const scoredProducts = products.map(product => {
  const { views = 0, clicks = 0, offers = 0 } = product.activity || {};
  const score = (wv * views) + (wc * clicks) + (wo * offers);
  return { ...product.toObject(), score };
});

// Sort by score descending
scoredProducts.sort((a, b) => b.score - a.score);

// Recommend top N products
const recommended = scoredProducts.slice(0, N); // N = number of recommendations
```

### API Endpoint Example
```js
// GET /api/products/recommended
router.get('/products/recommended', async (req, res) => {
  // ...use the above algorithm...
  res.json(recommended);
});
```

---

## Notes
- Weights (`wv`, `wc`, `wo`) can be tuned based on observed user behavior.
- This method is simple, scalable, and works well for cold-start scenarios.
- Can be combined with collaborative or content-based filtering for more personalization. 