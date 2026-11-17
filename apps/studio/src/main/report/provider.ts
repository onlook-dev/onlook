import type { OnlookClient } from '../cloud/client.js';
import { proofSwitchOn } from '../diagnostics/gate.js';
import { ReportSubmissionError } from '../cloud/client.js';

let proofSubmissions = 0;

export async function reportProvider(): Promise<OnlookClient['submitReport']> {
  if (proofSwitchOn('STUDIO_REPORT_PROOF')) {
    return async () => {
      proofSubmissions += 1;
      if (proofSubmissions === 3) throw new ReportSubmissionError('delivery-unknown');
      return { identifier: 'REPORT-1', url: 'https://example.invalid/report-1', ...(proofSubmissions === 2 ? { partial: true } : {}) };
    };
  }
  return (await import('../cloud/index.js')).reportSubmission();
}
