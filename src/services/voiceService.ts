// Voice narration service using ElevenLabs API
// Pre-generates audio for the daily briefing

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

// Voice IDs from ElevenLabs - you can clone your own voice or use preset voices
// Go to https://elevenlabs.io/voice-lab to clone your voice
export const VOICE_OPTIONS = {
  // ElevenLabs preset voices
  rachel: '21m00Tcm4TlvDq8ikWAM', // Rachel - warm, conversational
  drew: 'SOYHLrjzK2X1ezoPC6cr', // Drew - calm, clear
  clyde: 'lqXLbhEsaMRi8ZLX9EQZ', // Clyde - deep, thoughtful
  paul: '7hLUP1RWE5M8B36LZ1x2', // Paul - news anchor style
  custom: '', // Your cloned voice ID goes here
};

export interface VoiceSettings {
  enabled: boolean;
  voiceId: string;
  stability: number; // 0-1, higher = more consistent
  similarityBoost: number; // 0-1, higher = more similar to original
  volume: number; // 0-1
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  enabled: false,
  voiceId: VOICE_OPTIONS.rachel,
  stability: 0.5,
  similarityBoost: 0.75,
  volume: 0.8,
};

// Get voice settings from localStorage (per-device)
export function getVoiceSettings(): VoiceSettings {
  try {
    const stored = localStorage.getItem('voice-settings');
    if (stored) {
      return { ...DEFAULT_VOICE_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {}
  return DEFAULT_VOICE_SETTINGS;
}

// Save voice settings to localStorage
export function saveVoiceSettings(settings: Partial<VoiceSettings>): VoiceSettings {
  const current = getVoiceSettings();
  const updated = { ...current, ...settings };
  localStorage.setItem('voice-settings', JSON.stringify(updated));
  return updated;
}

// Audio cache for pre-generated audio
const audioCache = new Map<string, HTMLAudioElement>();

// Generate speech from text using ElevenLabs
export async function generateSpeech(
  text: string,
  apiKey: string,
  settings: VoiceSettings = getVoiceSettings()
): Promise<HTMLAudioElement | null> {
  if (!apiKey || !text) return null;

  // Create cache key
  const cacheKey = `${settings.voiceId}-${text.slice(0, 50)}`;

  // Check cache first
  if (audioCache.has(cacheKey)) {
    return audioCache.get(cacheKey)!;
  }

  try {
    const response = await fetch(`${ELEVENLABS_API_URL}/${settings.voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: settings.stability,
          similarity_boost: settings.similarityBoost,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    // Convert response to audio blob
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.volume = settings.volume;

    // Cache the audio
    audioCache.set(cacheKey, audio);

    return audio;
  } catch (error) {
    console.error('Failed to generate speech:', error);
    return null;
  }
}

// Play audio with controls
export class AudioPlayer {
  private currentAudio: HTMLAudioElement | null = null;
  private isPlaying = false;

  async play(audio: HTMLAudioElement): Promise<void> {
    this.stop();
    this.currentAudio = audio;
    this.isPlaying = true;

    return new Promise((resolve, reject) => {
      audio.onended = () => {
        this.isPlaying = false;
        resolve();
      };
      audio.onerror = () => {
        this.isPlaying = false;
        reject(new Error('Audio playback failed'));
      };
      audio.play().catch(reject);
    });
  }

  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.isPlaying = false;
    }
  }

  pause(): void {
    if (this.currentAudio && this.isPlaying) {
      this.currentAudio.pause();
      this.isPlaying = false;
    }
  }

  resume(): void {
    if (this.currentAudio && !this.isPlaying) {
      this.currentAudio.play();
      this.isPlaying = true;
    }
  }

  setVolume(volume: number): void {
    if (this.currentAudio) {
      this.currentAudio.volume = Math.max(0, Math.min(1, volume));
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

// Global audio player instance
export const audioPlayer = new AudioPlayer();

// Generate briefing script from articles
export function generateBriefingScript(articles: {
  headline: string;
  greeting: string;
  weatherArticle?: { headline: string; body: string; advice: string };
  dayArticle?: { headline: string; body: string };
  marketsArticle?: { headline: string; body: string };
  historyArticle?: { headline: string; body: string };
  wisdomCorner?: string;
  productivityNote?: string;
  closingThought?: string;
}): string {
  const parts: string[] = [];

  // Greeting
  parts.push(articles.greeting);
  parts.push(''); // Pause

  // Headlines
  parts.push(`Today's top story: ${articles.headline}`);
  parts.push('');

  // Weather
  if (articles.weatherArticle) {
    parts.push(`Weather update. ${articles.weatherArticle.body} ${articles.weatherArticle.advice}`);
    parts.push('');
  }

  // Day's agenda
  if (articles.dayArticle) {
    parts.push(`Looking at your day ahead. ${articles.dayArticle.body}`);
    parts.push('');
  }

  // Markets
  if (articles.marketsArticle) {
    parts.push(`Markets report. ${articles.marketsArticle.body}`);
    parts.push('');
  }

  // History
  if (articles.historyArticle) {
    parts.push(`On this day in history. ${articles.historyArticle.body}`);
    parts.push('');
  }

  // Wisdom
  if (articles.wisdomCorner) {
    parts.push(`A moment of wisdom. ${articles.wisdomCorner}`);
    parts.push('');
  }

  // Productivity
  if (articles.productivityNote) {
    parts.push(articles.productivityNote);
  }

  // Closing
  if (articles.closingThought) {
    parts.push(`And finally. ${articles.closingThought}`);
  }

  return parts.join(' ');
}

// Pre-generate briefing audio (call this 10 min ahead)
export async function preGenerateBriefingAudio(
  articles: Parameters<typeof generateBriefingScript>[0],
  apiKey: string
): Promise<HTMLAudioElement | null> {
  const script = generateBriefingScript(articles);
  return generateSpeech(script, apiKey);
}

// Clear audio cache
export function clearAudioCache(): void {
  audioCache.forEach((audio) => {
    URL.revokeObjectURL(audio.src);
  });
  audioCache.clear();
}
