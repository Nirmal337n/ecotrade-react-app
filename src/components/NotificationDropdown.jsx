import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const NotificationDropdown = ({ notifications, onMarkAsRead, onClose }) => {
    const navigate = useNavigate();
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                onClose();
            }
        };
        // Add click listener to close dropdown
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    const handleNotificationClick = (notification) => {
        let path = '/';
        switch (notification.type) {
            case 'like':
            case 'comment':
            case 'reply':
                // Assuming you will have a single post view page
                path = `/posts/${notification.post}`; 
                break;
            case 'friend_request':
                path = '/friends';
                break;
            case 'friend_accepted':
                path = `/profile/${notification.sender?._id}`;
                break;
            case 'new_offer':
            case 'trade_accepted':
            case 'trade_rejected':
                 path = '/trade-center';
                break;
            default:
                path = '/dashboard';
        }
        
        if (!notification.read) {
            onMarkAsRead(notification._id);
        }
        navigate(path);
        onClose(); // Close dropdown after clicking
    };

    return (
        <div className="notification-dropdown" ref={dropdownRef}>
            <div className="notification-header">
                <h3>Notifications</h3>
            </div>
            {notifications.length === 0 ? (
                <p className="no-notifications">No new notifications</p>
            ) : (
                notifications.map(notif => (
                    <div
                        key={notif._id}
                        className={`notification-item ${!notif.read ? 'unread' : ''}`}
                        onClick={() => handleNotificationClick(notif)}
                    >
                        <p className="notification-content">{notif.content || `You have a new ${notif.type.replace(/_/g, ' ')}.`}</p>
                        <span className="notification-time">
                            {new Date(notif.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                ))
            )}
        </div>
    );
};

export default NotificationDropdown; 