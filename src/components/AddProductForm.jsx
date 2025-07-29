import React, { useState } from 'react';

const AddProductForm = ({ onSubmit, categories = [] }) => {
  const [formData, setFormData] = useState({
    title: '',
    type: 'sell',
    sell_price: '',
    desired_item: '',
    condition: 'new',
    usage: '',
    location: 'kathmandu',
    delivery_type: 'physical',
    payment: '',
    description: '',
    productGroup: '',
    minimum_price: '',
    valid_till: '',
    tags: [],
    contactInfo: {
      phone: '',
      email: '',
      preferredContact: 'message'
    }
  });

  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [errors, setErrors] = useState({});

  const locations = [
    { value: "kathmandu", label: "Kathmandu" },
    { value: "lalitpur", label: "Lalitpur" },
    { value: "bhaktapur", label: "Bhaktapur" },
    { value: "pokhara", label: "Pokhara" },
    { value: "butwal", label: "Butwal" },
    { value: "biratnagar", label: "Biratnagar" },
    { value: "birgunj", label: "Birgunj" },
    { value: "bharatpur", label: "Bharatpur" }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('contactInfo.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        contactInfo: {
          ...prev.contactInfo,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Clear error when user starts typing
    if (name === 'minimum_price' || name === 'sell_price') {
      setErrors(prev => ({ ...prev, minimum_price: '' }));
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setImages(files);
    
    // Create previews
    const previews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Validate minimum price for sell type
    if (formData.type === 'sell' && formData.sell_price && formData.minimum_price) {
      const sellPrice = parseFloat(formData.sell_price);
      const minPrice = parseFloat(formData.minimum_price);
      
      if (minPrice > sellPrice) {
        newErrors.minimum_price = 'Minimum price must be equal to or less than sell price';
      }
    }
    
    // Validate minimum price for exchange type
    if (formData.type === 'exchange' && formData.minimum_price) {
      const minPrice = parseFloat(formData.minimum_price);
      if (isNaN(minPrice) || minPrice <= 0) {
        newErrors.minimum_price = 'Minimum price must be a positive number';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Create product data with images
    const productData = {
      ...formData,
      images: images
    };
    
    onSubmit(productData);
  };

  const addTag = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      e.preventDefault();
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, e.target.value.trim()]
      }));
      e.target.value = '';
    }
  };

  const removeTag = (index) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }));
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="fb-post-row">
        <input 
          type="text" 
          name="title" 
          placeholder="Product Title" 
          className="fb-input" 
          value={formData.title} 
          onChange={handleInputChange} 
          required 
        />
        <select 
          name="type" 
          value={formData.type} 
          onChange={handleInputChange} 
          className="fb-select" 
          required
        >
          <option value="sell">Sell</option>
          <option value="exchange">Exchange</option>
          <option value="giveaway">Giveaway</option>
        </select>
      </div>

      <div className="fb-post-row">
        <select 
          name="productGroup" 
          value={formData.productGroup} 
          onChange={handleInputChange} 
          className="fb-select" 
          required
        >
          <option value="">Select Category</option>
          {categories.map(category => (
            <option key={category._id} value={category._id}>
              {category.name}
            </option>
          ))}
        </select>
        <select 
          name="condition" 
          value={formData.condition} 
          onChange={handleInputChange} 
          className="fb-select"
        >
          <option value="new">Brand New</option>
          <option value="like-new">Like New</option>
          <option value="good">Good</option>
          <option value="fair">Fair</option>
          <option value="poor">Poor</option>
        </select>
      </div>

      {formData.condition !== 'new' && (
        <div className="fb-post-row">
          <input 
            type="text" 
            name="usage" 
            placeholder="How long was it used? (e.g., 1 year, 6 months)" 
            className="fb-input" 
            value={formData.usage} 
            onChange={handleInputChange} 
          />
        </div>
      )}

      <div className="fb-post-row">
        {formData.type === 'sell' && (
          <input 
            type="text" 
            name="sell_price" 
            placeholder="Sell Price (e.g., 5000)" 
            className="fb-input" 
            value={formData.sell_price} 
            onChange={handleInputChange}
          />
        )}
        {formData.type === 'exchange' && (
          <input 
            type="text" 
            name="desired_item" 
            placeholder="What do you want in exchange?" 
            className="fb-input" 
            value={formData.desired_item} 
            onChange={handleInputChange}
          />
        )}
      </div>

      {/* Minimum Price Row */}
      <div className="fb-post-row">
        {(formData.type === 'sell' || formData.type === 'exchange') && (
          <div style={{ width: '100%' }}>
            <input 
              type="text" 
              name="minimum_price" 
              placeholder={formData.type === 'sell' ? "Minimum Acceptable Price (e.g., 4000)" : "Minimum value for exchange"} 
              className={`fb-input ${errors.minimum_price ? 'error' : ''}`}
              value={formData.minimum_price} 
              onChange={handleInputChange}
              style={{
                borderColor: errors.minimum_price ? '#e74c3c' : '#ddd',
                backgroundColor: errors.minimum_price ? '#fdf2f2' : 'white'
              }}
            />
            <div style={{ 
              fontSize: '11px', 
              color: '#666', 
              marginTop: '3px',
              fontStyle: 'italic'
            }}>
              {formData.type === 'sell' 
                ? 'Set the lowest price you\'re willing to accept for this item'
                : 'Set the minimum value you expect for this exchange'
              }
            </div>
          </div>
        )}
        {formData.type === 'sell' && formData.sell_price && formData.minimum_price && (
          <div style={{ 
            fontSize: '12px', 
            color: parseFloat(formData.minimum_price) <= parseFloat(formData.sell_price) ? '#2ecc71' : '#e74c3c',
            marginTop: '5px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            {parseFloat(formData.minimum_price) <= parseFloat(formData.sell_price) 
              ? '✓ Price range is valid' 
              : '⚠ Minimum price should be ≤ sell price'
            }
            {formData.sell_price && formData.minimum_price && (
              <span style={{ color: '#666', fontSize: '11px' }}>
                (Sell: NPR {formData.sell_price} | Min: NPR {formData.minimum_price})
              </span>
            )}
          </div>
        )}
      </div>

      {/* Error Display */}
      {errors.minimum_price && (
        <div style={{ 
          color: '#e74c3c', 
          fontSize: '12px', 
          marginTop: '5px',
          padding: '8px',
          backgroundColor: '#fdf2f2',
          borderRadius: '4px',
          border: '1px solid #fecaca'
        }}>
          {errors.minimum_price}
        </div>
      )}

      <div className="fb-post-row">
        <select 
          name="location" 
          value={formData.location} 
          onChange={handleInputChange} 
          className="fb-select" 
          required
        >
          {locations.map(loc => (
            <option key={loc.value} value={loc.value}>{loc.label}</option>
          ))}
        </select>
        <select 
          name="delivery_type" 
          value={formData.delivery_type} 
          onChange={handleInputChange} 
          className="fb-select" 
          required
        >
          <option value="physical">Physical Visit</option>
          <option value="online">Online Delivery</option>
        </select>
      </div>

      <div className="fb-post-row">
        <input 
          type="text" 
          name="payment" 
          placeholder="Payment method (e.g., Cash, Online transfer)" 
          className="fb-input" 
          value={formData.payment} 
          onChange={handleInputChange}
        />
        <input 
          type="date" 
          name="valid_till" 
          value={formData.valid_till} 
          onChange={handleInputChange} 
          className="fb-input" 
        />
      </div>

      <div className="fb-post-row">
        <textarea 
          name="description" 
          placeholder="Describe your product in detail..." 
          className="fb-status-textarea" 
          value={formData.description}
          onChange={handleInputChange}
          required
          rows="4"
        />
      </div>

      {/* Tags */}
      <div className="fb-post-row">
        <input 
          type="text" 
          placeholder="Add tags (press Enter to add)" 
          className="fb-input" 
          onKeyPress={addTag}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px' }}>
          {formData.tags.map((tag, index) => (
            <span 
              key={index} 
              style={{ 
                background: '#2ecc71', 
                color: 'white', 
                padding: '2px 8px', 
                borderRadius: '12px', 
                fontSize: '12px',
                cursor: 'pointer'
              }}
              onClick={() => removeTag(index)}
            >
              {tag} ×
            </span>
          ))}
        </div>
      </div>

      {/* Contact Information */}
      <div className="fb-post-row">
        <input 
          type="text" 
          name="contactInfo.phone" 
          placeholder="Phone number (optional)" 
          className="fb-input" 
          value={formData.contactInfo.phone} 
          onChange={handleInputChange}
        />
        <input 
          type="email" 
          name="contactInfo.email" 
          placeholder="Email (optional)" 
          className="fb-input" 
          value={formData.contactInfo.email} 
          onChange={handleInputChange}
        />
      </div>

      <div className="fb-post-row">
        <select 
          name="contactInfo.preferredContact" 
          value={formData.contactInfo.preferredContact} 
          onChange={handleInputChange} 
          className="fb-select"
        >
          <option value="message">Preferred: In-app message</option>
          <option value="phone">Preferred: Phone call</option>
          <option value="email">Preferred: Email</option>
        </select>
      </div>

      {/* Image Upload */}
      <div className="fb-post-row">
        <label htmlFor="images-upload" className="fb-icon-label">
          <span>Product Images (First image will be primary)</span>
        </label>
        <input 
          type="file" 
          id="images-upload" 
          onChange={handleFileChange} 
          multiple 
          accept="image/*"
          style={{display: 'block'}} 
        />
      </div>

      {/* Image Previews */}
      <div className="image-previews" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
        {imagePreviews.map((preview, index) => (
          <img 
            key={index} 
            src={preview} 
            alt={`preview ${index}`} 
            className="image-preview" 
            style={{ 
              width: '100px', 
              height: '100px', 
              objectFit: 'cover', 
              borderRadius: '8px',
              border: index === 0 ? '3px solid #2ecc71' : '1px solid #ccc'
            }} 
          />
        ))}
      </div>

      <button type="submit" className="fb-post-btn">Post Product</button>
    </form>
  );
};

export default AddProductForm; 