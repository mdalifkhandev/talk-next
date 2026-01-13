"use client";

import { useState, useEffect } from "react";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatWindow from "@/components/chat/ChatWindow";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        setCurrentUser(data);
      } catch (e) {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  const handleNotificationClick = async (notification: any) => {
    // Navigate based on notification type
    if (notification.type === "message" || notification.type === "call") {
      if (notification.fromUser) {
        // Fetch user details and select chat
        try {
          const res = await fetch(`/api/users/${notification.fromUser}`);
          if (res.ok) {
            const user = await res.json();
            setSelectedUser(user);
          }
        } catch (error) {
          console.error("Failed to fetch user for notification", error);
        }
      }
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );

  return (
    <div className="flex h-screen overflow-hidden">
      <ChatSidebar
        onSelectChat={setSelectedUser}
        currentUser={currentUser}
        onNotificationClick={handleNotificationClick}
      />
      <ChatWindow currentUser={currentUser} selectedUser={selectedUser} />
    </div>
  );
}
