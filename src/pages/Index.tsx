import { TimerManager } from '@/components/TimerManager';

const Index = () => {
  return (
    <div className="min-h-screen p-4 relative">
      {/* Ancient structures background elements */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-10 left-10 w-32 h-32 bg-gradient-radial from-primary/10 to-transparent rounded-full animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-24 h-24 bg-gradient-radial from-accent/10 to-transparent rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-gradient-radial from-roshan/10 to-transparent rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>
      
      <div className="max-w-6xl mx-auto relative z-10">
        <TimerManager />
      </div>
    </div>
  );
};

export default Index;
