import { Button } from '@astryxdesign/core/Button';
import { Icon } from '@astryxdesign/core/Icon';

export interface ChatScrollButtonProps {
  isVisible: boolean;
  isStreaming: boolean;
  label?: string;
  actionLabel: string;
  onClick: () => void;
}

export function ChatScrollButton({ isVisible, isStreaming, label, actionLabel, onClick }: ChatScrollButtonProps): React.JSX.Element {
  /* The glyph gates on `isVisible` so a hidden pill never animates; the width does not, or a pill fading
     out mid-turn flashes clipped text (ONL-2578). */
  const showsDots = isVisible && isStreaming;
  const isExpanded = label !== undefined && !isStreaming;
  return (
    <div
      className="chat-scroll-button"
      data-testid="chat-scroll-button"
      data-visible={isVisible ? 'true' : 'false'}
      data-expanded={isExpanded ? 'true' : 'false'}
      aria-hidden={isVisible ? undefined : true}
      inert={!isVisible}
    >
      <div>
        {/* Astryx renders `label` as a visible span unless `isIconOnly`, and emits it as `aria-label` only
            with it, so the dots pill carries the news in its name alone (ONL-2578). */}
        <Button
          label={label ?? actionLabel}
          isIconOnly={!isExpanded}
          icon={showsDots ? (
            <span className="chat-scroll-dots" aria-hidden="true">
              <span className="chat-scroll-dot" />
              <span className="chat-scroll-dot" />
              <span className="chat-scroll-dot" />
            </span>
          ) : <Icon icon="chevronDown" size="md" data-testid="chat-scroll-chevron" />}
          variant="ghost"
          size="md"
          onClick={onClick}
        />
      </div>
    </div>
  );
}
