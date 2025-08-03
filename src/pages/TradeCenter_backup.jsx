import React, { useState, useEffect, useMemo } from 'react';
import Header from '../components/Header';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faPaperclip } from '@fortawesome/free-solid-svg-icons';
import './TradeCenter.css';

// Green color palette
const PRIMARY_GREEN = '#27ae60';
const LIGHT_GREEN = '#eafaf1';
const DARK_GREEN = '#219150';
const BORDER_RADIUS = 16;
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
            setMessages(prev => [...prev, latestMessage]);
            onMessageSent(trade._id, latestMessage);
            setNewMessage('');
            setTimeout(() => setImageFile(null), 0);
            const fileInput = document.getElementById('file-upload');
            if (fileInput) fileInput.value = null;
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    return (
        <div className="chat-modal-overlay" onClick={onClose} style={{ background: 'rgba(39, 174, 96, 0.12)', zIndex: 1000 }}>
            <div className="chat-modal-content" onClick={e => e.stopPropagation()} style={{ borderRadius: BORDER_RADIUS, boxShadow: '0 8px 32px rgba(39,174,96,0.18)', background: '#fff', padding: 0, minWidth: 400, maxWidth: 500 }}>
                <div className="chat-header" style={{ padding: '16px 20px', borderBottom: `1px solid ${LIGHT_GREEN}`, color: PRIMARY_GREEN, fontWeight: 700, fontSize: 16 }}>
                    Chat for Trade: {trade.product?.title || 'Product'}
                </div>
                <div className="chat-messages" style={{ padding: '16px 20px', maxHeight: 400, overflowY: 'auto', minHeight: 200 }}>
                    {messages.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#aaa', fontStyle: 'italic', padding: 20 }}>No messages yet. Start the conversation!</div>
                    ) : (
                        messages.map((msg) => {
                            const isOwn = msg.sender?._id === currentUser._id;
                            return (
                                <div key={msg._id} style={{
                                    marginBottom: 12,
                                    display: 'flex',
                                    justifyContent: isOwn ? 'flex-end' : 'flex-start'
                                }}>
                                    <div style={{
                                        background: isOwn ? PRIMARY_GREEN : LIGHT_GREEN,
                                        color: isOwn ? '#fff' : PRIMARY_GREEN,
                                        padding: '10px 14px',
                                        borderRadius: isOwn ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                                        maxWidth: '70%',
                                        fontWeight: 500,
                                        fontSize: 14,
                                        lineHeight: 1.4,
                                        boxShadow: isOwn ? '0 2px 8px rgba(39,174,96,0.10)' : '0 1px 4px rgba(39,174,96,0.07)',
                                    }}>
                                        <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4, opacity: 0.8 }}>
                                            {isOwn ? 'You' : (msg.sender?.firstName || 'Other User')}
                                        </div>
                                        {msg.imageUrl && <img src={`${API_URL}${msg.imageUrl}`.replace('/api', '')} alt="attachment" className="message-image" style={{ maxWidth: '180px', borderRadius: 8, marginBottom: 6, boxShadow: '0 2px 8px rgba(39,174,96,0.10)' }} />}
                                        <div>{msg.content}</div>
                                        <div style={{ fontSize: 11, marginTop: 4, opacity: 0.6 }}>
                                            {new Date(msg.createdAt).toLocaleTimeString()}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSendMessage} className="chat-input" style={{ padding: '16px 20px', borderTop: `1px solid ${LIGHT_GREEN}`, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input 
                        type="text" 
                        value={newMessage} 
                        onChange={(e) => setNewMessage(e.target.value)} 
                        placeholder="Type your message..." 
                        style={{ flex: 1, padding: '10px 14px', border: `1px solid ${LIGHT_GREEN}`, borderRadius: 20, outline: 'none', fontSize: 14 }}
                    />
                    <label htmlFor="file-upload" style={{ cursor: 'pointer', color: PRIMARY_GREEN, fontSize: 16, padding: '8px 10px' }}>
                        <FontAwesomeIcon icon={faPaperclip} />
                        <input id="file-upload" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} style={{ display: 'none' }} />
                    </label>
                    <button type="submit" disabled={!newMessage.trim() && !imageFile} style={{ background: PRIMARY_GREEN, color: '#fff', border: 'none', borderRadius: 20, padding: '10px 16px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
};

const TradeTable = ({ trades, onChatClick, onAction, role, currentUser }) => (
    <div className="trade-table-container" style={{ background: '#fff', borderRadius: BORDER_RADIUS, boxShadow: '0 4px 16px rgba(39,174,96,0.08)', overflow: 'hidden' }}>
        <table className="trade-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: LIGHT_GREEN }}>
                <tr>
                    <th style={{ padding: '16px 12px', textAlign: 'left', color: PRIMARY_GREEN, fontWeight: 700, fontSize: 14 }}>Product</th>
                    <th style={{ padding: '16px 12px', textAlign: 'left', color: PRIMARY_GREEN, fontWeight: 700, fontSize: 14 }}>Quantity</th>
                    <th style={{ padding: '16px 12px', textAlign: 'left', color: PRIMARY_GREEN, fontWeight: 700, fontSize: 14 }}>Offered Items</th>
                    <th style={{ padding: '16px 12px', textAlign: 'left', color: PRIMARY_GREEN, fontWeight: 700, fontSize: 14 }}>Trade Partner</th>
                    <th style={{ padding: '16px 12px', textAlign: 'left', color: PRIMARY_GREEN, fontWeight: 700, fontSize: 14 }}>Status</th>
                    <th style={{ padding: '16px 12px', textAlign: 'left', color: PRIMARY_GREEN, fontWeight: 700, fontSize: 14 }}>Date</th>
                    <th style={{ padding: '16px 12px', textAlign: 'center', color: PRIMARY_GREEN, fontWeight: 700, fontSize: 14 }}>Actions</th>
                </tr>
            </thead>
            <tbody>
                {trades.length > 0 ? trades.map((trade) => {
                    const partner = role === 'seller' ? trade.buyer : trade.seller;
                    const unseenCount = trade.messages?.filter(msg => !msg.seenBy?.includes(currentUser._id)).length || 0;
                    const unseen = unseenCount > 0;
                    
                    return (
                        <tr key={trade._id} style={{ borderBottom: `1px solid ${LIGHT_GREEN}` }}>
                            <td style={{ padding: '16px 12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <img src={trade.product?.images?.[0] || '/placeholder.png'} alt={trade.product?.title || 'Product'} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                                    <div>
                                        <div style={{ fontWeight: 600, color: PRIMARY_GREEN, fontSize: 14 }}>{trade.product?.title || 'N/A'}</div>
                                        <div style={{ fontSize: 12, color: '#777' }}>{trade.product?.category || 'Category'}</div>
                                    </div>
                                </div>
                            </td>
                            <td style={{ padding: '16px 12px', color: PRIMARY_GREEN, fontWeight: 600 }}>{trade.quantity || 'N/A'}</td>
                            <td style={{ padding: '16px 12px' }}>
                                <div style={{ maxWidth: 200 }}>
                                    {trade.offeredItems?.length > 0 ? 
                                        trade.offeredItems.map(item => `${item.name} (${item.quantity})`).join(', ') 
                                        : 'No items offered'
                                    }
                                </div>
                            </td>
                            <td style={{ padding: '16px 12px' }}>
                                <div style={{ fontWeight: 600, color: PRIMARY_GREEN }}>{partner?.firstName || 'Unknown'} {partner?.lastName || ''}</div>
                                <div style={{ fontSize: 12, color: '#777' }}>{partner?.email || 'No email'}</div>
                            </td>
                            <td style={{ padding: '16px 12px' }}>
                                <span style={{
                                    padding: '4px 10px',
                                    borderRadius: 12,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    background: trade.status === 'agreed' ? '#d4edda' : trade.status === 'pending' ? '#fff3cd' : '#f8d7da',
                                    color: trade.status === 'agreed' ? '#155724' : trade.status === 'pending' ? '#856404' : '#721c24'
                                }}>
                                    {trade.status || 'Unknown'}
                                </span>
                            </td>
                            <td style={{ padding: '16px 12px', color: '#666', fontSize: 13 }}>
                                {new Date(trade.createdAt).toLocaleDateString()}
                            </td>
                            <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                                <button className="btn-chat" onClick={() => onChatClick(trade)} style={{ background: LIGHT_GREEN, color: PRIMARY_GREEN, border: 'none', borderRadius: 8, fontWeight: 700, padding: '6px 10px', marginRight: 4, cursor: 'pointer', position: 'relative', boxShadow: '0 1px 4px rgba(39,174,96,0.07)' }}>
                                    <FontAwesomeIcon icon={faEye} />
                                    {unseen && (
                                        <span style={{
                                            position: 'absolute',
                                            top: 2,
                                            right: 2,
                                            width: 10,
                                            height: 10,
                                            background: '#e74c3c',
                                            borderRadius: '50%',
                                            display: 'inline-block',
                                            border: '2px solid white',
                                        }} />
                                    )}
                                </button>
                                {/* Show actions only for pending sales */}
                                {role === 'seller' && trade.status === 'pending' && (
                                    <>
                                        <button className="btn-accept" onClick={() => onAction(trade._id, 'agreed')} style={{ background: PRIMARY_GREEN, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, padding: '6px 14px', marginRight: 4, cursor: 'pointer', boxShadow: '0 1px 4px rgba(39,174,96,0.07)' }}>Accept</button>
                                        <button className="btn-reject" onClick={() => onAction(trade._id, 'rejected')} style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, padding: '6px 14px', cursor: 'pointer', boxShadow: '0 1px 4px rgba(231,76,60,0.07)' }}>Reject</button>
                                    </>
                                )}
                            </td>
                        </tr>
                    );
                }) : (
                    <tr><td colSpan="7" style={{ textAlign: 'center', color: '#aaa', padding: 24 }}>No trades found.</td></tr>
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

    // Filtered trades for tabs and search
    const filteredTrades = useMemo(() => {
        const filterByProduct = (arr) => arr.filter(trade =>
            trade.product?.title?.toLowerCase().includes(productFilter.toLowerCase())
        );
        return {
            sales: filterByProduct(sales),
            offers: filterByProduct(offers),
            pending: filterByProduct([...sales, ...offers].filter(t => t.status === 'pending')),
            history: filterByProduct(history),
        };
    }, [sales, offers, history, productFilter]);

    useEffect(() => {
        fetchTrades();
        fetchCurrentUser();
    }, []);

    const fetchCurrentUser = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/users/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const user = await res.json();
                setCurrentUser(user);
            }
        } catch (error) {
            console.error('Error fetching current user:', error);
        }
    };

    const fetchTrades = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/trades/my-trades`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!res.ok) throw new Error('Failed to fetch trades');
            
            const data = await res.json();
            setSales(data.sales || []);
            setOffers(data.offers || []);
            setHistory(data.history || []);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChatClick = (trade) => {
        setSelectedTrade(trade);
    };

    const handleAction = async (tradeId, action) => {
        try {
            const res = await fetch(`${API_BASE_URL}/trades/${tradeId}/${action}`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!res.ok) throw new Error(`Failed to ${action} trade`);
            
            // Refresh trades after action
            fetchTrades();
        } catch (error) {
            setError(error.message);
        }
    };

    const handleMessageSent = (tradeId, message) => {
        // Update the trade with the new message
        const updateTrade = (tradesList) => 
            tradesList.map(trade => 
                trade._id === tradeId 
                    ? { ...trade, messages: [...(trade.messages || []), message] }
                    : trade
            );
        
        setSales(updateTrade);
        setOffers(updateTrade);
        setHistory(updateTrade);
    };

    const renderContent = () => {
        if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>Loading trades...</div>;
        if (error) return <div style={{ textAlign: 'center', padding: 40, color: '#e74c3c' }}>Error: {error}</div>;

        switch (activeTab) {
            case 'sales':
                return <TradeTable trades={filteredTrades.sales} onChatClick={handleChatClick} onAction={handleAction} role="seller" currentUser={currentUser} />;
            case 'offers':
                return <TradeTable trades={filteredTrades.offers} onChatClick={handleChatClick} onAction={handleAction} role="buyer" currentUser={currentUser} />;
            case 'pending':
                return <TradeTable trades={filteredTrades.pending} onChatClick={handleChatClick} onAction={handleAction} role="both" currentUser={currentUser} />;
            case 'history':
                return <TradeTable trades={filteredTrades.history} onChatClick={handleChatClick} onAction={handleAction} role="both" currentUser={currentUser} />;
            default:
                return null;
        }
    };

    return (
        <>
            <div style={{ position: 'sticky', top: 0, zIndex: 2000, background: '#fff', boxShadow: '0 2px 12px rgba(39,174,96,0.08)' }}>
                <Header />
            </div>
            <div className="trade-center-container" style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 0 32px 0' }}>
                <h1 style={{ color: PRIMARY_GREEN, fontWeight: 900, fontSize: 36, marginBottom: 18, letterSpacing: 1 }}>Trade Center</h1>
                <div className="trade-center-controls" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                    <div className="trade-tabs" style={{ display: 'flex', gap: 12 }}>
                        <button className={`tab ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setActiveTab('sales')} style={{ background: activeTab === 'sales' ? PRIMARY_GREEN : LIGHT_GREEN, color: activeTab === 'sales' ? '#fff' : PRIMARY_GREEN, border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 16, padding: '10px 28px', boxShadow: activeTab === 'sales' ? '0 2px 8px rgba(39,174,96,0.10)' : 'none', cursor: 'pointer', transition: 'background 0.2s' }}>My Sales ({filteredTrades.sales.length})</button>
                        <button className={`tab ${activeTab === 'offers' ? 'active' : ''}`} onClick={() => setActiveTab('offers')} style={{ background: activeTab === 'offers' ? PRIMARY_GREEN : LIGHT_GREEN, color: activeTab === 'offers' ? '#fff' : PRIMARY_GREEN, border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 16, padding: '10px 28px', boxShadow: activeTab === 'offers' ? '0 2px 8px rgba(39,174,96,0.10)' : 'none', cursor: 'pointer', transition: 'background 0.2s' }}>My Offers ({filteredTrades.offers.length})</button>
                        <button className={`tab ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')} style={{ background: activeTab === 'pending' ? PRIMARY_GREEN : LIGHT_GREEN, color: activeTab === 'pending' ? '#fff' : PRIMARY_GREEN, border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 16, padding: '10px 28px', boxShadow: activeTab === 'pending' ? '0 2px 8px rgba(39,174,96,0.10)' : 'none', cursor: 'pointer', transition: 'background 0.2s' }}>Pending Actions ({filteredTrades.pending.length})</button>
                        <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')} style={{ background: activeTab === 'history' ? PRIMARY_GREEN : LIGHT_GREEN, color: activeTab === 'history' ? '#fff' : PRIMARY_GREEN, border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 16, padding: '10px 28px', boxShadow: activeTab === 'history' ? '0 2px 8px rgba(39,174,96,0.10)' : 'none', cursor: 'pointer', transition: 'background 0.2s' }}>History ({filteredTrades.history.length})</button>
                    </div>
                    <div className="filter-container" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input 
                            type="text" 
                            className="product-filter" 
                            value={productFilter} 
                            onChange={(e) => setProductFilter(e.target.value)} 
                            placeholder="Filter by product name..." 
                            style={{ borderRadius: 10, border: `1.5px solid ${PRIMARY_GREEN}`, padding: '8px 16px', fontSize: 15, outline: 'none', background: LIGHT_GREEN, color: PRIMARY_GREEN, fontWeight: 600 }} 
                        />
                        <button 
                            className="filter-btn" 
                            style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: PRIMARY_GREEN, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 1px 4px rgba(39,174,96,0.07)' }} 
                            title="Product Filter"
                        >
                            Filter
                        </button>
                    </div>
                </div>
                {renderContent()}
                {selectedTrade && currentUser && (
                    <ChatModal 
                        trade={selectedTrade}
                        currentUser={currentUser}
                        onClose={() => setSelectedTrade(null)}
                        onMessageSent={handleMessageSent}
                    />
                )}
            </div>
        </>
    );
};

export default TradeCenter;