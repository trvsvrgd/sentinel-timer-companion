import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Download, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader2,
  Rocket
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UpdateStatus {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  releaseDate?: string;
  releaseNotes?: string;
  error?: string;
}

interface UpdateProgress {
  percent: number;
  transferred: number;
  total: number;
}

declare global {
  interface Window {
    electronAPI?: {
      checkForUpdates: () => Promise<{ success: boolean; message?: string; error?: string }>;
      downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
      installUpdate: () => Promise<{ success: boolean; error?: string }>;
      onUpdateStatus: (callback: (data: UpdateStatus) => void) => () => void;
      onUpdateProgress: (callback: (data: UpdateProgress) => void) => () => void;
    };
  }
}

export const UpdateManager = () => {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [updateProgress, setUpdateProgress] = useState<UpdateProgress | null>(null);
  const [isElectron, setIsElectron] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsElectron(typeof window !== 'undefined' && !!window.electronAPI);
  }, []);

  useEffect(() => {
    if (!isElectron || !window.electronAPI) return;

    const cleanupStatus = window.electronAPI.onUpdateStatus((data) => {
      setUpdateStatus(data);
      
      if (data.status === 'available') {
        toast({
          title: 'Update Available',
          description: `Version ${data.version} is available for download.`,
          variant: 'default',
        });
      } else if (data.status === 'downloaded') {
        toast({
          title: 'Update Ready',
          description: 'Update downloaded. Restart to install.',
          variant: 'default',
        });
      } else if (data.status === 'error') {
        toast({
          title: 'Update Error',
          description: data.error || 'Failed to check for updates',
          variant: 'destructive',
        });
      }
    });

    const cleanupProgress = window.electronAPI.onUpdateProgress((data) => {
      setUpdateProgress(data);
      setUpdateStatus(prev => prev ? { ...prev, status: 'downloading' } : null);
    });

    return () => {
      cleanupStatus();
      cleanupProgress();
    };
  }, [isElectron, toast]);

  const checkForUpdates = useCallback(async () => {
    if (!window.electronAPI) return;

    setUpdateStatus({ status: 'checking' });
    setUpdateProgress(null);

    try {
      const result = await window.electronAPI.checkForUpdates();
      if (!result.success) {
        setUpdateStatus({
          status: 'error',
          error: result.error || result.message || 'Failed to check for updates'
        });
      }
    } catch (error) {
      setUpdateStatus({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, []);

  const downloadUpdate = useCallback(async () => {
    if (!window.electronAPI) return;

    try {
      const result = await window.electronAPI.downloadUpdate();
      if (!result.success) {
        toast({
          title: 'Download Failed',
          description: result.error || 'Failed to download update',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Download Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const installUpdate = useCallback(async () => {
    if (!window.electronAPI) return;

    try {
      const result = await window.electronAPI.installUpdate();
      if (!result.success) {
        toast({
          title: 'Installation Failed',
          description: result.error || 'Failed to install update',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Installation Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [toast]);

  if (!isElectron) {
    return null; // Only show in Electron app
  }

  const getStatusIcon = () => {
    switch (updateStatus?.status) {
      case 'checking':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'available':
        return <Download className="h-4 w-4" />;
      case 'downloading':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'downloaded':
        return <CheckCircle className="h-4 w-4" />;
      case 'error':
        return <XCircle className="h-4 w-4" />;
      case 'not-available':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = () => {
    switch (updateStatus?.status) {
      case 'available':
      case 'downloaded':
        return 'default';
      case 'error':
        return 'destructive';
      case 'checking':
      case 'downloading':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="p-4 bg-gradient-ancient border-timer-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-primary">Updates</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={checkForUpdates}
          disabled={updateStatus?.status === 'checking' || updateStatus?.status === 'downloading'}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${updateStatus?.status === 'checking' ? 'animate-spin' : ''}`} />
          Check for Updates
        </Button>
      </div>

      {updateStatus && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant={getStatusColor()}>
              {getStatusIcon()}
              <span className="ml-1">
                {updateStatus.status === 'checking' && 'Checking...'}
                {updateStatus.status === 'available' && 'Update Available'}
                {updateStatus.status === 'downloading' && 'Downloading...'}
                {updateStatus.status === 'downloaded' && 'Ready to Install'}
                {updateStatus.status === 'not-available' && 'Up to Date'}
                {updateStatus.status === 'error' && 'Error'}
              </span>
            </Badge>
            {updateStatus.version && (
              <span className="text-sm text-muted-foreground">
                Version {updateStatus.version}
              </span>
            )}
          </div>

          {updateStatus.status === 'downloading' && updateProgress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Downloading update...</span>
                <span>{Math.round(updateProgress.percent)}%</span>
              </div>
              <Progress value={updateProgress.percent} />
              <div className="text-xs text-muted-foreground">
                {Math.round(updateProgress.transferred / 1024 / 1024)} MB / {Math.round(updateProgress.total / 1024 / 1024)} MB
              </div>
            </div>
          )}

          {updateStatus.status === 'available' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Update Available</AlertTitle>
              <AlertDescription className="mt-2">
                {updateStatus.releaseNotes && (
                  <div className="mb-2 text-sm whitespace-pre-line">
                    {updateStatus.releaseNotes}
                  </div>
                )}
                <Button onClick={downloadUpdate} size="sm" className="mt-2">
                  <Download className="h-4 w-4 mr-1" />
                  Download Update
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {updateStatus.status === 'downloaded' && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Update Ready</AlertTitle>
              <AlertDescription className="mt-2">
                <p className="mb-2">Update downloaded successfully. Restart the application to install.</p>
                <Button onClick={installUpdate} size="sm" variant="default">
                  <Rocket className="h-4 w-4 mr-1" />
                  Restart & Install
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {updateStatus.status === 'error' && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Update Error</AlertTitle>
              <AlertDescription>
                {updateStatus.error || 'An error occurred while checking for updates.'}
              </AlertDescription>
            </Alert>
          )}

          {updateStatus.status === 'not-available' && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Up to Date</AlertTitle>
              <AlertDescription>
                You're running the latest version of Sentinel Timer.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {!updateStatus && (
        <p className="text-sm text-muted-foreground">
          Click "Check for Updates" to see if a new version is available.
        </p>
      )}
    </Card>
  );
};
