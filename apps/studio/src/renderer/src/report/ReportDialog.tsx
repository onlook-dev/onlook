import { useEffect, useRef, useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Dialog, DialogHeader } from '../overlay/Dialog.js';
import { HStack, Layout, LayoutContent, LayoutFooter, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { TextArea } from '@astryxdesign/core/TextArea';
import {
  type ReportEntryPoint,
  type ReportLane,
  type ReportRefusalReason,
  type ReportSubmitRequest,
} from '@studio/events';
import { AttachmentPill, ImagePreview } from '@studio/chat-ui';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { CloseIcon, WarningTriangleIcon } from '../icons/glyphs.js';
import { t, type StringKey } from '@studio/i18n';
import { ignoreRefusal } from '../refusal.js';
import { pasteReportImage } from './paste.js';
import {
  canSend,
  chooseReportImage,
  removeReportImage,
  charactersLeft,
  dismissReport,
  reportMessageRows,
  reportPayload,
  sendReport,
  sendsOnKey,
  setReportDraft,
  showsCounter,
  subscribeToReportOpen,
  useReportStore,
  type ReportStatus,
  type ReportState,
} from './store.js';
import { studio } from '../bridge.js';
import './report.css';

const REPORT_TESTIDS = {
  dialog: 'report-dialog',
  form: 'report-form',
  message: 'report-message',
  counter: 'report-counter',
  send: 'report-send',
  cancel: 'report-cancel',
  close: 'report-close',
  retry: 'report-retry',
  copy: 'report-copy',
  refused: 'report-refused',
  picker: 'report-image-picker',
  addImage: 'report-add-image',
  preview: 'report-image-preview',
  removeImage: 'report-remove-image',
  imageError: 'report-image-error',
} as const;

/** The door names the form: the lane is chosen before it opens, so the form has no selector. */
const TITLE_COPY: Record<ReportLane, StringKey> = {
  bug: 'report.title.bug',
  feature: 'report.title.feature',
};

/** Keyed, not a predicate: a new status kind has to say whether the field — and so the count — is on screen. */
const HAS_FIELD: Record<ReportStatus['kind'], boolean> = {
  closed: false,
  composing: true,
  sending: true,
  refused: true,
};

const REFUSAL_COPY: Record<ReportRefusalReason, StringKey> = {
  disabled: 'report.refused.disabled',
  empty: 'report.refused.empty',
  'too-long': 'report.refused.tooLong',
  'too-many': 'report.refused.tooMany',
  lost: 'report.refused.lost',
  malformed: 'report.refused.malformed',
  'send-failed': 'report.refused.sendFailed',
  'delivery-unknown': 'report.refused.deliveryUnknown',
  'image-format': 'report.image.format',
  'image-too-large': 'report.image.tooLarge',
  'image-dimensions': 'report.image.dimensions',
  'image-unreadable': 'report.image.unreadable',
};

export function ReportDialog(): React.JSX.Element {
  const status = useReportStore((s) => s.status);
  const lane = useReportStore((s) => s.lane);
  const draft = useReportStore((s) => s.draft);
  const entryPoint = useReportStore((s) => s.entryPoint);
  const image = useReportStore((s) => s.image);
  const imageCapable = useReportStore((s) => s.imageCapable);
  const imageError = useReportStore((s) => s.imageError);
  const imageBusy = useReportStore((s) => s.imageBusy);
  const sendError = useReportStore((s) => s.sendError);

  useEffect(subscribeToReportOpen, []);
  const isOpen = status.kind !== 'closed';
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    void studio().reportCapability().then((available) => {
      if (active) useReportStore.setState({ imageCapable: available });
    }).catch(ignoreRefusal('report', 'check image capability'));
    return () => { active = false; };
  }, [isOpen]);

  return (
    <ReportDialogView
      status={status}
      lane={lane}
      draft={draft}
      entryPoint={entryPoint}
      attachment={imageCapable ? { image, error: imageError, busy: imageBusy, sendError, onImage: chooseReportImage, onRemove: removeReportImage } : undefined}
      onDraftChange={setReportDraft}
      onSend={sendReport}
      // Try again sends: the words are still in the field, so a second press would only be a step.
      onRetry={sendReport}
      onDismiss={dismissReport}
      onCopy={(message) => {
        void navigator.clipboard.writeText(message).catch(ignoreRefusal('report', 'copy words'));
      }}
    />
  );
}

