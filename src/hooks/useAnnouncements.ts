// Hook for playing Home Assistant announcements
// Listens for play_announcement events and plays audio files

import { useEffect, useRef, useCallback, useState } from 'react';
import { onPlayAnnouncement, getAnnouncementUrl, haConnection } from '../services/homeAssistantService';

export interface AnnouncementState {
  isPlaying: boolean;
  currentFile: string | null;
  isConnected: boolean;
}

export function useAnnouncements() {
  const [state, setState] = useState<AnnouncementState>({
    isPlaying: false,
    currentFile: null,
    isConnected: false,
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Play an announcement file
  const playAnnouncement = useCallback((filename: string) => {
    const url = getAnnouncementUrl(filename);
    if (!url) {
      console.log('[Announcements] No HA URL configured');
      return;
    }

    console.log('[Announcements] Playing:', filename);

    // Stop current audio if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(url);
    audioRef.current = audio;

    setState((s) => ({ ...s, isPlaying: true, currentFile: filename }));

    audio.onended = () => {
      setState((s) => ({ ...s, isPlaying: false, currentFile: null }));
      audioRef.current = null;
    };

    audio.onerror = (e) => {
      console.error('[Announcements] Playback error:', e);
      setState((s) => ({ ...s, isPlaying: false, currentFile: null }));
      audioRef.current = null;
    };

    audio.play().catch((e) => {
      console.error('[Announcements] Play failed:', e);
      setState((s) => ({ ...s, isPlaying: false, currentFile: null }));
    });
  }, []);

  // Stop current announcement
  const stopAnnouncement = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setState((s) => ({ ...s, isPlaying: false, currentFile: null }));
  }, []);

  // Subscribe to HA events
  useEffect(() => {
    // Connect to Home Assistant
    haConnection.connect();

    // Update connection status
    const checkConnection = setInterval(() => {
      setState((s) => ({ ...s, isConnected: haConnection.isConnected() }));
    }, 1000);

    // Subscribe to announcement events
    const unsubscribe = onPlayAnnouncement((data) => {
      console.log('[Announcements] Received event:', data);
      if (data.filename) {
        playAnnouncement(data.filename);
      }
    });

    return () => {
      clearInterval(checkConnection);
      unsubscribe();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [playAnnouncement]);

  return {
    ...state,
    playAnnouncement,
    stopAnnouncement,
  };
}

// Get the appropriate greeting file based on time of day
export function getGreetingFile(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'good_morning.wav';
  if (hour < 17) return 'good_afternoon.wav';
  if (hour < 21) return 'good_evening.wav';
  return 'good_night.wav';
}

// Get the appropriate hour announcement file
export function getHourFile(hour: number): string {
  if (hour === 0) return 'hour_12_midnight.wav';
  if (hour === 12) return 'hour_12_noon.wav';
  const displayHour = hour > 12 ? hour - 12 : hour;
  return `hour_${String(displayHour).padStart(2, '0')}.wav`;
}
