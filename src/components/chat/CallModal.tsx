'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Phone, Video, Mic, MicOff, VideoOff, PhoneOff, MoreVertical } from 'lucide-react';
import SimplePeer from 'simple-peer';
import { socket } from '@/lib/socket';

interface CallModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: any;
    selectedUser: any;
    isVideo: boolean;
    isIncoming: boolean;
    callSignal?: any;
    callerName?: string;
    callerId?: string;
}

export default function CallModal({
    isOpen, onClose, currentUser, selectedUser, isVideo, isIncoming, callSignal, callerName, callerId
}: CallModalProps) {
    const [callAccepted, setCallAccepted] = useState(false);
    const [callEnded, setCallEnded] = useState(false);
    const [stream, setStream] = useState<MediaStream>();
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    const myVideo = useRef<HTMLVideoElement>(null);
    const userVideo = useRef<HTMLVideoElement>(null);
    const connectionRef = useRef<SimplePeer.Instance | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true })
            .then((currentStream) => {
                setStream(currentStream);
                if (myVideo.current) {
                    myVideo.current.srcObject = currentStream;
                }
            });

        // Cleanup stream on close
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [isOpen, isVideo]);

    const answerCall = () => {
        setCallAccepted(true);
        const peer = new SimplePeer({
            initiator: false,
            trickle: false,
            stream: stream,
        });

        peer.on('signal', (data) => {
            socket.emit('answer_call', { signal: data, to: callerId });
        });

        peer.on('stream', (currentStream) => {
            if (userVideo.current) {
                userVideo.current.srcObject = currentStream;
            }
        });

        peer.signal(callSignal);
        connectionRef.current = peer;
    };

    const callUser = () => {
        const peer = new SimplePeer({
            initiator: true,
            trickle: false,
            stream: stream,
        });

        peer.on('signal', (data) => {
            socket.emit('call_user', {
                userToCall: selectedUser._id,
                signalData: data,
                from: currentUser._id,
                name: currentUser.name
            });
        });

        peer.on('stream', (currentStream) => {
            if (userVideo.current) {
                userVideo.current.srcObject = currentStream;
            }
        });

        socket.on('call_accepted', (signal) => {
            setCallAccepted(true);
            peer.signal(signal);
        });

        connectionRef.current = peer;
    };

    // Auto-call if not incoming
    useEffect(() => {
        if (isOpen && !isIncoming && stream) {
            callUser();
        }
    }, [isOpen, isIncoming, stream]);

    const leaveCall = () => {
        setCallEnded(true);

        // Notify the other user
        socket.emit('end_call', { to: isIncoming ? callerId : selectedUser._id });

        // Stop all tracks
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        // Destroy peer connection
        connectionRef.current?.destroy();

        // Close modal
        setTimeout(() => {
            onClose();
        }, 500);
    };

    // Listen for call end from other user
    useEffect(() => {
        const handleCallEnded = () => {
            leaveCall();
        };

        socket.on('call_ended', handleCallEnded);

        return () => {
            socket.off('call_ended', handleCallEnded);
        };
    }, [stream]);

    const toggleMute = () => {
        if (stream) {
            stream.getAudioTracks()[0].enabled = !stream.getAudioTracks()[0].enabled;
            setIsMuted(!stream.getAudioTracks()[0].enabled);
        }
    };

    const toggleVideo = () => {
        if (stream) {
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOff(!videoTrack.enabled);
            }
        }
    };

    if (!isOpen) return null;

    const handleBlockUser = async () => {
        try {
            const res = await fetch('/api/users/block', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId: selectedUser._id, action: 'block' })
            });

            if (res.ok) {
                alert('User blocked successfully');
                setShowMenu(false);
                leaveCall();
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
            setShowMenu(false);
            leaveCall();
        }
    };

    const handleVisitProfile = () => {
        // Navigate to profile page
        window.location.href = `/profile/${selectedUser._id}`;
        setShowMenu(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4">
            <div className="bg-gray-900 rounded-xl overflow-hidden shadow-2xl w-full max-w-5xl p-3 sm:p-4 md:p-6 max-h-[95vh] flex flex-col">
                <div className="flex justify-between items-center mb-3 sm:mb-4 relative">
                    <h3 className="text-white text-base sm:text-lg font-semibold truncate flex-1 pr-2">
                        {isIncoming ? `Incoming call from ${callerName}` : `Calling ${selectedUser?.name}...`}
                    </h3>
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="text-white hover:bg-gray-800 p-2 rounded-full transition-colors shrink-0"
                    >
                        <MoreVertical className="h-5 w-5" />
                    </button>

                    {/* Dropdown Menu */}
                    {showMenu && (
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 md:gap-4 flex-1 min-h-0">
                    {/* My Video */}
                    <div className="relative bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center min-h-[200px] sm:min-h-[250px] md:min-h-[300px]">
                        {stream && (
                            <video playsInline muted ref={myVideo} autoPlay className="w-full h-full object-cover" />
                        )}
                        <span className="absolute bottom-2 left-2 text-white bg-black/50 px-2 py-1 rounded text-xs sm:text-sm">You</span>
                    </div>

                    {/* User Video */}
                    <div className="relative bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center min-h-[200px] sm:min-h-[250px] md:min-h-[300px]">
                        {callAccepted && !callEnded ? (
                            <video playsInline ref={userVideo} autoPlay className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-gray-400 text-sm sm:text-base">Waiting for response...</div>
                        )}
                        <span className="absolute bottom-2 left-2 text-white bg-black/50 px-2 py-1 rounded text-xs sm:text-sm">
                            {isIncoming ? callerName : selectedUser?.name}
                        </span>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 mt-4 sm:mt-6 flex-wrap">
                    <Button variant="outline" size="lg" className="rounded-full h-11 w-11 sm:h-12 sm:w-12 p-0" onClick={toggleMute}>
                        {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </Button>
                    {isVideo && (
                        <Button variant="outline" size="lg" className="rounded-full h-11 w-11 sm:h-12 sm:w-12 p-0" onClick={toggleVideo}>
                            {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                        </Button>
                    )}

                    {isIncoming && !callAccepted ? (
                        <Button variant="default" size="lg" className="bg-green-500 hover:bg-green-600 rounded-full h-12 w-12 sm:h-14 sm:w-14 p-0 animate-pulse" onClick={answerCall}>
                            <Phone className="h-5 w-5 sm:h-6 sm:w-6" />
                        </Button>
                    ) : null}

                    <Button variant="default" size="lg" className="bg-red-500 hover:bg-red-600 rounded-full h-12 w-12 sm:h-14 sm:w-14 p-0" onClick={leaveCall}>
                        <PhoneOff className="h-5 w-5 sm:h-6 sm:w-6" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
