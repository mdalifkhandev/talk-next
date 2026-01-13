'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Send, Phone, Video, MoreVertical, Image as ImageIcon, Mic, Smile, Heart, ThumbsUp } from 'lucide-react';
import { socket } from '@/lib/socket';
import CallModal from './CallModal';
import { useEffect as useThemeEffect } from 'react';
import { applyTheme, getStoredTheme } from '@/lib/themes';
import AudioRecorder from './AudioRecorder';
import AudioPlayer from './AudioPlayer';

interface ChatWindowProps {
    currentUser: any;
    selectedUser: any;
}

export default function ChatWindow({ currentUser, selectedUser }: ChatWindowProps) {
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [chatId, setChatId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Call State
    const [isCallOpen, setIsCallOpen] = useState(false);
    const [isVideoCall, setIsVideoCall] = useState(false);
    const [incomingCall, setIncomingCall] = useState<any>(null);
    const [showAudioRecorder, setShowAudioRecorder] = useState(false);
    const [showHeaderMenu, setShowHeaderMenu] = useState(false);
    const [filePreview, setFilePreview] = useState<{ file: File, url: string, type: string } | null>(null);

    // Initialize Socket join and apply theme
    useEffect(() => {
        if (currentUser) {
            if (!socket.connected) socket.connect();
            socket.emit('join_user', currentUser._id);

            // Apply saved theme
            const savedTheme = getStoredTheme();
            applyTheme(savedTheme);
        }
    }, [currentUser]);

    // Fetch or create chat session
    useEffect(() => {
        if (!selectedUser) return;

        const initializeChat = async () => {
            try {
                // Find existing chat or create new
                const res = await fetch('/api/chats', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ partnerId: selectedUser._id })
                });
                const chat = await res.json();
                setChatId(chat._id);

                // Fetch messages for this chat
                const msgRes = await fetch(`/api/chats/${chat._id}/messages`);
                const msgs = await msgRes.json();
                setMessages(msgs);
            } catch (error) {
                console.error('Error initializing chat', error);
            }
        };

        initializeChat();
    }, [selectedUser]);

    // Listen for incoming messages and reactions
    useEffect(() => {
        const handleReceiveMessage = (message: any) => {
            if (message.chat === chatId || message.sender === selectedUser._id) {
                setMessages((prev) => [...prev, message]);
            }
        };

        const handleReceiveReaction = ({ chatId: rxChatId, messageId, reaction }: any) => {
            if (rxChatId === chatId) {
                setMessages((prev) => prev.map(msg => {
                    if (msg._id === messageId) {
                        const existingIdx = msg.reactions?.findIndex((r: any) => r.user === selectedUser._id);
                        const newReactions = msg.reactions ? [...msg.reactions] : [];

                        // Simple toggle logic for display update (approximation until full re-fetch)
                        if (existingIdx > -1 && newReactions[existingIdx].type === reaction) {
                            newReactions.splice(existingIdx, 1);
                        } else if (existingIdx > -1) {
                            newReactions[existingIdx].type = reaction;
                        } else {
                            newReactions.push({ user: selectedUser._id, type: reaction });
                        }
                        return { ...msg, reactions: newReactions };
                    }
                    return msg;
                }));
            }
        };

        const handleIncomingCall = (data: any) => {
            setIncomingCall({
                caller: data.from,
                signal: data.signal,
                name: data.name
            });
            setIsVideoCall(true); // Default assume video/audio
            setIsCallOpen(true);
        };

        socket.on('receive_message', handleReceiveMessage);
        socket.on('receive_reaction', handleReceiveReaction);
        socket.on('call_user', handleIncomingCall);

        return () => {
            socket.off('receive_message', handleReceiveMessage);
            socket.off('receive_reaction', handleReceiveReaction);
            socket.off('call_user', handleIncomingCall);
        };
    }, [chatId, selectedUser]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || !chatId) return;

        try {
            const res = await fetch(`/api/chats/${chatId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: inputText, type: 'text' })
            });
            const savedMsg = await res.json();

            socket.emit('send_message', {
                ...savedMsg,
                receiver: selectedUser._id
            });

            setMessages((prev) => [...prev, savedMsg]);
            setInputText('');
        } catch (error) {
            console.error('Failed to send message', error);
        }
    };

    const handleReaction = async (messageId: string, reaction: string) => {
        if (!chatId) return;
        try {
            const res = await fetch(`/api/chats/${chatId}/messages`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageId, reaction })
            });
            const updatedMsg = await res.json();

            // Emit to socket
            socket.emit('send_reaction', {
                chatId,
                messageId,
                reaction,
                receiverId: selectedUser._id
            });

            // Update local state
            setMessages(prev => prev.map(m => m._id === messageId ? updatedMsg : m));

        } catch (error) {
            console.error('Failed to react', error);
        }
    };

    const startCall = (video: boolean) => {
        setIsVideoCall(video);
        setIsCallOpen(true);
    };

    const handleBlockUser = async () => {
        try {
            const res = await fetch('/api/users/block', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId: selectedUser._id, action: 'block' })
            });

            if (res.ok) {
                alert('User blocked successfully');
                setShowHeaderMenu(false);
            } else {
                alert('Failed to block user');
            }
        } catch (error) {
            console.error('Error blocking user:', error);
            alert('Failed to block user');
        }
    };

    const handleDeleteChat = async () => {
        if (confirm('Are you sure you want to delete this chat?')) {
            // TODO: Implement delete chat API endpoint
            console.log('Delete chat with:', selectedUser._id);
            setShowHeaderMenu(false);
        }
    };

    const handleVisitProfile = () => {
        // Navigate to profile page
        window.location.href = `/profile/${selectedUser._id}`;
        setShowHeaderMenu(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !chatId) return;

        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        setFilePreview({ file, url: previewUrl, type: file.type });

        // Reset input
        e.target.value = '';
    };

    const cancelFilePreview = () => {
        if (filePreview) {
            URL.revokeObjectURL(filePreview.url);
            setFilePreview(null);
        }
    };

    const sendFile = async () => {
        if (!filePreview || !chatId) return;

        const formData = new FormData();
        formData.append('file', filePreview.file);

        try {
            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const { url, type } = await uploadRes.json();

            let msgType = 'file';
            if (type.startsWith('image/')) msgType = 'image';
            else if (type.startsWith('audio/')) msgType = 'audio';
            else if (type.startsWith('video/')) msgType = 'video';

            const res = await fetch(`/api/chats/${chatId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: type.startsWith('image/') ? 'Image' : filePreview.file.name, type: msgType, fileUrl: url })
            });
            const savedMsg = await res.json();

            socket.emit('send_message', {
                ...savedMsg,
                receiver: selectedUser._id
            });

            setMessages((prev) => [...prev, savedMsg]);
            cancelFilePreview();
        } catch (error) {
            console.error('File upload failed', error);
            cancelFilePreview();
        }
    };

    const handleAudioRecorded = async (audioBlob: Blob) => {
        if (!chatId) return;

        const formData = new FormData();
        formData.append('file', audioBlob, 'audio-recording.webm');

        try {
            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const { url } = await uploadRes.json();

            const res = await fetch(`/api/chats/${chatId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: 'Voice message', type: 'audio', fileUrl: url })
            });
            const savedMsg = await res.json();

            socket.emit('send_message', {
                ...savedMsg,
                receiver: selectedUser._id
            });

            setMessages((prev) => [...prev, savedMsg]);
            setShowAudioRecorder(false);
        } catch (error) {
            console.error('Audio upload failed', error);
            setShowAudioRecorder(false);
        }
    };

    if (!selectedUser) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900 md:border-l border-gray-200 dark:border-gray-800">
                <p className="text-gray-500 text-sm sm:text-base px-4 text-center">Select a user to start chatting</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-gray-900 relative">
            <CallModal
                isOpen={isCallOpen}
                onClose={() => { setIsCallOpen(false); setIncomingCall(null); }}
                currentUser={currentUser}
                selectedUser={selectedUser}
                isVideo={isVideoCall}
                isIncoming={!!incomingCall}
                callSignal={incomingCall?.signal}
                callerName={incomingCall?.name}
                callerId={incomingCall?.caller}
            />

            {/* Header */}
            <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {selectedUser.image ? (
                            <img src={selectedUser.image} alt={selectedUser.name} className="h-9 w-9 sm:h-10 sm:w-10 rounded-full object-cover" />
                        ) : (
                            <span className="font-bold text-primary text-sm">{selectedUser.name.charAt(0)}</span>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate">{selectedUser.name}</h3>
                        {selectedUser.isOnline ? (
                            <span className="text-xs text-green-500 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Active now
                            </span>
                        ) : (
                            <span className="text-xs text-gray-400">Offline</span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <Button variant="ghost" size="sm" className="h-9 w-9 sm:h-10 sm:w-10 p-0" onClick={() => startCall(false)}><Phone className="h-4 w-4 sm:h-5 sm:w-5" /></Button>
                    <Button variant="ghost" size="sm" className="h-9 w-9 sm:h-10 sm:w-10 p-0" onClick={() => startCall(true)}><Video className="h-4 w-4 sm:h-5 sm:w-5" /></Button>
                    <div className="relative">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 sm:h-10 sm:w-10 p-0"
                            onClick={() => setShowHeaderMenu(!showHeaderMenu)}
                        >
                            <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>

                        {/* Dropdown Menu */}
                        {showHeaderMenu && (
                            <div className="absolute right-0 top-12 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 min-w-[180px] overflow-hidden">
                                <button
                                    onClick={handleBlockUser}
                                    className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-white transition-colors"
                                >
                                    Block User
                                </button>
                                <button
                                    onClick={handleDeleteChat}
                                    className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-red-600 dark:text-red-400 transition-colors"
                                >
                                    Delete Chat
                                </button>
                                <button
                                    onClick={handleVisitProfile}
                                    className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-white transition-colors"
                                >
                                    Visit Profile
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
                {messages.map((msg, idx) => {
                    const isMe = msg.sender === currentUser._id || msg.sender?._id === currentUser._id;
                    return (
                        <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} group relative`}>
                                {/* Reaction Buttons (Hidden by default, show on group hover) */}
                                <div className={`absolute top-1/2 -translate-y-1/2 ${isMe ? '-left-16' : '-right-16'} opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white dark:bg-gray-800 shadow-sm rounded-full p-1`}>
                                    <button onClick={() => handleReaction(msg._id, '❤️')} className="hover:scale-125 transition-transform">❤️</button>
                                    <button onClick={() => handleReaction(msg._id, '👍')} className="hover:scale-125 transition-transform">👍</button>
                                    <button onClick={() => handleReaction(msg._id, '😂')} className="hover:scale-125 transition-transform">😂</button>
                                </div>

                                <div className={`max-w-[85%] sm:max-w-[75%] md:max-w-[70%] rounded-2xl px-3 sm:px-4 py-2 text-sm ${isMe
                                    ? 'bg-primary text-primary-foreground rounded-tr-none'
                                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-tl-none'
                                    }`}>
                                    {msg.fileUrl && msg.type === 'image' && (
                                        <img src={msg.fileUrl} alt="Shared image" className="rounded-lg mb-2 max-h-60" />
                                    )}
                                    {msg.fileUrl && msg.type === 'audio' && (
                                        <div className="mb-2">
                                            <AudioPlayer audioUrl={msg.fileUrl} />
                                        </div>
                                    )}
                                    {msg.fileUrl && msg.type === 'video' && (
                                        <video controls src={msg.fileUrl} className="mb-2 max-h-60 rounded-lg" />
                                    )}
                                    {msg.type !== 'audio' && <p>{msg.content}</p>}
                                    <span className={`text-[10px] block mt-1 ${isMe ? 'text-primary-foreground/70' : 'text-gray-400'}`}>
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>

                            {/* Reactions Display */}
                            {msg.reactions && msg.reactions.length > 0 && (
                                <div className={`flex -mt-2 ${isMe ? 'mr-2' : 'ml-2'} bg-white dark:bg-gray-800 rounded-full px-1.5 py-0.5 shadow-sm text-xs border border-gray-100 dark:border-gray-700 z-10`}>
                                    {Array.from(new Set(msg.reactions.map((r: any) => r.type))).map((reaction: any, i) => (
                                        <span key={i}>{reaction}</span>
                                    ))}
                                    <span className="ml-1 text-gray-500 text-[10px]">{msg.reactions.length}</span>
                                </div>
                            )}
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-2 sm:p-3 md:p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <form onSubmit={handleSendMessage} className="flex items-center gap-1 sm:gap-2">
                    <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        onChange={handleFileUpload}
                        accept="image/*,audio/*,video/*"
                    />
                    <Button type="button" variant="ghost" size="sm" className="h-9 w-9 sm:h-10 sm:w-10 p-0 shrink-0" onClick={() => document.getElementById('file-upload')?.click()}>
                        <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                    </Button>

                    {showAudioRecorder ? (
                        <AudioRecorder
                            onAudioRecorded={handleAudioRecorded}
                            onCancel={() => setShowAudioRecorder(false)}
                        />
                    ) : (
                        <>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-9 w-9 sm:h-10 sm:w-10 p-0 shrink-0"
                                onClick={() => setShowAudioRecorder(true)}
                            >
                                <Mic className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                            </Button>
                            <Input
                                className="flex-1 text-sm sm:text-base"
                                placeholder="Type a message..."
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                            />
                            <Button type="submit" size="sm" className="h-9 w-9 sm:h-10 sm:w-10 p-0 shrink-0" disabled={!inputText.trim()}>
                                <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                            </Button>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
}
