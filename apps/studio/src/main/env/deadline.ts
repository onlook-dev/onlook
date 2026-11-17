export interface DeadlineClock {
  after(milliseconds: number, callback: () => void): () => void;
}

export const systemClock: DeadlineClock = {
  after(milliseconds, callback) {
    const timer = setTimeout(callback, milliseconds);
    return () => clearTimeout(timer);
  },
};