export interface ReportDialogViewProps {
  attachment?: ReportAttachmentProps;
  status: ReportStatus;
  lane: ReportLane;
  draft: string;
  entryPoint: ReportEntryPoint;
  onDraftChange: (draft: string) => void;
  onSend: () => void;
  onRetry: () => void;
  onDismiss: () => void;
  onCopy: (message: string) => void;
  /** Showroom only: renders without `showModal()` and its focus trap. */
  isInline?: boolean;
}

export function ReportDialogView({
  status,
  lane,
  draft,
  entryPoint,
  onDraftChange,
  onSend,
  onRetry,
  onDismiss,
  onCopy,
  isInline,
  attachment,
}: ReportDialogViewProps): React.JSX.Element {
  const payload = reportPayload({ status, lane, draft, entryPoint });
  // Once, not per consumer: the draft is up to REPORT_MESSAGE_MAX characters and this runs on every keystroke.
  // A rejected image attaches nothing, so its error line informs and never holds Send.
  const isSendable = canSend(draft) && !attachment?.busy;
  return (
    <Dialog
      isOpen={status.kind !== 'closed'}
      {...(isInline === undefined ? {} : { isInline })}
      onOpenChange={(isOpen) => {
        if (!isOpen) onDismiss();
      }}
      purpose="form"
      width={520}
      data-testid={REPORT_TESTIDS.dialog}
    >
      {status.kind === 'closed' ? null : (
        <Layout
          header={
            <DialogHeader
              title={t(TITLE_COPY[lane])}
              hasDivider
              {...(HAS_FIELD[status.kind] && showsCounter(draft) ? { endContent: <Counter draft={draft} /> } : {})}
            />
          }
          content={
            <LayoutContent padding={4} className="report-content">
              <Body
                status={status}
                lane={lane}
                draft={draft}
                isSendable={isSendable}
                payload={payload}
                onDraftChange={onDraftChange}
                onSend={onSend}
                onCopy={onCopy}
                isInline={isInline}
                attachment={attachment}
              />
            </LayoutContent>
          }
          footer={
            <LayoutFooter hasDivider>
              <HStack gap={2} vAlign="center">
                {attachment !== undefined && attachment.image === undefined && HAS_FIELD[status.kind] && (
                  <AddImage {...attachment} disabled={status.kind === 'sending'} />
                )}
                <HStack gap={2} hAlign="end" style={{ marginInlineStart: 'auto' }}>
                  <Actions status={status} isSendable={isSendable} onSend={onSend} onRetry={onRetry} onDismiss={onDismiss} onCopy={() => onCopy(payload.message)} />
                </HStack>
              </HStack>
            </LayoutFooter>
          }
        />
      )}
    </Dialog>
  );
}

interface BodyProps {
  attachment?: ReportAttachmentProps;
  status: Exclude<ReportStatus, { kind: 'closed' }>;
  lane: ReportLane;
  draft: string;
  isSendable: boolean;
  payload: ReportSubmitRequest;
  onDraftChange: (draft: string) => void;
  onSend: () => void;
  onCopy: (message: string) => void;
  isInline?: boolean;
}

function Body({ status, lane, draft, isSendable, onDraftChange, onSend, isInline, attachment }: BodyProps): React.JSX.Element {
  return (
    <ComposingBody
      refusal={status.kind === 'refused' ? status.reason : undefined}
      isSending={status.kind === 'sending'}
      lane={lane}
      draft={draft}
      isSendable={isSendable}
      onDraftChange={onDraftChange}
      onSend={onSend}
      isInline={isInline}
      attachment={attachment}
    />
  );
}

function Counter({ draft }: { draft: string }): React.JSX.Element {
  const left = charactersLeft(draft);
  return (
    <Text
      type="supporting"
      className="report-counter"
      data-testid={REPORT_TESTIDS.counter}
      data-remaining={String(left)}
    >
      {left < 0 ? t('report.message.over', { n: -left }) : t('report.message.remaining', { n: left })}
    </Text>
  );
}

