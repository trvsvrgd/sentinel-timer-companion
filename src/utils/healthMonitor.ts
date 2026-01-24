// Health monitoring and memory leak prevention

import { logger } from './logger';

interface HealthMetrics {
  memoryUsage: NodeJS.MemoryUsage;
  timestamp: number;
  componentMounts: number;
  activeTimers: number;
  activeListeners: number;
}

class HealthMonitor {
  private metrics: HealthMetrics[] = [];
  private maxMetrics = 50;
  private checkInterval: NodeJS.Timeout | null = null;
  private memoryThreshold = 200 * 1024 * 1024; // 200MB
  private componentMountCount = 0;
  private activeTimers = new Set<number | NodeJS.Timeout>();
  private activeListeners = new Set<() => void>();

  start() {
    if (this.checkInterval) {
      return; // Already started
    }

    this.checkInterval = setInterval(() => {
      this.collectMetrics();
      this.checkHealth();
    }, 30000); // Check every 30 seconds

    // Initial check
    this.collectMetrics();
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private collectMetrics() {
    const metrics: HealthMetrics = {
      memoryUsage: process.memoryUsage(),
      timestamp: Date.now(),
      componentMounts: this.componentMountCount,
      activeTimers: this.activeTimers.size,
      activeListeners: this.activeListeners.size,
    };

    this.metrics.push(metrics);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  private checkHealth() {
    if (this.metrics.length === 0) return;

    const latest = this.metrics[this.metrics.length - 1];
    const { heapUsed, heapTotal } = latest.memoryUsage;

    // Check memory usage
    if (heapUsed > this.memoryThreshold) {
      logger.warn('High memory usage detected', {
        heapUsed: `${(heapUsed / 1024 / 1024).toFixed(2)}MB`,
        heapTotal: `${(heapTotal / 1024 / 1024).toFixed(2)}MB`,
        threshold: `${(this.memoryThreshold / 1024 / 1024).toFixed(2)}MB`,
      });
    }

    // Check for memory leaks (increasing trend)
    if (this.metrics.length >= 5) {
      const recent = this.metrics.slice(-5);
      const memoryTrend = recent.map(m => m.memoryUsage.heapUsed);
      const isIncreasing = memoryTrend.every((val, i) => i === 0 || val >= memoryTrend[i - 1]);
      
      if (isIncreasing && memoryTrend[memoryTrend.length - 1] > memoryTrend[0] * 1.2) {
        logger.warn('Potential memory leak detected - memory usage increasing', {
          initial: `${(memoryTrend[0] / 1024 / 1024).toFixed(2)}MB`,
          current: `${(memoryTrend[memoryTrend.length - 1] / 1024 / 1024).toFixed(2)}MB`,
        });
      }
    }

    // Check for too many active timers
    if (latest.activeTimers > 20) {
      logger.warn('High number of active timers detected', {
        count: latest.activeTimers,
      });
    }

    // Check for too many listeners
    if (latest.activeListeners > 50) {
      logger.warn('High number of active listeners detected', {
        count: latest.activeListeners,
      });
    }
  }

  trackTimer(timerId: number | NodeJS.Timeout) {
    this.activeTimers.add(timerId);
  }

  untrackTimer(timerId: number | NodeJS.Timeout) {
    this.activeTimers.delete(timerId);
  }

  trackListener(listener: () => void) {
    this.activeListeners.add(listener);
  }

  untrackListener(listener: () => void) {
    this.activeListeners.delete(listener);
  }

  incrementComponentMounts() {
    this.componentMountCount++;
  }

  getMetrics(): HealthMetrics[] {
    return [...this.metrics];
  }

  getLatestMetrics(): HealthMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }
}

export const healthMonitor = new HealthMonitor();

// Auto-start in production
if (typeof window !== 'undefined') {
  healthMonitor.start();
}
