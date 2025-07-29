const mongoose = require('mongoose');
const User = require('../models/User');

// Cosine similarity between two tag vectors (as JS Maps)
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

async function main() {
  await mongoose.connect('mongodb://localhost:27017/ecotrade', { useNewUrlParser: true, useUnifiedTopology: true });
  const users = await User.find();
  for (const userA of users) {
    const similarities = [];
    for (const userB of users) {
      if (userA._id.equals(userB._id)) continue;
      const sim = cosineSimilarity(userA.tagVector || new Map(), userB.tagVector || new Map());
      similarities.push({ userId: userB._id, sim });
    }
    similarities.sort((a, b) => b.sim - a.sim);
    userA.similarUsers = similarities.slice(0, 10).map(s => s.userId);
    await userA.save();
    console.log(`Updated similarUsers for ${userA.email}`);
  }
  await mongoose.disconnect();
  console.log('Done.');
}

main().catch(err => { console.error(err); process.exit(1); }); 