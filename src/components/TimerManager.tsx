import { useState, useEffect, useCallback } from 'react';
import { TimerCard, type Timer } from './TimerCard';
import { AudioBank } from './AudioBank';
import { GSIInstallWizard } from './GSIInstallWizard';
import { TimingConfiguration } from './TimingConfiguration';
import { GameSettings } from './GameSettings';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw, Settings, TestTube, Wifi, WifiOff, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useElectronGSI } from '@/hooks/useElectronGSI';
import { useGameStateIntegration } from '@/hooks/useGameStateIntegration';

interface ActiveTimer {
  id: string;
  startTime: number;
  timeRemaining: number;
  isPaused: boolean;
  pausedTime?: number;
}

const DEFAULT_TIMERS: Timer[] = [
  {
    id: 'roshan',
    name: 'Roshan',
    duration: 660, // 11 minutes
    minDuration: 480, // 8 minutes minimum
    maxDuration: 660, // 11 minutes maximum
    type: 'roshan',
    audioAlert: true
  },
  {
    id: 'bounty-rune',
    name: 'Bounty Rune',
    duration: 300, // 5 minutes
    type: 'rune',
    audioAlert: true
  },
  {
    id: 'power-rune',
    name: 'Power Rune',
    duration: 120, // 2 minutes
    type: 'rune',
    audioAlert: true
  },
  {
    id: 'lotus',
    name: 'Lotus',
    duration: 180, // 3 minutes
    type: 'rune',
    audioAlert: true
  },
  {
    id: 'neutral-pull',
    name: 'Neutral Pull',
    duration: 60, // 1 minute
    type: 'neutral',
    audioAlert: true
  }
];

