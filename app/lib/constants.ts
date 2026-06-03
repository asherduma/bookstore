/**
 * Small structural utility to cleanly assemble Server-Timing header components
 */
export function createServerTiming() {
  const timers: Record<string, number> = {};
  
  return {
    start(label: string) {
      timers[label] = performance.now();
    },
    end(label: string): string {
      const start = timers[label];
      if (!start) return "";
      const duration = performance.now() - start;
      return `${label};dur=${duration.toFixed(2)}`;
    }
  };
}