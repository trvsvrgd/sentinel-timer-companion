import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, Copy, ExternalLink, FolderOpen, FileText, Server, Gamepad2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GSIInstallWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GSI_CONFIG_CONTENT = `"dota2-gsi Configuration"
{
    "uri"               "http://localhost:3000/gamestate"
    "timeout"           "5.0"
    "buffer"            "0.1"
    "throttle"          "0.5"
    "heartbeat"         "30.0"
    "data"
    {
        "buildings"     "1"
        "provider"      "1"
        "map"           "1"
        "player"        "1"
        "hero"          "1"
        "abilities"     "1"
        "items"         "1"
    }
}`;

const steps = [
  {
    id: 1,
    title: "Create GSI Config File",
    description: "Set up Dota 2 to send game data to our timer app",
    icon: FileText
  },
  {
    id: 2,
    title: "Set Up GSI Server",
    description: "Install and run the local GSI server",
    icon: Server
  },
  {
    id: 3,
    title: "Launch Dota 2",
    description: "Start Dota 2 and enter a match",
    icon: Gamepad2
  }
];

export const GSIInstallWizard: React.FC<GSIInstallWizardProps> = ({ open, onOpenChange }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const { toast } = useToast();

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
        variant: "default"
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Please manually copy the text",
        variant: "destructive"
      });
    }
  };

  const markStepComplete = (stepId: number) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId]);
    }
  };

  const getStepIcon = (stepId: number) => {
    const IconComponent = steps.find(s => s.id === stepId)?.icon || Circle;
    return completedSteps.includes(stepId) ? 
      <CheckCircle className="h-5 w-5 text-green-500" /> : 
      <IconComponent className="h-5 w-5 text-muted-foreground" />;
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Step 1: Create GSI Config File</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create a configuration file that tells Dota 2 to send game state information to our timer app.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium mb-2">1. Navigate to your Dota 2 cfg folder:</p>
                <Card className="p-3 bg-muted">
                  <div className="flex items-center justify-between">
                    <code className="text-sm">Steam/steamapps/common/dota 2 beta/game/dota/cfg/gamestate_integration/</code>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => copyToClipboard("Steam/steamapps/common/dota 2 beta/game/dota/cfg/gamestate_integration/", "Path")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">2. Create a new file named:</p>
                <Card className="p-3 bg-muted">
                  <div className="flex items-center justify-between">
                    <code className="text-sm">gamestate_integration_sentineltimer.cfg</code>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => copyToClipboard("gamestate_integration_sentineltimer.cfg", "Filename")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">3. Copy this content into the file:</p>
                <Card className="p-3 bg-muted">
                  <div className="flex items-start justify-between">
                    <pre className="text-xs overflow-x-auto flex-1 mr-2">{GSI_CONFIG_CONTENT}</pre>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => copyToClipboard(GSI_CONFIG_CONTENT, "Config content")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => { markStepComplete(1); setCurrentStep(2); }}>
                Next Step
              </Button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Step 2: Set Up GSI Server</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Install and run a local server to receive game state data from Dota 2.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium mb-2">Install a GSI server (choose one option):</p>
                
                <div className="space-y-2">
                  <Card className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Option A: Node.js GSI Server</p>
                        <p className="text-xs text-muted-foreground">npm install -g dota2-gsi-server</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => copyToClipboard("npm install -g dota2-gsi-server", "npm command")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>

                  <Card className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Option B: Python GSI Server</p>
                        <p className="text-xs text-muted-foreground">pip install dota2-gsi-server</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => copyToClipboard("pip install dota2-gsi-server", "pip command")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Start the server on port 3000:</p>
                <Card className="p-3 bg-muted">
                  <div className="flex items-center justify-between">
                    <code className="text-sm">dota2-gsi-server --port 3000</code>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => copyToClipboard("dota2-gsi-server --port 3000", "Server command")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Keep this server running while using the timer app. You'll need to start it each time before playing Dota 2.
                </p>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                Previous
              </Button>
              <Button onClick={() => { markStepComplete(2); setCurrentStep(3); }}>
                Next Step
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Step 3: Launch Dota 2</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start Dota 2 and enter a match to test the GSI connection.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <p className="text-sm font-medium">Testing checklist:</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Circle className="h-4 w-4" />
                    <span className="text-sm">GSI server is running on localhost:3000</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Circle className="h-4 w-4" />
                    <span className="text-sm">Config file is in the correct Dota 2 folder</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Circle className="h-4 w-4" />
                    <span className="text-sm">Dota 2 is launched and in a match</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Circle className="h-4 w-4" />
                    <span className="text-sm">GSI connection shows "Connected" in timer app</span>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded p-3">
                <p className="text-sm text-green-800">
                  <strong>Success!</strong> Once connected, you can sync timers with game time and get automated timer alerts based on in-game events.
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Troubleshooting:</strong> If connection fails, check that the GSI server is running and Dota 2 is in an active match (not menu).
                </p>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>
                Previous
              </Button>
              <Button onClick={() => { markStepComplete(3); onOpenChange(false); }}>
                Complete Setup
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>GSI Setup Wizard</DialogTitle>
          <DialogDescription>
            Set up Game State Integration to sync timers with your Dota 2 match
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex items-center gap-2">
                {getStepIcon(step.id)}
                <span className={`text-sm ${currentStep === step.id ? 'font-medium' : 'text-muted-foreground'}`}>
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className="w-8 h-px bg-border mx-4" />
              )}
            </div>
          ))}
        </div>

        {renderStepContent()}
      </DialogContent>
    </Dialog>
  );
};