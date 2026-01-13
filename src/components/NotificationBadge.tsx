'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { socket } from '@/lib/socket';

interface NotificationBadgeProps {
    onNotificationClick?: (notification: any) => void;
}

export default function NotificationBadge({ onNotificationClick }: NotificationBadgeProps) {
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [showPanel, setShowPanel] = useState(false);

    useEffect(() => {
        fetchNotifications();

        const handleNewNotification = (notification: any) => {
            setNotifications(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);

            // Show browser notification if enabled
            if (Notification.permission === 'granted') {
                new Notification(notification.message, {
                    icon: '/icon.png',
                    badge: '/badge.png'
                });
            }
        };

        socket.on('new_notification', handleNewNotification);

        return () => {
            socket.off('new_notification', handleNewNotification);
        };
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/notifications');
            const data = await res.json();
            setNotifications(data);
            setUnreadCount(data.filter((n: any) => !n.read).length);
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
    };

    const markAsRead = async () => {
        const unreadIds = notifications.filter(n => !n.read).map(n => n._id);
        if (unreadIds.length === 0) return;

        try {
            await fetch('/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationIds: unreadIds })
            });
            setUnreadCount(0);
            fetchNotifications();
        } catch (error) {
            console.error('Failed to mark as read', error);
        }
    };

    const handleNotificationClick = (notif: any) => {
        // Close panel
        setShowPanel(false);

        // Call parent callback if provided
        if (onNotificationClick) {
            onNotificationClick(notif);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => {
                    setShowPanel(!showPanel);
                    if (!showPanel) markAsRead();
                }}
                className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
                <Bell className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {showPanel && (
                <div className="fixed sm:absolute right-0 sm:right-0 mt-4 -mr-44 w-[calc(100vw-1rem)] sm:w-96 max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-[80vh] sm:max-h-96 overflow-y-auto">
                    <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                    </div>
                    {notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">No notifications</div>
                    ) : (
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {notifications.map((notif) => (
                                <div
                                    key={notif._id}
                                    onClick={() => handleNotificationClick(notif)}
                                    className={`p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${!notif.read ? 'bg-primary/5' : ''
                                        }`}
                                >
                                    <p className="text-sm text-gray-900 dark:text-white line-clamp-2">{notif.message}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {new Date(notif.createdAt).toLocaleString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
