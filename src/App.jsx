import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Marketplace from './pages/Marketplace';
import ProductDetails from './pages/ProductDetails';
import FriendsPage from './components/FriendsPage';
import TradeCenter from './pages/TradeCenter';
import Login from './pages/Login';
import Register from './pages/Register';
import PrivateRoute from './components/PrivateRoute';
import ProfilePage from './pages/ProfilePage';
import './App.css';

function App() {
    return (
        <Router>
            <div className="app-container">
                <main className="main-content">
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        
                        {/* Private Routes */}
                        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                        <Route path="/marketplace" element={<PrivateRoute><Marketplace /></PrivateRoute>} />
                        <Route path="/product/:id" element={<PrivateRoute><ProductDetails /></PrivateRoute>} />
                        <Route path="/friends" element={<PrivateRoute><FriendsPage /></PrivateRoute>} />
                        <Route path="/trade-center" element={<PrivateRoute><TradeCenter /></PrivateRoute>} />
                        <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
                        <Route path="/profile/:userId" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
                        <Route path="/posts/:postId" element={<PrivateRoute><Dashboard /></PrivateRoute>} />

                        {/* Redirect any other path to dashboard */}
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;
