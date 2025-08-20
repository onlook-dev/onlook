import { Icons } from '@onlook/ui/icons';
import React from 'react';
import { AiChatInteractive } from '../../shared/mockups/ai-chat-interactive';

export function AiChatPreviewBlock() {
  return (
    <div className="flex flex-col gap-4 w-full">
      <AiChatInteractive />
      <div className="flex flex-row items-start gap-8 w-full">
        <div className="flex flex-col items-start w-1/2">
          <div className="mb-2"><Icons.Sparkles className="w-6 h-6 text-foreground-primary" /></div>
          <span className="text-foreground-primary text-largePlus font-light">AI Chat</span>
        </div>
        <p className="text-foreground-secondary text-regular text-balance w-1/2">Get instant design help and feedback from AI, right in your workflow.</p>
      </div>
    </div>
  );
}   