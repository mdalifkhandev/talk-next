'use client';

import { useState, useEffect } from 'react';
import ChatSidebar from '@/components/chat/ChatSidebar';
import ChatWindow from '@/components/chat/ChatWindow';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Simple auth check. In a real app, use Context or Middleware.
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // We can add a /api/auth/me to fetch user details.
        // For now, if we redirected from login we might have user data, but best to fetch it.
        // I'll assume my /api/auth/login returned user but we need to persist it or fetch again.
        // I haven't implemented /api/auth/me. 
        // I will implement a quick client-side decode or just rely on cookie presence
        // and maybe fetch `search` without query which excludes self but doesn't give "ME".

        // Let's rely on stored user in localStorage if we had it, or just use a token decode.
        // Or better, let's just make it required to fetch "ME".
        // Since I didn't verify the token on client, I'll redirect to login if no token.
        // But I can't read httpOnly cookie in client JS.

        // NOTE: I'll simulate "ME" fetch by calling a protected route that returns my data.
        // I'll create /api/users/me quickly or just use search?q=myemail which is weird.

        // Quick fix: I will assume the user has logged in and I'll redirect if requests fail with 401.
        // However, I need the `currentUser._id` for socket.

        // I will blindly decode the token in a real app, but here I can't read the cookie.
        // I will implement `/api/auth/me` to get current user.
        const res = await fetch('/api/auth/me'); // Need to implement this
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        setCurrentUser(data);
      } catch (e) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  const handleNotificationClick = async (notification: any) => {
    // Navigate based on notification type
    if (notification.type === 'message' || notification.type === 'call') {
      if (notification.fromUser) {
        // Fetch user details and select chat
        try {
          const res = await fetch(`/api/users/${notification.fromUser}`);
          if (res.ok) {
            const user = await res.json();
            setSelectedUser(user);
          }
        } catch (error) {
          console.error('Failed to fetch user for notification', error);
        }
      }
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <div className="flex h-screen overflow-hidden">
      <ChatSidebar
        onSelectChat={setSelectedUser}
        currentUser={currentUser}
        onNotificationClick={handleNotificationClick}
      />
      <ChatWindow
        currentUser={currentUser}
        selectedUser={selectedUser}
      />
    </div>
  );
}