interface ComposingBodyProps {
  attachment?: ReportAttachmentProps;
  /** A refused send keeps the form and its words; only the error line says what happened. */
  refusal?: ReportRefusalReason;
  isSending: boolean;
  lane: ReportLane;
  draft: string;
  isSendable: boolean;
  onDraftChange: (draft: string) => void;
  onSend: () => void;
  isInline?: boolean;
}

function ComposingBody({
  refusal,
  isSending,
  lane,
  draft,
  isSendable,
  onDraftChange,
  onSend,
  isInline,
  attachment,
}: ComposingBodyProps): React.JSX.Element {
  const isOverBound = charactersLeft(draft) < 0;
  const form = { hasPicker: attachment !== undefined, hasSendError: attachment?.sendError !== undefined };
  // A refusal line only reaches a form that has the picker, and the two together are what crowd the footer (ONL-2644).
  const isCompact = form.hasSendError;
  return (
    <VStack
      gap={attachment === undefined ? 4 : isCompact ? 2 : 3}
      // The whole form takes a dropped image, as the chat input does.
      {...(attachment === undefined || isSending ? {} : {
        onPaste: (event: React.ClipboardEvent) => {
          pasteReportImage(event, attachment.onImage);
        },
        onDragOver: (event: React.DragEvent) => {
          if (event.dataTransfer.types.includes('Files')) event.preventDefault();
        },
        onDrop: (event: React.DragEvent) => {
          const file = event.dataTransfer.files[0];
          if (file === undefined) return;
          event.preventDefault();
          attachment.onImage(file);
        },
      })}
      data-testid={REPORT_TESTIDS.form}
      data-state={isSending ? 'sending' : 'composing'}
      data-lane={lane}
      data-can-send={String(isSendable)}
    >
      {/* With an image, the label is drawn here and the pill sits inside the box's top edge, as in the chat input. */}
      <VStack gap={2} className="report-message-group">
      {attachment?.image !== undefined && <Text type="label" aria-hidden="true">{t('report.message.label')}</Text>}
      <div className="report-message-box" {...(attachment?.image !== undefined ? { 'data-has-image': 'true' } : {})}>
      {attachment?.image !== undefined && (
        <div className="report-message-pill">
          <ImagePill image={attachment.image} disabled={isSending} onRemove={attachment.onRemove} />
        </div>
      )}
      {/* Dialog's own initial focus, not React's `autoFocus`; off inline, where no trap holds it. */}
      <TextArea
        label={t('report.message.label')}
        isLabelHidden={attachment?.image !== undefined}
        value={draft}
        onChange={(value) => {
          onDraftChange(value);
        }}
        onKeyDown={(event) => {
          const { key, metaKey, ctrlKey, shiftKey, altKey } = event;
          if (!sendsOnKey({ key, metaKey, ctrlKey, shiftKey, altKey, isComposing: event.nativeEvent.isComposing })) return;
          event.preventDefault();
          if (isSendable && !isSending) onSend();
        }}
        rows={reportMessageRows(form)}
        width="100%"
        className="report-message-field"
        placeholder={t('report.message.placeholder')}
        isDisabled={isSending}
        {...(isOverBound ? { status: { type: 'error' as const } } : {})}
        {...(isInline === true ? {} : { hasAutoFocus: true })}
        data-testid={REPORT_TESTIDS.message}
      />
      </div>
      </VStack>
      <ErrorLine reason={refusal ?? attachment?.sendError ?? attachment?.error} />
    </VStack>
  );
}

export interface ReportAttachmentProps {
  image?: ReportState['image'];
  error?: ReportState['imageError'];
  busy?: boolean;
  sendError?: ReportRefusalReason;
  disabled?: boolean;
  onImage: (file: File) => void;
  onRemove: () => void;
}

