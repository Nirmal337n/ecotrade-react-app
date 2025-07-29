import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const interestsOptions = [
  'Technology', 'Fashion', 'Sports', 'Books', 'Music', 'Travel', 'Electronics', 'Home Decor', 'Fitness', 'Food', 'Art', 'Gaming', 'Other'
];

const Register = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [interests, setInterests] = useState([]);
  const [gender, setGender] = useState('');
  const [bio, setBio] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);
  const validatePhone = (phone) => /^\+?\d{10,15}$/.test(phone);

  const handleInterestChange = (e) => {
    const { value, checked } = e.target;
    setInterests((prev) =>
      checked ? [...prev, value] : prev.filter((i) => i !== value)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!firstName || !lastName || !address || !phone || !dateOfBirth || !gender || !email || !password || !confirmPassword) {
      setError('All required fields must be filled.');
      return;
    }
    if (!validateEmail(email)) {
      setError('Invalid email format.');
      return;
    }
    if (!validatePhone(phone)) {
      setError('Invalid phone number format.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('firstName', firstName);
      formData.append('lastName', lastName);
      formData.append('address', address);
      formData.append('phone', phone);
      formData.append('dateOfBirth', dateOfBirth);
      interests.forEach(i => formData.append('interests', i));
      formData.append('gender', gender);
      formData.append('bio', bio);
      formData.append('email', email);
      formData.append('password', password);
      if (profilePicture) formData.append('profilePicture', profilePicture);

      const response = await fetch(`${API_BASE_URL}/users/register`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Registration failed');
      setSuccess('Registration successful! Redirecting to dashboard...');
      setTimeout(() => navigate('/dashboard'), 1200);
      setFirstName(''); setLastName(''); setAddress(''); setPhone(''); setDateOfBirth(''); setInterests([]); setGender(''); setBio(''); setProfilePicture(null); setEmail(''); setPassword(''); setConfirmPassword('');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: '2rem auto', padding: 20, border: '1px solid #ccc', borderRadius: 8 }}>
      <h2>Register</h2>
      <form onSubmit={handleSubmit} encType="multipart/form-data">
        <div>
          <label>First Name:</label>
          <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} required />
        </div>
        <div>
          <label>Last Name:</label>
          <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} required />
        </div>
        <div>
          <label>Address:</label>
          <input type="text" value={address} onChange={e => setAddress(e.target.value)} required />
        </div>
        <div>
          <label>Phone:</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required />
        </div>
        <div>
          <label>Date of Birth:</label>
          <input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} required />
        </div>
        <div>
          <label>Interests:</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {interestsOptions.map(option => (
              <label key={option} style={{ minWidth: 100 }}>
                <input
                  type="checkbox"
                  value={option}
                  checked={interests.includes(option)}
                  onChange={handleInterestChange}
                /> {option}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label>Gender:</label>
          <select value={gender} onChange={e => setGender(e.target.value)} required>
            <option value="">Select</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label>Bio:</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Tell us about yourself..." />
        </div>
        <div>
          <label>Profile Picture:</label>
          <input type="file" accept="image/*" onChange={e => setProfilePicture(e.target.files[0])} />
        </div>
        <div>
          <label>Email:</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div>
          <label>Password:</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <div>
          <label>Confirm Password:</label>
          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
        </div>
        {error && <div style={{ color: 'red' }}>{error}</div>}
        {success && <div style={{ color: 'green' }}>{success}</div>}
        <button type="submit">Register</button>
      </form>
      <div style={{ marginTop: 16, textAlign: 'center' }}>
        Already have an account? <Link to="/login">Login now</Link>
      </div>
    </div>
  );
};

export default Register; 