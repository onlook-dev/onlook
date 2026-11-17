/**
 * ONL-2350 — the report form at every state. The library's text field and lane
 * control have no other caller yet, so this gallery is where they are looked at.
 * `bun run showroom report` (or `report:composing`, `report:held`, `report:settled`, `report:keyless`).
 */

import { useState } from 'react';
import { REPORT_MESSAGE_MAX, type ReportLane } from '@studio/events';
import { ReportDialogView, type ReportAttachmentProps } from '../../report/ReportDialog.js';
import { COUNTER_SHOWS_WITHIN, type ReportStatus } from '../../report/store.js';
import { noop, type Category, type Gallery, type Story } from './Showroom.js';

const WORDS = 'I dragged the pricing frame and the canvas jumped back to where it started.';

function shot(page: string, panel: string): string {
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300"><rect width="480" height="300" fill="#202024"/><rect x="24" y="24" width="432" height="20" rx="4" fill="#555561"/><rect x="24" y="64" width="200" height="180" rx="8" fill="${page}"/><rect x="244" y="64" width="212" height="48" rx="8" fill="${panel}"/><rect x="244" y="128" width="160" height="12" rx="4" fill="#777787"/></svg>`)}`;
}

const SHOTS = [shot('#393942', '#444454'), shot('#3a3252', '#4a4068'), shot('#2f4347', '#3c565c'), shot('#473a2f', '#5c4a3c'), shot('#2f3a47', '#3c4a5c')];

const EMPTY_ATTACHMENT: ReportAttachmentProps = { onImage: noop, onRemove: noop };
const SELECTED_ATTACHMENT: ReportAttachmentProps = {
  ...EMPTY_ATTACHMENT,
  image: { contentType: 'image/png', bytes: new Uint8Array(), preview: SHOTS[0]! },
};

interface FormProps {
  status: ReportStatus;
  initialDraft?: string;
  initialLane?: ReportLane;
  attachment?: ReportAttachmentProps;
}

function Form({ status, initialDraft = '', initialLane = 'bug', attachment }: FormProps): React.JSX.Element {
  const lane = initialLane;
  const [draft, setDraft] = useState(initialDraft);
  return (
    <ReportDialogView
      status={status}
      lane={lane}
      draft={draft}
      entryPoint="menu"
      onDraftChange={setDraft}
      onSend={noop}
      onRetry={noop}
      onDismiss={noop}
      onCopy={noop}
      isInline
      attachment={attachment}
    />
  );
}

function story(id: string, title: string, note: string, render: () => React.ReactNode): Story {
  return { id: `report-gallery-${id}`, title, note, render };
}

