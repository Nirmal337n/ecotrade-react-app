# Post Prioritization Algorithm in Ecotrade

## Overview
This algorithm personalizes the order of posts shown to each user on the Dashboard. Posts containing tags that the user has interacted with most (liked, commented, or created) are prioritized and appear higher in the feed.

---

## Mathematical Description

### 1. Tag Frequency Map
For each tag, count how many times the user has interacted with it:

$$
\text{TagFrequency}(t) = \sum_{p \in \text{Posts}} \text{Interacted}(p) \cdot \text{CountTag}(p, t)
$$

Where:
- $\text{Interacted}(p)$ is 1 if the user liked, commented, or created post $p$, else 0.
- $\text{CountTag}(p, t)$ is 1 if tag $t$ is in post $p$'s tags, else 0.

This results in a map:

$$
\text{TagFrequency} = \{ t_1: f_1, t_2: f_2, ... \}
$$

### 2. Score Each Post
For each post, sum the frequencies of its tags:

$$
\text{Score}(p) = \sum_{t \in \text{Tags}(p)} \text{TagFrequency}(t)
$$

Posts with higher scores (i.e., more matching/high-frequency tags) are prioritized.

### 3. Sort Posts
Sort all posts in descending order of their score:

$$
\text{PostsSorted} = \text{SortDescendingByScore}(\text{Posts})
$$

---

## Implementation in Code

### 1. Build Tag Frequency Map
In `Dashboard.jsx`:
```js
useEffect(() => {
  if (!myId || posts.length === 0) return;
  const freq = {};
  posts.forEach(post => {
    // If user liked, commented, or created the post, count its tags
    const interacted =
      (post.likes && post.likes.includes(myId)) ||
      (post.comments && post.comments.some(c => c.user === myId)) ||
      (post.user && post.user._id === myId);
    if (interacted && Array.isArray(post.tags)) {
      post.tags.forEach(tag => {
        freq[tag] = (freq[tag] || 0) + 1;
      });
    }
  });
  setTagFrequency(freq);
}, [myId, posts]);
```

### 2. Score Each Post
```js
const scoredPosts = posts.map(post => {
  let score = 0;
  if (Array.isArray(post.tags)) {
    post.tags.forEach(tag => {
      score += tagFrequency[tag] || 0;
    });
  }
  return { ...post, _tagScore: score };
});
```

### 3. Sort Posts
```js
const prioritizedPosts = [...scoredPosts].sort((a, b) => b._tagScore - a._tagScore);
```

### 4. Render Prioritized Posts
```js
{prioritizedPosts.filter(post => post.user && post.user._id !== myId).map((post, index) => (
  // ...render post...
))}
```

---

## Summary
- **User Interactions:** Likes, comments, and authored posts are used to build a tag frequency map.
- **Post Scoring:** Each post is scored by summing the frequencies of its tags.
- **Sorting:** Posts are sorted by this score, so the most relevant (by your own history) appear first.

This approach is a simple, effective form of content personalization using collaborative filtering principles, tailored for your tag-based social feed. 