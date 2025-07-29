import React, { useState, useEffect } from 'react';

const CreatePostModal = ({ isOpen, onClose, onSubmit, initialData, isEdit }) => {
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [context, setContext] = useState('');
  const [image, setImage] = useState(null);
  const [tags, setTags] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setContent(initialData.content || '');
      setVisibility(initialData.visibility || 'public');
      setContext(initialData.context || '');
      setTags(initialData.tags || '');
      setImage(null); // Don't prefill image
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!content.trim()) {
      setError('Content is required');
      return;
    }
    const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    onSubmit({ content, visibility, context, image, tags: tagArray });
    handleClose();
  };

  const handleClose = () => {
    setContent('');
    setVisibility('public');
    setContext('');
    setImage(null);
    setTags('');
    setError('');
    onClose();
  };

  // Don't render anything if not open
  if (!isOpen) {
    return null;
  }

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999
      }}
      onClick={handleClose}
    >
      <div 
        style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          width: '90%',
          maxWidth: '500px',
          maxHeight: '80vh',
          overflowY: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>{isEdit ? 'Edit Post' : 'Create New Post'}</h2>
          <button 
            onClick={handleClose} 
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '24px', 
              cursor: 'pointer',
              padding: '0',
              width: '30px',
              height: '30px'
            }}
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Context:</label>
            <select 
              value={context} 
              onChange={e => setContext(e.target.value)} 
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="">Select context</option>
              <option value="general">General</option>
              <option value="eco-friendly">Eco-friendly</option>
              <option value="trade">Trade</option>
              <option value="community">Community</option>
              <option value="announcement">Announcement</option>
            </select>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Visibility:</label>
            <select 
              value={visibility} 
              onChange={e => setVisibility(e.target.value)} 
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
              <option value="friends">Friends Only</option>
            </select>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Content:</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="What's on your mind?"
              rows={4}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', resize: 'vertical' }}
              required
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Photo:</label>
            <input
              type="file"
              accept="image/*"
              onChange={e => setImage(e.target.files[0])}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Tags (comma-separated):</label>
            <input
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="eco, trade, community"
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>

          {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleClose}
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: '#007bff',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              {isEdit ? 'Save Changes' : 'Create Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePostModal; 