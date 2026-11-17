import { create } from 'zustand';
import { createRunFeedback, RUN_FEEDBACK_DELAY_MS, type RunNotice } from './runFeedback.js';

export const useRunFeedbackStore = create<{ notice: RunNotice | undefined }>()(() => ({ notice: undefined }));

export const runFeedback = createRunFeedback({
  publish: (notice) => useRunFeedbackStore.setState({ notice }),
  schedule: (callback) => {
    const timer = setTimeout(callback, RUN_FEEDBACK_DELAY_MS);
    return () => clearTimeout(timer);
  },
});
