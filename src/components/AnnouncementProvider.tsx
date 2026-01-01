// AnnouncementProvider - Listens for Home Assistant announcement events
// and plays pre-generated voice audio files

import { useEffect, useRef, useCallback } from 'react';
import { haConnection, onPlayAnnouncement, getAnnouncementUrl } from '../services/homeAssistantService';

export function AnnouncementProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAnnouncement = useCallback((filename: string) => {
    const url = getAnnouncementUrl(filename);
    if (!url) {
      console.log('[Announcements] No HA URL configured, skipping');
      return;
    }

    console.log('[Announcements] Playing:', url);

    // Stop current audio if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onended = () => {
      console.log('[Announcements] Playback complete');
      audioRef.current = null;
    };

    audio.onerror = (e) => {
      console.error('[Announcements] Playback error:', e);
      audioRef.current = null;
    };

    // Play with user interaction requirement handling
    audio.play().catch((e) => {
      console.warn('[Announcements] Autoplay blocked, will retry on interaction:', e);
      // Store for later playback on user interaction
      const playOnClick = () => {
        audio.play().catch(console.error);
        document.removeEventListener('click', playOnClick);
      };
      document.addEventListener('click', playOnClick, { once: true });
    });
  }, []);

  useEffect(() => {
    // Connect to Home Assistant WebSocket
    haConnection.connect();

    // Subscribe to announcement events
    const unsubscribe = onPlayAnnouncement((data) => {
      console.log('[Announcements] Event received:', data);
      if (data.filename) {
        // Clean up filename (remove extra whitespace from Jinja templates)
        const filename = data.filename.toString().trim();
        playAnnouncement(filename);
      }
    });

    return () => {
      unsubscribe();
      haConnection.disconnect();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [playAnnouncement]);

  return <>{children}</>;
}
