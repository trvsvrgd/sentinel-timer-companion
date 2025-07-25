import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, RotateCcw, Save, Trash2, Plus, Eye } from 'lucide-react';
import { useTimingConfiguration, type TimingEvent } from '@/hooks/useTimingConfiguration';
import { useToast } from '@/hooks/use-toast';

interface TimingConfigurationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameTime?: number;
}

export const TimingConfiguration: React.FC<TimingConfigurationProps> = ({ 
  open, 
  onOpenChange, 
  gameTime = 0 
}) => {
  const { toast } = useToast();
  const {
    timingEvents,
    presets,
    activePreset,
    customTimings,
    getEffectiveTime,
    setCustomTiming,
    resetCustomTiming,
    resetAllCustomTimings,
    createCustomPreset,
    deletePreset,
    loadPreset,
    getUpcomingEvents
  } = useTimingConfiguration();

  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDescription, setNewPresetDescription] = useState('');
  const [tempTimings, setTempTimings] = useState<Record<string, string>>({});

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatGameTime = (seconds: number): string => {
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.abs(seconds) % 60;
    const sign = seconds < 0 ? '-' : '';
    return `${sign}${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTimingChange = (eventId: string, value: string) => {
    setTempTimings(prev => ({ ...prev, [eventId]: value }));
  };

  const applyTiming = (eventId: string) => {
    const value = tempTimings[eventId];
    if (value) {
      const numValue = parseInt(value);
      if (numValue > 0) {
        setCustomTiming(eventId, numValue);
        setTempTimings(prev => {
          const updated = { ...prev };
          delete updated[eventId];
          return updated;
        });
        toast({
          title: "Timing Updated",
          description: `${timingEvents.find(e => e.id === eventId)?.name} set to ${formatTime(numValue)}`,
          variant: "default"
        });
      }
    }
  };

  const handleCreatePreset = () => {
    if (newPresetName.trim()) {
      const presetId = createCustomPreset(newPresetName.trim(), newPresetDescription.trim());
      setNewPresetName('');
      setNewPresetDescription('');
      toast({
        title: "Preset Created",
        description: `Custom preset "${newPresetName}" has been saved`,
        variant: "default"
      });
    }
  };

  const upcomingEvents = getUpcomingEvents(gameTime);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Timing Configuration</DialogTitle>
          <DialogDescription>
            Customize event timings and manage presets. Current game time: {formatGameTime(gameTime)}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="timings" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="timings">Event Timings</TabsTrigger>
            <TabsTrigger value="presets">Presets</TabsTrigger>
            <TabsTrigger value="preview">Live Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="timings" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Event Timings</h3>
                <p className="text-sm text-muted-foreground">
                  Customize individual event timings. Changes override preset settings.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={resetAllCustomTimings}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset All
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              {timingEvents.map(event => {
                const effectiveTime = getEffectiveTime(event.id);
                const hasCustomTiming = customTimings[event.id] !== undefined;
                const tempValue = tempTimings[event.id];

                return (
                  <Card key={event.id} className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{event.name}</h4>
                          <Badge variant={hasCustomTiming ? "default" : "secondary"}>
                            {hasCustomTiming ? "Custom" : "Default"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Category: {event.category} | Default: {formatTime(event.defaultTime)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Label htmlFor={`timing-${event.id}`} className="text-sm">
                          Time (seconds):
                        </Label>
                        <Input
                          id={`timing-${event.id}`}
                          type="number"
                          min="1"
                          value={tempValue ?? effectiveTime}
                          onChange={(e) => handleTimingChange(event.id, e.target.value)}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">
                          ({formatTime(parseInt(tempValue || effectiveTime.toString()))})
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => applyTiming(event.id)}
                          disabled={!tempValue || tempValue === effectiveTime.toString()}
                        >
                          <Save className="h-4 w-4 mr-1" />
                          Apply
                        </Button>
                        {hasCustomTiming && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              resetCustomTiming(event.id);
                              const updated = { ...tempTimings };
                              delete updated[event.id];
                              setTempTimings(updated);
                            }}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Reset
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="presets" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Timing Presets</h3>
              <p className="text-sm text-muted-foreground">
                Manage preset configurations for different game versions or play styles.
              </p>
            </div>

            <div className="grid gap-4">
              <Card className="p-4">
                <h4 className="font-medium mb-3">Create New Preset</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="preset-name">Preset Name</Label>
                    <Input
                      id="preset-name"
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      placeholder="e.g., 'Early Warning Setup'"
                    />
                  </div>
                  <div>
                    <Label htmlFor="preset-description">Description</Label>
                    <Textarea
                      id="preset-description"
                      value={newPresetDescription}
                      onChange={(e) => setNewPresetDescription(e.target.value)}
                      placeholder="Describe this preset..."
                      className="min-h-[40px]"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleCreatePreset}
                  disabled={!newPresetName.trim()}
                  className="mt-3"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create Preset
                </Button>
              </Card>

              {presets.map(preset => (
                <Card key={preset.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{preset.name}</h4>
                        <Badge variant={preset.isDefault ? "default" : "secondary"}>
                          {preset.isDefault ? "Default" : "Custom"}
                        </Badge>
                        {activePreset?.id === preset.id && (
                          <Badge variant="outline">Active</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{preset.description}</p>
                      <p className="text-xs text-muted-foreground">
                        Version: {preset.version} | 
                        Events: {Object.keys(preset.events).length} customized
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadPreset(preset.id)}
                        disabled={activePreset?.id === preset.id}
                      >
                        Load
                      </Button>
                      {!preset.isDefault && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (deletePreset(preset.id)) {
                              toast({
                                title: "Preset Deleted",
                                description: `"${preset.name}" has been removed`,
                                variant: "default"
                              });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Live Event Preview</h3>
              <p className="text-sm text-muted-foreground">
                See when upcoming events will occur based on current game time and settings.
              </p>
            </div>

            <div className="grid gap-3">
              {upcomingEvents.slice(0, 8).map(event => (
                <Card key={event.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium">{event.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {formatTime(event.effectiveTime)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm">
                        {formatGameTime(event.nextEventTime)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        in {formatTime(Math.max(0, event.timeUntilNext))}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {gameTime === 0 && (
              <Card className="p-4 bg-muted/50">
                <p className="text-sm text-muted-foreground text-center">
                  Connect to a live game to see real-time event predictions
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};