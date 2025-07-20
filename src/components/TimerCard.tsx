import { useState, useEffect } from 'react';
import { Play, Pause, Square, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface Timer {
  id: string;
  name: string;
  duration: number;
  minDuration?: number;
  maxDuration?: number;
  type: 'roshan' | 'rune' | 'neutral' | 'custom';
  audioAlert?: boolean;
}

interface TimerCardProps {
  timer: Timer;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onPause: (id: string) => void;
  isActive: boolean;
  isPaused: boolean;
  timeRemaining: number;
  className?: string;
}

export const TimerCard = ({
  timer,
  onStart,
  onStop,
  onPause,
  isActive,
  isPaused,
  timeRemaining,
  className
}: TimerCardProps) => {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    if (isActive && !isPaused && timer.duration > 0) {
      const elapsed = timer.duration - timeRemaining;
      setProgress((elapsed / timer.duration) * 100);
    } else {
      setProgress(0);
    }
  }, [timeRemaining, timer.duration, isActive, isPaused]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    switch (timer.type) {
      case 'roshan':
        return 'roshan';
      case 'rune':
        return 'rune';
      case 'neutral':
        return 'neutral';
      default:
        return 'primary';
    }
  };

  const getStatusText = () => {
    if (!isActive) return 'Ready';
    if (isPaused) return 'Paused';
    if (timeRemaining <= 0) return 'ALERT!';
    
    // Special handling for Roshan timer
    if (timer.type === 'roshan' && timer.minDuration && timer.maxDuration) {
      const elapsed = timer.duration - timeRemaining;
      if (elapsed >= timer.minDuration && elapsed < timer.maxDuration) {
        return 'Can Spawn';
      }
      if (elapsed >= timer.maxDuration) {
        return 'SPAWNED!';
      }
    }
    
    return formatTime(timeRemaining);
  };

  const colorClass = getTimerColor();
  const isAlertState = timeRemaining <= 0 || 
    (timer.type === 'roshan' && timer.minDuration && 
     (timer.duration - timeRemaining) >= timer.minDuration);

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300",
      "bg-gradient-timer border-timer-border shadow-card",
      "hover:shadow-glow hover:border-primary/50",
      isActive && "animate-glow-pulse",
      isAlertState && "border-accent bg-gradient-accent",
      className
    )}>
      {/* Progress bar */}
      {isActive && (
        <div className="absolute top-0 left-0 h-1 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all duration-1000 ease-linear",
              `bg-${colorClass}`,
              isAlertState && "bg-accent animate-timer-pulse"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className={cn(
            "font-semibold text-lg",
            isAlertState && "text-accent animate-timer-pulse"
          )}>
            {timer.name}
          </h3>
          {timer.audioAlert && (
            <Volume2 className={cn(
              "h-4 w-4",
              isActive ? "text-primary" : "text-muted-foreground"
            )} />
          )}
        </div>

        {/* Time display */}
        <div className="text-center">
          <div className={cn(
            "text-3xl font-mono font-bold tracking-wide",
            isAlertState && "text-accent animate-timer-pulse"
          )}>
            {getStatusText()}
          </div>
          
          {/* Roshan window indicators */}
          {timer.type === 'roshan' && timer.minDuration && timer.maxDuration && isActive && (
            <div className="mt-2 text-sm text-muted-foreground">
              <div>Min: {formatTime(timer.minDuration)}</div>
              <div>Max: {formatTime(timer.maxDuration)}</div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-2 justify-center">
          {!isActive ? (
            <Button
              onClick={() => onStart(timer.id)}
              variant="default"
              size="sm"
              className="bg-gradient-primary hover:shadow-glow"
            >
              <Play className="h-4 w-4 mr-1" />
              Start
            </Button>
          ) : (
            <>
              <Button
                onClick={() => onPause(timer.id)}
                variant="secondary"
                size="sm"
              >
                <Pause className="h-4 w-4 mr-1" />
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
              <Button
                onClick={() => onStop(timer.id)}
                variant="destructive"
                size="sm"
              >
                <Square className="h-4 w-4 mr-1" />
                Stop
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};