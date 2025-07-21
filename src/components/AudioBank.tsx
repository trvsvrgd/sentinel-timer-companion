import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Upload, Trash2, Volume2, VolumeX } from 'lucide-react';
import { useAudioBank, type AudioFile } from '@/hooks/useAudioBank';

export const AudioBank = () => {
  const { audioFiles, isPlaying, playAudio, addCustomAudio, removeCustomAudio, updateAudioConfig } = useAudioBank();
  const [filter, setFilter] = useState<string>('all');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      addCustomAudio(file);
      event.target.value = ''; // Reset input
    }
  };

  const filteredAudioFiles = audioFiles.filter(audio => 
    filter === 'all' || audio.category === filter
  );

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

        <div className="mb-4">
          <Label htmlFor="category-filter">Filter by Category</Label>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredAudioFiles.map((audio) => (
            <Card key={audio.id} className="p-3 bg-card/50 border-border">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getCategoryIcon(audio.category)}</span>
                    <div>
                      <h3 className="font-medium text-sm">{audio.name}</h3>
                      <Badge variant={getCategoryColor(audio.category)} className="text-xs">
                        {audio.category}
                      </Badge>
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