import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Play, Pause, RotateCcw, Timer, Volume2, VolumeX, Bell } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface KitchenTimerProps {
  recipeName?: string;
  presetMinutes?: number;
}

interface TimerState {
  id: string;
  name: string;
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  isFinished: boolean;
}

export default function KitchenTimer({ recipeName, presetMinutes }: KitchenTimerProps) {
  const [timers, setTimers] = useState<TimerState[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTimerMinutes, setNewTimerMinutes] = useState(presetMinutes || 5);
  const [newTimerName, setNewTimerName] = useState(recipeName || 'Cooking Timer');
  const [isMuted, setIsMuted] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Create audio context for timer sound
  useEffect(() => {
    // Create a simple beep sound using Web Audio API
    const createBeepSound = () => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800; // 800Hz beep
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    };

    audioRef.current = { play: createBeepSound } as any;
  }, []);

  // Timer countdown logic
  useEffect(() => {
    if (timers.some(timer => timer.isRunning)) {
      intervalRef.current = setInterval(() => {
        setTimers(prev => 
          prev.map(timer => {
            if (!timer.isRunning || timer.remainingSeconds <= 0) return timer;
            
            const newRemaining = timer.remainingSeconds - 1;
            
            if (newRemaining <= 0) {
              // Timer finished
              if (!isMuted && audioRef.current) {
                // Play multiple beeps
                for (let i = 0; i < 5; i++) {
                  setTimeout(() => {
                    audioRef.current?.play();
                  }, i * 600);
                }
              }
              
              toast({
                title: "Timer Finished!",
                description: `${timer.name} is ready`,
                duration: 10000,
              });
              
              return {
                ...timer,
                remainingSeconds: 0,
                isRunning: false,
                isFinished: true
              };
            }
            
            return {
              ...timer,
              remainingSeconds: newRemaining
            };
          })
        );
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timers, isMuted]);

  const addTimer = () => {
    const totalSeconds = newTimerMinutes * 60;
    const newTimer: TimerState = {
      id: Date.now().toString(),
      name: newTimerName,
      totalSeconds,
      remainingSeconds: totalSeconds,
      isRunning: false,
      isFinished: false
    };
    
    setTimers(prev => [...prev, newTimer]);
    setIsDialogOpen(false);
    setNewTimerName(recipeName || 'Cooking Timer');
    setNewTimerMinutes(presetMinutes || 5);
  };

  const toggleTimer = (id: string) => {
    setTimers(prev => 
      prev.map(timer => 
        timer.id === id 
          ? { ...timer, isRunning: !timer.isRunning, isFinished: false }
          : timer
      )
    );
  };

  const resetTimer = (id: string) => {
    setTimers(prev => 
      prev.map(timer => 
        timer.id === id 
          ? { 
              ...timer, 
              remainingSeconds: timer.totalSeconds, 
              isRunning: false, 
              isFinished: false 
            }
          : timer
      )
    );
  };

  const removeTimer = (id: string) => {
    setTimers(prev => prev.filter(timer => timer.id !== id));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = (timer: TimerState) => {
    return ((timer.totalSeconds - timer.remainingSeconds) / timer.totalSeconds) * 100;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Timer className="h-5 w-5" />
          Kitchen Timers
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Timer className="h-4 w-4 mr-2" />
                Add Timer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Timer</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Timer Name</label>
                  <Input
                    value={newTimerName}
                    onChange={(e) => setNewTimerName(e.target.value)}
                    placeholder="e.g., Pasta Water, Chicken Bake"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Minutes</label>
                  <Input
                    type="number"
                    min="1"
                    max="180"
                    value={newTimerMinutes}
                    onChange={(e) => setNewTimerMinutes(parseInt(e.target.value) || 1)}
                  />
                </div>
                <Button onClick={addTimer} className="w-full">
                  Create Timer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {timers.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <Timer className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active timers</p>
              <p className="text-sm">Add a timer to keep track of your cooking</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {timers.map(timer => (
            <Card key={timer.id} className={`
              ${timer.isFinished ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}
              ${timer.isRunning ? 'border-blue-500' : ''}
            `}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium">{timer.name}</h4>
                    <div className="text-2xl font-mono font-bold">
                      {formatTime(timer.remainingSeconds)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleTimer(timer.id)}
                      disabled={timer.isFinished && timer.remainingSeconds === 0}
                    >
                      {timer.isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => resetTimer(timer.id)}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTimer(timer.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ×
                    </Button>
                  </div>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-1000 ${
                      timer.isFinished ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${getProgressPercentage(timer)}%` }}
                  />
                </div>
                
                {timer.isFinished && (
                  <div className="mt-2 flex items-center gap-2 text-green-600 dark:text-green-400">
                    <Bell className="h-4 w-4" />
                    <span className="text-sm font-medium">Timer Complete!</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}