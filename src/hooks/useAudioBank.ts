import { useState, useCallback } from 'react';

export interface AudioFile {
  id: string;
  name: string;
  category: 'roshan' | 'rune' | 'neutral' | 'general';
  description: string;
  url?: string; // For uploaded files
  isBuiltIn?: boolean;
}

const BUILT_IN_SOUNDS: AudioFile[] = [
  {
    id: 'roshan-spawn',
    name: 'Roshan Spawn',
    category: 'roshan',
    description: 'Deep roar indicating Roshan has spawned',
    isBuiltIn: true
  },
  {
    id: 'roshan-death',
    name: 'Roshan Death',
    category: 'roshan', 
    description: 'Death sound when Roshan is killed',
    isBuiltIn: true
  },
  {
    id: 'lotus-bloom',
    name: 'Lotus Bloom',
    category: 'rune',
    description: 'Magical lotus flower landing in water',
    isBuiltIn: true
  },
  {
    id: 'rune-spawn',
    name: 'Rune Spawn',
    category: 'rune',
    description: 'Power/bounty rune spawn sound',
    isBuiltIn: true
  },
  {
    id: 'neutral-ready',
    name: 'Neutral Ready',
    category: 'neutral',
    description: 'Neutral creeps are ready to pull',
    isBuiltIn: true
  },
  {
    id: 'timer-alert',
    name: 'General Alert',
    category: 'general',
    description: 'General timer completion alert',
    isBuiltIn: true
  }
];

export const useAudioBank = () => {
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>(BUILT_IN_SOUNDS);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);

  const playAudio = useCallback(async (audioId: string) => {
    const audioFile = audioFiles.find(f => f.id === audioId);
    if (!audioFile) return;

    setIsPlaying(audioId);

    try {
      if (audioFile.isBuiltIn) {
        // For built-in sounds, use Web Audio API to generate placeholder sounds
        await playBuiltInSound(audioId);
      } else if (audioFile.url) {
        // For uploaded files, play the actual audio
        const audio = new Audio(audioFile.url);
        await audio.play();
      }
    } catch (error) {
      console.warn('Failed to play audio:', error);
    } finally {
      setIsPlaying(null);
    }
  }, [audioFiles]);

  const playBuiltInSound = useCallback(async (soundId: string) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    switch (soundId) {
      case 'roshan-spawn':
        // Deep, ominous roar
        await playComplexTone(audioContext, [100, 120, 80], 1.5, 'sawtooth');
        break;
      case 'roshan-death':
        // Fading death sound
        await playComplexTone(audioContext, [200, 150, 100, 50], 2.0, 'triangle');
        break;
      case 'lotus-bloom':
        // Magical chime sequence
        await playComplexTone(audioContext, [800, 1000, 1200, 1000], 1.2, 'sine');
        break;
      case 'rune-spawn':
        // Power-up sound
        await playComplexTone(audioContext, [400, 600, 800], 0.8, 'square');
        break;
      case 'neutral-ready':
        // Simple notification
        await playComplexTone(audioContext, [600, 700], 0.5, 'sine');
        break;
      default:
        // Default alert sound
        await playComplexTone(audioContext, [800], 0.8, 'sine');
    }
  }, []);

  const playComplexTone = async (
    audioContext: AudioContext, 
    frequencies: number[], 
    duration: number, 
    type: OscillatorType
  ) => {
    const noteLength = duration / frequencies.length;
    
    for (let i = 0; i < frequencies.length; i++) {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequencies[i];
      oscillator.type = type;
      
      const startTime = audioContext.currentTime + (i * noteLength);
      const endTime = startTime + noteLength;
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, endTime);
      
      oscillator.start(startTime);
      oscillator.stop(endTime);
    }
    
    return new Promise(resolve => {
      setTimeout(resolve, duration * 1000);
    });
  };

  const addCustomAudio = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    const newAudio: AudioFile = {
      id: `custom-${Date.now()}`,
      name: file.name.replace(/\.[^/.]+$/, ""),
      category: 'general',
      description: 'Custom uploaded sound',
      url: url,
      isBuiltIn: false
    };
    
    setAudioFiles(prev => [...prev, newAudio]);
    return newAudio.id;
  }, []);

  const removeCustomAudio = useCallback((audioId: string) => {
    setAudioFiles(prev => {
      const file = prev.find(f => f.id === audioId);
      if (file?.url) {
        URL.revokeObjectURL(file.url);
      }
      return prev.filter(f => f.id !== audioId);
    });
  }, []);

  const updateAudioConfig = useCallback((audioId: string, updates: Partial<AudioFile>) => {
    setAudioFiles(prev => prev.map(f => 
      f.id === audioId ? { ...f, ...updates } : f
    ));
  }, []);

  return {
    audioFiles,
    isPlaying,
    playAudio,
    addCustomAudio,
    removeCustomAudio,
    updateAudioConfig
  };
};