const CATEGORIES: Category[] = [
  {
    id: 'images',
    title: 'Images in a report',
    stories: [
      story('image-default', 'Add an image', 'The provider supports images, but none is selected.', () => <Form status={{ kind: 'composing' }} initialDraft={WORDS} attachment={EMPTY_ATTACHMENT} />),
      story('image-empty', 'Empty report', 'Choosing an image does not replace the required message.', () => <Form status={{ kind: 'composing' }} attachment={EMPTY_ATTACHMENT} />),
      story('image-selected', 'Selected image', 'A preview, removal action, and project-content warning.', () => <Form status={{ kind: 'composing' }} initialDraft={WORDS} attachment={SELECTED_ATTACHMENT} />),
      story('image-error', 'Image too large', 'The error offers another choice or removal.', () => <Form status={{ kind: 'composing' }} initialDraft={WORDS} attachment={{ ...EMPTY_ATTACHMENT, error: 'image-too-large' }} />),
      story('image-dimensions', 'Image dimensions', 'Both decoded dimension bounds are stated.', () => <Form status={{ kind: 'composing' }} initialDraft={WORDS} attachment={{ ...EMPTY_ATTACHMENT, error: 'image-dimensions' }} />),
      story('image-format', 'Unsupported format', 'PNG or JPEG only.', () => <Form status={{ kind: 'composing' }} initialDraft={WORDS} attachment={{ ...EMPTY_ATTACHMENT, error: 'image-format' }} />),
      story('image-unreadable', 'Unreadable image', 'An invalid image cannot be attached.', () => <Form status={{ kind: 'composing' }} initialDraft={WORDS} attachment={{ ...EMPTY_ATTACHMENT, error: 'image-unreadable' }} />),
      story('image-sending', 'Sending image', 'Controls are disabled while filing.', () => <Form status={{ kind: 'sending' }} initialDraft={WORDS} attachment={SELECTED_ATTACHMENT} />),
      story('image-loading', 'Reading image', 'Send waits until validation completes.', () => <Form status={{ kind: 'composing' }} initialDraft={WORDS} attachment={{ ...EMPTY_ATTACHMENT, busy: true }} />),
      story('image-failed', 'Send failed', 'The draft and image stay in the form.', () => <Form status={{ kind: 'composing' }} initialDraft={WORDS} attachment={{ ...SELECTED_ATTACHMENT, sendError: 'send-failed' }} />),
      story('image-uncertain', 'Delivery unknown', 'The image and message remain, without claiming that no report exists.', () => <Form status={{ kind: 'composing' }} initialDraft={WORDS} attachment={{ ...SELECTED_ATTACHMENT, sendError: 'delivery-unknown' }} />),
    ],
  },
  {
    id: 'composing',
    title: 'Composing — the lane, the words, what leaves with them',
    stories: [
      story('empty', 'Nothing typed', 'Send is unavailable until there are words', () => (
        <Form status={{ kind: 'composing' }} />
      )),
      story('typed', 'A message typed', 'Send acts', () => (
        <Form status={{ kind: 'composing' }} initialDraft={WORDS} initialLane="bug" />
      )),
      story('feature', 'A feature request', 'the second door: same form, its own title', () => (
        <Form status={{ kind: 'composing' }} initialLane="feature" />
      )),
      story('near-bound', 'Close to the bound', 'the count appears beside the title, the form below it unmoved', () => (
        <Form status={{ kind: 'composing' }} initialDraft={'x'.repeat(REPORT_MESSAGE_MAX - COUNTER_SHOWS_WITHIN)} />
      )),
    ],
  },
  {
    id: 'held',
    title: 'Held — the two states where Send does not act',
    stories: [
      story('sending', 'Sending', 'the field, the lane and Cancel are all held while the send is in flight', () => (
        <Form status={{ kind: 'sending' }} initialDraft={WORDS} />
      )),
      story('over-bound', 'Past the length bound', 'the count states the overage beside the title, and Send is unavailable', () => (
        <Form status={{ kind: 'composing' }} initialDraft={'x'.repeat(REPORT_MESSAGE_MAX + 12)} />
      )),
    ],
  },
  {
    id: 'settled',
    title: 'Refused — a plain refusal, never silence',
    stories: [
      story('refused-too-many', 'Refused — too many', 'its own refusal, with the words kept for another try', () => (
        <Form status={{ kind: 'refused', reason: 'too-many' }} initialDraft={WORDS} />
      )),
      story('refused-lost', 'Refused — not queued', 'the words are still in the form behind this', () => (
        <Form status={{ kind: 'refused', reason: 'lost' }} initialDraft={WORDS} />
      )),
    ],
  },
  {
    id: 'keyless',
    title: 'Keyless — a build that cannot send at all',
    stories: [
      story('refused-disabled', 'Refused — this build cannot send', 'the words come back with somewhere to send them', () => (
        <Form status={{ kind: 'refused', reason: 'disabled' }} initialDraft={WORDS} />
      )),
    ],
  },
];

export const REPORT_GALLERY: Gallery = {
  id: 'report',
  title: 'Report',
  subtitle: 'One form, both doors: composing, sending, and the outcome it always states.',
  categories: CATEGORIES,
};
