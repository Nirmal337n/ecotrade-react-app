import React from 'react';
import Header from '../components/Header';

const Friends = () => (
  <div>
    <Header />
    <div className="container">
      <h1>Friends</h1>
    </div>
  </div>
);

const Messages = () => (
  <div>
    <Header />
    <div className="container">
      <h1>Messages</h1>
    </div>
  </div>
);

const Profile = () => (
  <div>
    <Header />
    <div className="container">
      <h1>Manage Profile</h1>
    </div>
  </div>
);

export { Friends, Messages, Profile }; 