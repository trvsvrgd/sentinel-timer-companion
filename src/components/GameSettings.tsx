import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface GameSettingsProps {
  side: 'radiant' | 'dire';
  lane: 'safe' | 'mid' | 'off';
  gameMode: 'allpick' | 'turbo';
  onSideChange: (side: 'radiant' | 'dire') => void;
  onLaneChange: (lane: 'safe' | 'mid' | 'off') => void;
  onGameModeChange: (mode: 'allpick' | 'turbo') => void;
}

export const GameSettings: React.FC<GameSettingsProps> = ({
  side,
  lane,
  gameMode,
  onSideChange,
  onLaneChange,
  onGameModeChange,
}) => {
  const handleLaneChange = () => {
    const lanes: Array<'safe' | 'mid' | 'off'> = ['safe', 'mid', 'off'];
    const currentIndex = lanes.indexOf(lane);
    const nextIndex = (currentIndex + 1) % lanes.length;
    onLaneChange(lanes[nextIndex]);
  };

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3">Game Settings</h3>
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-muted-foreground">Team</label>
          <div className="mt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSideChange(side === 'radiant' ? 'dire' : 'radiant')}
              className="w-full justify-start"
            >
              {side === 'radiant' ? '🌞 Radiant' : '🌙 Dire'}
            </Button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground">Lane</label>
          <div className="mt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLaneChange}
              className="w-full justify-start"
            >
              {lane === 'safe' && '⚔️ Safe Lane'}
              {lane === 'mid' && '🎯 Mid Lane'}
              {lane === 'off' && '🛡️ Off Lane'}
            </Button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground">Game Mode</label>
          <div className="mt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onGameModeChange(gameMode === 'allpick' ? 'turbo' : 'allpick')}
              className="w-full justify-start"
            >
              {gameMode === 'allpick' ? '⚡ All Pick' : '🚀 Turbo'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};