import React, { useState, useEffect, useMemo } from 'react';
import Header from '../components/Header';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faPaperclip } from '@fortawesome/free-solid-svg-icons';
import './TradeCenter.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ChatModal = ({ trade, currentUser, onClose, onMessageSent }) => {
    const [messages, setMessages] = useState(trade.messages || []);
    const [newMessage, setNewMessage] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const token = localStorage.getItem('token');
    const messagesEndRef = React.useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() && !imageFile) return;

        const formData = new FormData();
        formData.append('message', newMessage);
        if (imageFile) {
            formData.append('image', imageFile);
        }

        try {
            const res = await fetch(`${API_BASE_URL}/trades/${trade._id}/messages`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });

            if (!res.ok) throw new Error('Failed to send message.');

            const latestMessage = await res.json();
            // The backend sends back the populated message, which we add to our local state
            // and also pass up to the parent to update the main trade list
            setMessages(prev => [...prev, latestMessage]);
            onMessageSent(trade._id, latestMessage);
            setNewMessage('');
            setImageFile(null);
            document.getElementById('file-upload').value = null; // Clear file input
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    return (
        <div className="chat-modal-overlay" onClick={onClose}>
            <div className="chat-modal-content" onClick={e => e.stopPropagation()}>
                <div className="chat-modal-header">
                    <h3>Chat for: {trade.product.title}</h3>
                    <button onClick={onClose} className="close-btn">&times;</button>
                </div>
                <div className="chat-modal-body">
                    <div className="messages-history">
                        {messages.map((msg) => (
                            <div key={msg._id} className={`message-item ${msg.sender?._id === currentUser._id ? 'sent' : 'received'}`}>
                                <div className="message-bubble">
                                    <p className="sender-name">{msg.sender?.firstName}</p>
                                    {msg.imageUrl && <img src={`${API_URL}${msg.imageUrl}`.replace('/api', '')} alt="attachment" className="message-image" />}
                                    {msg.message && <p>{msg.message}</p>}
                                    <span className="message-time">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                    <form onSubmit={handleSendMessage} className="message-input-form">
                        <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type your message..." />
                        <label htmlFor="file-upload" className="attach-button"><FontAwesomeIcon icon={faPaperclip} /></label>
                        <input id="file-upload" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} style={{ display: 'none' }} />
                        <button type="submit">Send</button>
                    </form>
                    {imageFile && <p className="attachment-name">Attached: {imageFile.name}</p>}
                </div>
            </div>
        </div>
    );
};

const TradeTable = ({ trades, onChatClick, onAction, role, currentUser }) => (
    <div className="trade-list">
        <table className="trade-table">
            <thead>
                <tr>
                    <th>Product</th>
                    <th>Trade Type</th>
                    <th>{role === 'history' ? 'Role' : (role === 'seller' ? 'Buyer' : 'Seller')}</th>
                    <th>Offer Price</th>
                    <th>Asked Offer</th>
                    <th>Status</th>
                    <th className="actions-header">Actions</th>
                </tr>
            </thead>
            <tbody>
                {trades.length > 0 ? trades.map(trade => {
                    // Determine the other party based on the user's role in the trade
                    const isSeller = trade.seller?._id === currentUser?._id;
                    const otherParty = isSeller ? trade.buyer : trade.seller;
                    const userRoleInTrade = isSeller ? 'Seller' : 'Buyer';

                    // Trade type
                    let tradeType = 'N/A';
                    if (trade.product?.type === 'sell') tradeType = 'Sell';
                    else if (trade.product?.type === 'exchange') tradeType = 'Buy';
                    else if (trade.product?.type === 'giveaway') tradeType = 'Giveaway';

                    // Minimum price (Asked Offer)
                    const askedOffer = trade.product?.minimum_price ? `NPR ${Number(trade.product.minimum_price).toLocaleString()}` : 'N/A';

                    // Unseen message logic
                    const unseen = trade.messages?.some(m => !m.seen && m.sender !== currentUser._id);

                    return (
                        <tr key={trade._id}>
                            <td>{trade.product?.title || 'N/A'}</td>
                            <td>{tradeType}</td>
                            <td>
                                {role === 'history' 
                                    ? `${otherParty?.firstName || ''} (${userRoleInTrade})` 
                                    : (otherParty?.firstName || 'N/A')}
                            </td>
                            <td>NPR {trade.amount?.toLocaleString() || 'N/A'}</td>
                            <td>{askedOffer}</td>
                            <td><span className={`status-badge status-${trade.status.replace(/_/g, '-')}`}>{trade.status}</span></td>
                            <td className="actions-cell">
                                <button className="chat-button" onClick={() => onChatClick(trade)} title="View Chat" style={{ position: 'relative' }}>
                                    <FontAwesomeIcon icon={faEye} />
                                    {unseen && (
                                        <span style={{
                                            position: 'absolute',
                                            top: 2,
                                            right: 2,
                                            width: 10,
                                            height: 10,
                                            background: 'red',
                                            borderRadius: '50%',
                                            display: 'inline-block',
                                            border: '2px solid white',
                                        }} />
                                    )}
                                </button>
                                {/* Show actions only for pending sales */}
                                {role === 'seller' && trade.status === 'pending' && (
                                    <>
                                        <button className="btn-accept" onClick={() => onAction(trade._id, 'agreed')}>Accept</button>
                                        <button className="btn-reject" onClick={() => onAction(trade._id, 'rejected')}>Reject</button>
                                    </>
                                )}
                            </td>
                        </tr>
                    );
                }) : (
                    <tr><td colSpan="7">No trades found.</td></tr>
                )}
            </tbody>
        </table>
    </div>
);


const TradeCenter = () => {
    const [sales, setSales] = useState([]);
    const [offers, setOffers] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('sales');
    const [currentUser, setCurrentUser] = useState(null);
    const [selectedTrade, setSelectedTrade] = useState(null);
    const [productFilter, setProductFilter] = useState('');
    const token = localStorage.getItem('token');

    // Fetch all data initially and avoid re-fetching on tab change
    const fetchAllData = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const userRes = await fetch(`${API_BASE_URL}/users/me`, { headers: { 'Authorization': `Bearer ${token}` } });
             if (!userRes.ok) throw new Error('Failed to fetch user data.');
            const userData = await userRes.json();
            setCurrentUser(userData);

            const [salesRes, offersRes, historyRes] = await Promise.all([
                fetch(`${API_BASE_URL}/trades?role=seller&filter=active`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/trades?role=buyer&filter=active`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/trades?filter=history`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (!salesRes.ok || !offersRes.ok || !historyRes.ok) throw new Error('Failed to fetch trades.');
            
            setSales(await salesRes.json());
            setOffers(await offersRes.json());
            setHistory(await historyRes.json());

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchAllData();
    }, [token]);

    const handleAction = async (tradeId, response) => {
        try {
             await fetch(`${API_BASE_URL}/trades/${tradeId}/respond`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ response }),
            });
            fetchAllData(); // Refetch all data to see the change
        } catch(err) {
            setError(err.message);
        }
    };
    
    const handleMessageSent = (tradeId, newMessage) => {
        const update = (trades) => trades.map(t => t._id === tradeId ? {...t, messages: [...t.messages, newMessage]} : t);
        setSales(update);
        setOffers(update);
        setHistory(update);
    };

    const filteredTrades = useMemo(() => {
        const lowercasedFilter = productFilter.toLowerCase();
        const filterFn = (trade) => !productFilter || trade.product?.title.toLowerCase().includes(lowercasedFilter);

        return {
            sales: sales.filter(filterFn),
            offers: offers.filter(filterFn),
            history: history.filter(filterFn),
            pending: sales.filter(trade => trade.status === 'pending' && filterFn(trade)),
        }
    }, [productFilter, sales, offers, history]);

    const renderContent = () => {
        if (loading) return <p>Loading trades...</p>;
        if (error) return <p className="error-message">{error}</p>;

        switch (activeTab) {
            case 'sales':
                return <TradeTable trades={filteredTrades.sales} onChatClick={setSelectedTrade} onAction={handleAction} role="seller" currentUser={currentUser} />;
            case 'offers':
                return <TradeTable trades={filteredTrades.offers} onChatClick={setSelectedTrade} role="buyer" currentUser={currentUser} />;
            case 'pending':
                return <TradeTable trades={filteredTrades.pending} onChatClick={setSelectedTrade} onAction={handleAction} role="seller" currentUser={currentUser}/>;
            case 'history':
                return <TradeTable trades={filteredTrades.history} onChatClick={setSelectedTrade} role="history" currentUser={currentUser} />;
            default:
                return null;
        }
    };

    return (
        <>
            <Header />
            <div className="trade-center-container">
                <h1>Trade Center</h1>
                <div className="trade-center-controls">
                    <div className="trade-tabs">
                        <button className={`tab ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setActiveTab('sales')}>My Sales ({filteredTrades.sales.length})</button>
                        <button className={`tab ${activeTab === 'offers' ? 'active' : ''}`} onClick={() => setActiveTab('offers')}>My Offers ({filteredTrades.offers.length})</button>
                        <button className={`tab ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>Pending Actions ({filteredTrades.pending.length})</button>
                        <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>History ({filteredTrades.history.length})</button>
                    </div>
                    <div className="filter-container">
                        <input type="text" className="product-filter" value={productFilter} onChange={(e) => setProductFilter(e.target.value)} placeholder="Filter by product name..." />
                        <button className="filter-btn" style={{ marginLeft: 8, padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#f5f5f5', cursor: 'pointer' }} title="Product Filter">
                            Filter
                        </button>
                    </div>
                </div>

                {renderContent()}
            </div>

            {selectedTrade && currentUser && (
                <ChatModal 
                    trade={selectedTrade}
                    currentUser={currentUser}
                    onClose={() => setSelectedTrade(null)}
                    onMessageSent={handleMessageSent}
                />
            )}
        </>
    );
};

export default TradeCenter; 