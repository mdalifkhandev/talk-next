"use client";

import { useState, useRef } from "react";
import { Mic, X, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface AudioRecorderProps {
  onAudioRecorded: (audioBlob: Blob) => void;
  onCancel: () => void;
}

export default function AudioRecorder({
  onAudioRecorded,
  onCancel,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        onAudioRecorded(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Could not access microphone. Please grant permission.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setRecordingTime(0);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setRecordingTime(0);
    }
    onCancel();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isRecording) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-9 w-9 sm:h-10 sm:w-10 p-0 shrink-0"
        onClick={startRecording}
      >
        <Mic className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg flex-1">
      <div className="flex items-center gap-2 flex-1">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-red-600 dark:text-red-400">
          {formatTime(recordingTime)}
        </span>
        <div className="flex gap-1 ml-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-1 bg-red-500 rounded-full animate-pulse"
              style={{
                height: `${Math.random() * 20 + 10}px`,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 shrink-0"
        onClick={cancelRecording}
      >
        <X className="h-4 w-4 text-gray-500" />
      </Button>
      <Button
        type="button"
        variant="default"
        size="sm"
        className="h-8 w-8 p-0 shrink-0 bg-green-500 hover:bg-green-600"
        onClick={stopRecording}
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
