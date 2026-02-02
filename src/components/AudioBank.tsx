import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Upload, Trash2, Volume2, VolumeX } from 'lucide-react';
import { useAudioBank, type AudioFile, type NotificationEvent } from '@/hooks/useAudioBank';

const AUDIO_AUDIO_EVENTS: { id: NotificationEvent; label: string }[] = [
  { id: 'roshan-spawn', label: 'Roshan Spawn' },
  { id: 'roshan-death', label: 'Roshan Death' },
  { id: 'rune-spawn', label: 'Rune Spawn' },
  { id: 'lotus-bloom', label: 'Lotus Bloom' },
  { id: 'neutral-ready', label: 'Neutral Ready' },
  { id: 'wisdom-available', label: 'Wisdom Shrine' },
  { id: 'timer-alert', label: 'General Alert' }
];

export const AudioBank = () => {
  const { audioFiles, isPlaying, playAudio, playEvent, addCustomAudio, removeCustomAudio, updateAudioConfig, selectedHero, setSelectedHero } = useAudioBank();
  const [filter, setFilter] = useState<string>('all');
  const [eventFilter, setEventFilter] = useState<'all' | NotificationEvent>('all');
  const [uploadHero, setUploadHero] = useState<string>(selectedHero === 'Any' ? '' : selectedHero);
  const [uploadEvent, setUploadEvent] = useState<NotificationEvent | ''>('');
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      addCustomAudio(file, {
        hero: uploadHero && uploadHero.trim().length > 0 ? uploadHero.trim() : 'Any',
        event: uploadEvent || undefined
      });
      event.target.value = ''; // Reset input
    }
  };

  const filteredAudioFiles = audioFiles.filter(audio => (
    (filter === 'all' || audio.category === filter) &&
    (eventFilter === 'all' || audio.event === eventFilter)
  ));

  const getCategoryIcon = (category: AudioFile['category']) => {
    switch (category) {
      case 'roshan': return '🐉';
      case 'rune': return '💎';
      case 'neutral': return '🌳';
      case 'general': return '🔊';
      default: return '🔊';
    }
  };

  const getCategoryColor = (category: AudioFile['category']) => {
    switch (category) {
      case 'roshan': return 'destructive';
      case 'rune': return 'default';
      case 'neutral': return 'secondary';
      case 'general': return 'outline';
      default: return 'outline';
    }
  };

  const uniqueHeroes = Array.from(new Set(audioFiles.map(a => (a.hero || 'Any'))));

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-gradient-ancient border-timer-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-primary">Audio Bank</h2>
            <Badge variant="secondary">Test Mode</Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Label htmlFor="audio-upload" className="cursor-pointer">
              <Button variant="outline" size="sm" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-1" />
                  Upload Audio
                </span>
              </Button>
            </Label>
            <Input
              id="audio-upload"
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label htmlFor="category-filter">Filter by Category</Label>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="roshan">🐉 Roshan</SelectItem>
                <SelectItem value="rune">💎 Runes</SelectItem>
                <SelectItem value="neutral">🌳 Neutral</SelectItem>
                <SelectItem value="general">🔊 General</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="event-filter">Filter by Event</Label>
            <Select value={eventFilter} onValueChange={(v) => setEventFilter(v as 'all' | NotificationEvent)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                {AUDIO_EVENTS.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="hero-filter">Selected Hero (for playback)</Label>
            <Select value={selectedHero} onValueChange={setSelectedHero}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                {['Any', ...uniqueHeroes.filter(h => h !== 'Any')].map(h => (
                  <SelectItem key={h} value={h}>{h}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            <div>
              <Label htmlFor="upload-hero">Upload: Hero</Label>
              <Input id="upload-hero" placeholder="e.g., Anti-Mage or Any" value={uploadHero} onChange={(e) => setUploadHero(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="upload-event">Upload: Event</Label>
              <Select value={uploadEvent || ''} onValueChange={(v) => setUploadEvent(v as NotificationEvent)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose event" />
                </SelectTrigger>
                <SelectContent>
                  {AUDIO_EVENTS.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredAudioFiles.map((audio) => (
            <Card key={audio.id} className="p-3 bg-card/50 border-border">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getCategoryIcon(audio.category)}</span>
                    <div>
                      <h3 className="font-medium text-sm">{audio.name}</h3>
                      <div className="flex gap-1 flex-wrap mt-1">
                        <Badge variant={getCategoryColor(audio.category)} className="text-xs">
                          {audio.category}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {audio.event || 'unassigned'}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {audio.hero || 'Any'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {!audio.isBuiltIn && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCustomAudio(audio.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground">{audio.description}</p>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => playAudio(audio.id)}
                    disabled={isPlaying === audio.id}
                    className="flex-1"
                  >
                    {isPlaying === audio.id ? (
                      <>
                        <VolumeX className="h-3 w-3 mr-1" />
                        Playing...
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 mr-1" />
                        Play
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-6">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-base font-semibold">Admin Test Matrix</h3>
            <Badge variant="outline" className="text-xs">Hero: {selectedHero}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {AUDIO_EVENTS.map(e => {
              const countForHero = audioFiles.filter(a => a.event === e.id && (((a.hero || 'Any') === selectedHero) || ((a.hero || 'Any') === 'Any'))).length;
              return (
                <Card key={e.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-sm font-medium">{e.label}</div>
                      <div className="text-xs text-muted-foreground">{countForHero} option(s) for this hero</div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => playEvent(e.id)}>
                      <Play className="h-3 w-3 mr-1" /> Play Random
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {filteredAudioFiles.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Volume2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No audio files found for this category</p>
          </div>
        )}
      </Card>
    </div>
  );
};