/** The chat input's attachment pill: a thumbnail that turns into remove on hover or focus. */
function ImagePill({ image, disabled, onRemove }: { image: NonNullable<ReportState['image']>; disabled: boolean; onRemove: () => void }): React.JSX.Element {
  const [isActive, setActive] = useState(false);
  return (
    <ImagePreview url={image.preview} alt={t('report.image.preview')} unavailableLabel={t('report.image.preview')}>
      <span
        style={{ display: 'inline-flex' }}
        onMouseEnter={() => setActive(true)}
        onMouseLeave={() => setActive(false)}
        onFocus={() => setActive(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setActive(false);
        }}
      >
        <AttachmentPill
          state="unsubmitted"
          label={t('report.image.label')}
          flushLeading
          maxWidth={240}
          leading={
            <IconButton
              label={t('report.image.remove')}
              icon={isActive && !disabled ? (
                <Icon icon={CloseIcon} size="sm" color="inherit" />
              ) : (
                <img src={image.preview} alt="" aria-hidden="true" data-testid={REPORT_TESTIDS.preview}
                  style={{ width: 'var(--studio-attachment-pill-height)', height: 'var(--studio-attachment-pill-height)', objectFit: 'cover' }} />
              )}
              variant="ghost"
              size="sm"
              isDisabled={disabled}
              onClick={onRemove}
              data-testid={REPORT_TESTIDS.removeImage}
              style={{ width: 'var(--studio-attachment-pill-height)', height: 'var(--studio-attachment-pill-height)',
                minWidth: 'var(--studio-attachment-pill-height)', padding: 0, overflow: 'hidden' }}
            />
          }
        />
      </span>
    </ImagePreview>
  );
}

/** Sits at the footer's start, beside Cancel and Send. */
function AddImage({ busy, disabled, onImage }: ReportAttachmentProps): React.JSX.Element {
  const input = useRef<HTMLInputElement>(null);
  const add = useRef<HTMLButtonElement>(null);
  // The pill's remove unmounts the focused control and this mounts in its place, so the keyboard lands here.
  useEffect(() => {
    if (document.activeElement === document.body) add.current?.focus();
  }, []);
  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg"
        hidden
        disabled={disabled || busy}
        aria-label={t('report.image.add')}
        data-testid={REPORT_TESTIDS.picker}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file !== undefined) onImage(file);
        }}
      />
      <Button ref={add} label={t('report.image.add')} variant="secondary" isDisabled={disabled || busy} isLoading={busy}
        data-testid={REPORT_TESTIDS.addImage} onClick={() => input.current?.click()} />
    </>
  );
}

/** One slot for every error, under the message: an icon and a line, the form around it unchanged. */
function ErrorLine({ reason }: { reason: ReportRefusalReason | NonNullable<ReportState['imageError']> | undefined }): React.JSX.Element | null {
  if (reason === undefined) return null;
  return (
    <HStack gap={1.5} vAlign="start" role="alert" data-testid={REPORT_TESTIDS.refused} data-reason={reason}
      style={{ color: 'var(--color-error)' }}>
      <Icon icon={WarningTriangleIcon} size="sm" color="inherit" style={{ flex: '0 0 auto', marginTop: 2 }} />
      <Text type="supporting" color="inherit">{t(REFUSAL_COPY[reason])}</Text>
    </HStack>
  );
}

function Actions({
  status,
  isSendable,
  onSend,
  onRetry,
  onDismiss,
  onCopy,
}: {
  status: ReportStatus;
  isSendable: boolean;
  onSend: () => void;
  onRetry: () => void;
  onDismiss: () => void;
  onCopy: () => void;
}): React.JSX.Element {
  if (status.kind === 'refused') {
    return (
      <>
        <Button label={t('report.cancel')} variant="secondary" data-testid={REPORT_TESTIDS.close} onClick={onDismiss} />
        {/* A build that cannot send hands the words back to copy (ONL-2350). */}
        {status.reason === 'disabled' ? (
          <Button label={t('report.refused.copy')} variant="primary" data-testid={REPORT_TESTIDS.copy} onClick={onCopy} />
        ) : (
          <Button label={t('report.tryAgain')} variant="primary" data-testid={REPORT_TESTIDS.retry} onClick={onRetry} />
        )}
      </>
    );
  }
  const isSending = status.kind === 'sending';
  return (
    <>
      <Button
        label={t('report.cancel')}
        variant="secondary"
        isDisabled={isSending}
        data-testid={REPORT_TESTIDS.cancel}
        onClick={onDismiss}
      />
      <Button
        label={t('report.send')}
        variant="primary"
        isDisabled={!isSendable}
        isLoading={isSending}
        data-testid={REPORT_TESTIDS.send}
        onClick={onSend}
      />
    </>
  );
}