export const TimerManager = () => {
  const [activeTimers, setActiveTimers] = useState<Record<string, ActiveTimer>>({});
  const [isPaused, setIsPaused] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [side, setSide] = useState<'radiant' | 'dire'>('radiant');
  const [lane, setLane] = useState<'safe' | 'mid' | 'off'>('safe');
  const [gameMode, setGameMode] = useState<'allpick' | 'turbo'>('allpick');
  const [gameTimeOffset, setGameTimeOffset] = useState<number>(0); // Offset between game time and local time
  const [showInstallWizard, setShowInstallWizard] = useState(false);
  const [showTimingConfig, setShowTimingConfig] = useState(false);
  const { toast } = useToast();
  
  // Use Electron GSI if available, fallback to web GSI
  const electronGSI = useElectronGSI();
  const webGSI = useGameStateIntegration();
  const { gameState, connectionStatus, isConnected, error, connect, disconnect, syncGameTime, isGameInProgress } = 
    electronGSI.isElectron ? electronGSI : webGSI;

  // Update timers every second
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPaused) return;

      setActiveTimers(prev => {
        const updated = { ...prev };
        let hasChanges = false;

        Object.keys(updated).forEach(id => {
          const timer = updated[id];
          if (!timer.isPaused) {
            const elapsed = Date.now() - timer.startTime;
            const newTimeRemaining = Math.max(0, DEFAULT_TIMERS.find(t => t.id === id)?.duration || 0) - Math.floor(elapsed / 1000);
            
            if (newTimeRemaining !== timer.timeRemaining) {
              timer.timeRemaining = newTimeRemaining;
              hasChanges = true;

              // Check for alerts
              const timerConfig = DEFAULT_TIMERS.find(t => t.id === id);
              if (timerConfig && newTimeRemaining <= 0) {
                handleTimerAlert(timerConfig);
                delete updated[id];
              } else if (timerConfig?.type === 'roshan' && timerConfig.minDuration) {
                const totalElapsed = Math.floor(elapsed / 1000);
                if (totalElapsed === timerConfig.minDuration) {
                  toast({
                    title: "Roshan Alert!",
                    description: "Roshan can now spawn (minimum time reached)",
                    variant: "default"
                  });
                  playAlert();
                }
              }
            }
          }
        });

        return hasChanges ? updated : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, toast]);

  const playAlert = useCallback(() => {
    // Simple audio alert using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.8);
    } catch (error) {
      console.warn('Audio alert failed:', error);
    }
  }, []);

  const handleTimerAlert = useCallback((timer: Timer) => {
    toast({
      title: `${timer.name} Alert!`,
      description: `${timer.name} timer has completed`,
      variant: "default"
    });
    
    if (timer.audioAlert) {
      playAlert();
    }
  }, [toast, playAlert]);

  const startTimer = useCallback((id: string) => {
    const timer = DEFAULT_TIMERS.find(t => t.id === id);
    if (!timer) return;

    setActiveTimers(prev => ({
      ...prev,
      [id]: {
        id,
        startTime: Date.now(),
        timeRemaining: timer.duration,
        isPaused: false
      }
    }));

    toast({
      title: "Timer Started",
      description: `${timer.name} timer started`,
      variant: "default"
    });
  }, [toast]);

  const stopTimer = useCallback((id: string) => {
    setActiveTimers(prev => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });

    const timer = DEFAULT_TIMERS.find(t => t.id === id);
    toast({
      title: "Timer Stopped",
      description: `${timer?.name} timer stopped`,
      variant: "default"
    });
  }, [toast]);

  const pauseTimer = useCallback((id: string) => {
    setActiveTimers(prev => {
      const timer = prev[id];
      if (!timer) return prev;

      return {
        ...prev,
        [id]: {
          ...timer,
          isPaused: !timer.isPaused,
          pausedTime: !timer.isPaused ? Date.now() : undefined
        }
      };
    });
  }, []);

  const pauseAllTimers = useCallback(() => {
    setIsPaused(!isPaused);
    toast({
      title: isPaused ? "Timers Resumed" : "All Timers Paused",
      description: isPaused ? "All timers have been resumed" : "All timers have been paused",
      variant: "default"
    });
  }, [isPaused, toast]);

  const resetAllTimers = useCallback(() => {
    setActiveTimers({});
    setIsPaused(false);
    toast({
      title: "All Timers Reset",
      description: "All active timers have been stopped",
      variant: "default"
    });
  }, [toast]);

  const syncWithGameTime = useCallback(() => {
    const gameTime = syncGameTime();
    if (gameTime !== null) {
      setGameTimeOffset(Date.now() - (gameTime * 1000));
      toast({
        title: "GSI Sync Complete",
        description: `Synced with game time: ${Math.floor(gameTime / 60)}:${String(Math.floor(gameTime % 60)).padStart(2, '0')}`,
        variant: "default"
      });
    } else {
      toast({
        title: "GSI Sync Failed",
        description: "Could not sync with game time. Check GSI connection.",
        variant: "destructive"
      });
    }
  }, [syncGameTime, toast]);

  const toggleGSIConnection = useCallback(() => {
    if (isConnected) {
      disconnect();
      toast({
        title: "GSI Disconnected",
        description: "Disconnected from Dota 2 GSI",
        variant: "default"
      });
    } else if (connectionStatus === 'error') {
      connect();
      toast({
        title: "GSI Retry",
        description: "Retrying GSI connection...",
        variant: "default"
      });
    } else {
      connect();
      toast({
        title: "GSI Connecting",
        description: "Attempting to connect to Dota 2 GSI...",
        variant: "default"
      });
    }
  }, [isConnected, connectionStatus, connect, disconnect, toast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'r':
            event.preventDefault();
            startTimer('roshan');
            break;
          case 'b':
            event.preventDefault();
            startTimer('bounty-rune');
            break;
          case 'p':
            event.preventDefault();
            startTimer('power-rune');
            break;
          case 'l':
            event.preventDefault();
            startTimer('lotus');
            break;
          case 'n':
            event.preventDefault();
            startTimer('neutral-pull');
            break;
          case ' ':
            event.preventDefault();
            pauseAllTimers();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [startTimer, pauseAllTimers]);

  // Show Electron status in the UI
  const isElectronApp = electronGSI.isElectron;

  return (
    <div className="space-y-4 dota-bg-pattern">
      {/* Header Controls */}
      <Card className="p-4 bg-gradient-ancient border-timer-border ancient-glow magical-card mystical-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-primary enchanted-text">⚔️ Sentinel Timer ⚔️</h1>
            <Badge variant={testMode ? "destructive" : "secondary"}>
              {testMode ? "TEST MODE" : "LIVE"}
            </Badge>
            {isElectronApp && (
              <Badge variant="default" className="bg-green-500">
                DESKTOP
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={isConnected ? "default" : connectionStatus === 'error' ? "destructive" : "outline"}
              size="sm"
              onClick={toggleGSIConnection}
            >
              {isConnected ? <Wifi className="h-4 w-4 mr-1" /> : <WifiOff className="h-4 w-4 mr-1" />}
              {connectionStatus === 'connecting' ? 'Connecting...' : 
               connectionStatus === 'error' ? 'GSI Error' : 
               isConnected ? 'GSI' : 'GSI'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={syncWithGameTime}
              disabled={!isConnected || !isGameInProgress()}
            >
              Sync
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTestMode(!testMode)}
            >
              <TestTube className="h-4 w-4 mr-1" />
              Test
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTimingConfig(true)}
            >
              <Settings className="h-4 w-4 mr-1" />
              Timings
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInstallWizard(true)}
            >
              <HelpCircle className="h-4 w-4 mr-1" />
              Setup
            </Button>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={pauseAllTimers}
            variant={isPaused ? "default" : "secondary"}
            size="sm"
          >
            {isPaused ? <Play className="h-4 w-4 mr-1" /> : <Pause className="h-4 w-4 mr-1" />}
            {isPaused ? 'Resume All' : 'Pause All'}
          </Button>
          <Button
            onClick={resetAllTimers}
            variant="destructive"
            size="sm"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset All
          </Button>
        </div>

        {/* GSI Status */}
        <div className="mt-3 p-2 bg-muted rounded text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">GSI Status:</span>
            <Badge variant={
              connectionStatus === 'connected' ? "default" : 
              connectionStatus === 'error' ? "destructive" : 
              connectionStatus === 'connecting' ? "secondary" : 
              "outline"
            }>
              {connectionStatus === 'connected' ? "Connected" : 
               connectionStatus === 'connecting' ? "Connecting..." : 
               connectionStatus === 'error' ? "Error" : 
               "Disconnected"}
            </Badge>
          </div>
          {gameState && connectionStatus === 'connected' && (
            <div className="mt-1 text-xs text-muted-foreground">
              Game Time: {Math.floor(gameState.game_time / 60)}:{String(Math.floor(gameState.game_time % 60)).padStart(2, '0')} | 
              State: {gameState.game_state.replace('DOTA_GAMERULES_STATE_', '')} |
              {gameState.paused && " PAUSED"}
            </div>
          )}
          {error && connectionStatus === 'error' && (
            <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
              <div className="font-medium mb-1">Setup Required:</div>
              <div className="whitespace-pre-line">{error}</div>
            </div>
          )}
        </div>

        {/* Keyboard shortcuts info */}
        <div className="mt-3 text-sm text-muted-foreground">
          <div className="font-medium mb-1">Shortcuts:</div>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <span>Ctrl+R: Roshan</span>
            <span>Ctrl+B: Bounty</span>
            <span>Ctrl+P: Power Rune</span>
            <span>Ctrl+L: Lotus</span>
            <span>Ctrl+N: Neutral Pull</span>
            <span>Ctrl+Space: Pause/Resume</span>
          </div>
        </div>
      </Card>

      {/* Install Wizard */}
      <GSIInstallWizard open={showInstallWizard} onOpenChange={setShowInstallWizard} />
      
      {/* Timing Configuration */}
      <TimingConfiguration 
        open={showTimingConfig} 
        onOpenChange={setShowTimingConfig}
        gameTime={gameState?.game_time || 0}
      />

      {/* Audio Bank - Only visible in test mode */}
      {testMode && <AudioBank />}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Game Settings Panel */}
        <div className="lg:col-span-1">
          <GameSettings
            side={side}
            lane={lane}
            gameMode={gameMode}
            onSideChange={setSide}
            onLaneChange={setLane}
            onGameModeChange={setGameMode}
          />
        </div>

        {/* Timer Grid */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DEFAULT_TIMERS.map(timer => {
          const activeTimer = activeTimers[timer.id];
          return (
            <TimerCard
              key={timer.id}
              timer={timer}
              onStart={startTimer}
              onStop={stopTimer}
              onPause={pauseTimer}
              isActive={!!activeTimer}
              isPaused={activeTimer?.isPaused || isPaused}
              timeRemaining={activeTimer?.timeRemaining || timer.duration}
              className="animate-fade-in-up"
            />
          );
          })}
        </div>
      </div>
    </div>
  );
};