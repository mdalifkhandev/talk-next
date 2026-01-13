"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  User,
  Search,
  MessageCircle,
  LogOut,
  UserCircle,
  Menu,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { socket } from "@/lib/socket";
import NotificationBadge from "@/components/NotificationBadge";

interface ChatSidebarProps {
  onSelectChat: (user: any) => void;
  currentUser: any;
  onNotificationClick?: (notification: any) => void;
}

export default function ChatSidebar({
  onSelectChat,
  currentUser,
  onNotificationClick,
}: ChatSidebarProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Fetch users/friends logic
    const fetchUsers = async () => {
      try {
        const res = await fetch(`/api/users/search?q=${search}`);
        const data = await res.json();
        setUsers(data);
      } catch (error) {
        console.error("Failed to fetch users", error);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchUsers();
    }, 300); // Debounce

    return () => clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    const handleStatusChange = ({
      userId,
      isOnline,
    }: {
      userId: string;
      isOnline: boolean;
    }) => {
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user._id === userId ? { ...user, isOnline } : user
        )
      );
    };

    if (socket.connected) {
      socket.on("user_status_change", handleStatusChange);
    } else {
      socket.connect();
      socket.on("connect", () => {
        socket.on("user_status_change", handleStatusChange);
      });
    }

    // Just in case it's already bound on global socket:
    socket.on("user_status_change", handleStatusChange);

    return () => {
      socket.off("user_status_change", handleStatusChange);
    };
  }, []);

  const handleLogout = async () => {
    // Clear cookie/token mechanism should be implemented in an API or just client side removal if simple
    // For now just redirect to login, real app would call logout endpoint
    document.cookie = "token=; Max-Age=0; path=/;";
    router.push("/login");
  };

  const handleSelectUser = (user: any) => {
    onSelectChat(user);
    setIsMobileMenuOpen(false); // Close mobile menu after selection
  };

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-primary text-white rounded-lg shadow-lg"
      >
        {isMobileMenuOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </button>

      {/* Sidebar */}
      <div
        className={`
                fixed md:relative inset-y-0 left-0 z-40
                w-full sm:w-80 md:w-80 lg:w-96
                border-r border-gray-200 dark:border-gray-700 
                bg-white dark:bg-gray-800 
                flex flex-col h-full
                transform transition-transform duration-300 ease-in-out
                ${
                  isMobileMenuOpen
                    ? "translate-x-0"
                    : "-translate-x-full md:translate-x-0"
                }
            `}
      >
        <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Chat
          </h1>
          <div className="flex items-center gap-1 sm:gap-2">
            <NotificationBadge onNotificationClick={onNotificationClick} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/profile")}
            >
              <UserCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-3 sm:p-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search users..."
              className="pl-8 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {users.map((user) => (
            <div
              key={user._id}
              onClick={() => handleSelectUser(user)}
              className="flex items-center gap-3 p-3 sm:p-4 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
            >
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name}
                    className="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user.email}
                </p>
              </div>
              {/* Online status indicator could go here */}
              {user.isOnline && (
                <div className="ml-auto w-2 h-2 rounded-full bg-green-500 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
