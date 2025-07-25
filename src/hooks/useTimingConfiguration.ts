import { useState, useCallback } from 'react';

export interface TimingEvent {
  id: string;
  name: string;
  defaultTime: number;
  customTime?: number;
  description: string;
  category: 'spawn' | 'respawn' | 'periodic';
}

export interface TimingPreset {
  id: string;
  name: string;
  version: string;
  description: string;
  events: Record<string, number>; // eventId -> custom time
  isDefault?: boolean;
}

const DEFAULT_TIMING_EVENTS: TimingEvent[] = [
  {
    id: 'roshan-respawn',
    name: 'Roshan Respawn',
    defaultTime: 660, // 11 minutes
    description: 'Time between Roshan death and respawn (8-11 minutes)',
    category: 'respawn'
  },
  {
    id: 'bounty-rune',
    name: 'Bounty Rune',
    defaultTime: 300, // 5 minutes
    description: 'Bounty rune spawn interval',
    category: 'periodic'
  },
  {
    id: 'power-rune',
    name: 'Power Rune',
    defaultTime: 120, // 2 minutes
    description: 'Power rune spawn interval',
    category: 'periodic'
  },
  {
    id: 'lotus-pool',
    name: 'Lotus Pool',
    defaultTime: 180, // 3 minutes
    description: 'Lotus pool respawn time',
    category: 'respawn'
  },
  {
    id: 'neutral-pull',
    name: 'Neutral Pull',
    defaultTime: 60, // 1 minute
    description: 'Time between neutral creep spawns',
    category: 'periodic'
  },
  {
    id: 'ancient-stack',
    name: 'Ancient Stack',
    defaultTime: 55, // 55 seconds before minute mark
    description: 'Optimal time to stack ancient camps',
    category: 'periodic'
  },
  {
    id: 'observer-ward',
    name: 'Observer Ward Stock',
    defaultTime: 135, // 2 minutes 15 seconds
    description: 'Observer ward stock replenishment',
    category: 'periodic'
  },
  {
    id: 'sentry-ward',
    name: 'Sentry Ward Stock',
    defaultTime: 85, // 1 minute 25 seconds
    description: 'Sentry ward stock replenishment',
    category: 'periodic'
  }
];

const DEFAULT_PRESETS: TimingPreset[] = [
  {
    id: 'default-7.35',
    name: 'Default (7.35)',
    version: '7.35',
    description: 'Standard timings for Dota 2 patch 7.35',
    events: {},
    isDefault: true
  },
  {
    id: 'early-warning',
    name: 'Early Warning',
    version: '7.35',
    description: '2 seconds earlier notifications for quick reactions',
    events: {
      'roshan-respawn': 658,
      'bounty-rune': 298,
      'power-rune': 118,
      'lotus-pool': 178,
      'neutral-pull': 58,
      'ancient-stack': 53,
      'observer-ward': 133,
      'sentry-ward': 83
    }
  },
  {
    id: 'conservative',
    name: 'Conservative',
    version: '7.35',
    description: '5 seconds earlier for safer timing',
    events: {
      'roshan-respawn': 655,
      'bounty-rune': 295,
      'power-rune': 115,
      'lotus-pool': 175,
      'neutral-pull': 55,
      'ancient-stack': 50,
      'observer-ward': 130,
      'sentry-ward': 80
    }
  }
];

export const useTimingConfiguration = () => {
  const [timingEvents] = useState<TimingEvent[]>(DEFAULT_TIMING_EVENTS);
  const [presets, setPresets] = useState<TimingPreset[]>(DEFAULT_PRESETS);
  const [activePresetId, setActivePresetId] = useState<string>('default-7.35');
  const [customTimings, setCustomTimings] = useState<Record<string, number>>({});

  const activePreset = presets.find(p => p.id === activePresetId);

  const getEffectiveTime = useCallback((eventId: string): number => {
    const event = timingEvents.find(e => e.id === eventId);
    if (!event) return 0;

    // Priority: custom timing > preset timing > default timing
    if (customTimings[eventId] !== undefined) {
      return customTimings[eventId];
    }
    
    if (activePreset?.events[eventId] !== undefined) {
      return activePreset.events[eventId];
    }
    
    return event.defaultTime;
  }, [timingEvents, customTimings, activePreset]);

  const setCustomTiming = useCallback((eventId: string, time: number) => {
    setCustomTimings(prev => ({
      ...prev,
      [eventId]: time
    }));
  }, []);

  const resetCustomTiming = useCallback((eventId: string) => {
    setCustomTimings(prev => {
      const updated = { ...prev };
      delete updated[eventId];
      return updated;
    });
  }, []);

  const resetAllCustomTimings = useCallback(() => {
    setCustomTimings({});
  }, []);

  const createCustomPreset = useCallback((name: string, description: string) => {
    const newPreset: TimingPreset = {
      id: `custom-${Date.now()}`,
      name,
      version: 'Custom',
      description,
      events: { ...customTimings }
    };
    
    setPresets(prev => [...prev, newPreset]);
    return newPreset.id;
  }, [customTimings]);

  const deletePreset = useCallback((presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset?.isDefault) return false; // Can't delete default presets
    
    setPresets(prev => prev.filter(p => p.id !== presetId));
    
    if (activePresetId === presetId) {
      setActivePresetId('default-7.35');
    }
    
    return true;
  }, [presets, activePresetId]);

  const loadPreset = useCallback((presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;
    
    setActivePresetId(presetId);
    setCustomTimings({}); // Clear custom timings when loading preset
  }, [presets]);

  const getUpcomingEvents = useCallback((gameTime: number) => {
    return timingEvents.map(event => {
      const effectiveTime = getEffectiveTime(event.id);
      let nextEventTime: number;
      
      if (event.category === 'periodic') {
        // For periodic events, calculate next occurrence
        const cycle = Math.floor(gameTime / effectiveTime);
        nextEventTime = (cycle + 1) * effectiveTime;
      } else {
        // For spawn/respawn events, just add the time to current game time
        nextEventTime = gameTime + effectiveTime;
      }
      
      return {
        ...event,
        effectiveTime,
        nextEventTime,
        timeUntilNext: nextEventTime - gameTime
      };
    }).sort((a, b) => a.timeUntilNext - b.timeUntilNext);
  }, [timingEvents, getEffectiveTime]);

  return {
    timingEvents,
    presets,
    activePreset,
    activePresetId,
    customTimings,
    getEffectiveTime,
    setCustomTiming,
    resetCustomTiming,
    resetAllCustomTimings,
    createCustomPreset,
    deletePreset,
    loadPreset,
    getUpcomingEvents
  };
};