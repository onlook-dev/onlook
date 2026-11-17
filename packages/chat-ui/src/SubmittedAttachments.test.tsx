import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { SubmittedAttachments } from './SubmittedAttachments.js';
import type { ArtifactAttachment } from '@studio/events';

function artifactMarkup(attachments: ArtifactAttachment[]): string {
  return renderToStaticMarkup(<SubmittedAttachments attachments={attachments} imageLabel="Image" imageAlt="Image" imageUnavailable="Unavailable" />);
}

it('leaves a submitted skill out of the shelf, because the bubble renders it as a token', () => {
  const markup = renderToStaticMarkup(
    <SubmittedAttachments
      attachments={[
        { kind: 'skill', name: 'brand-audit', description: 'Check the palette.', agent: 'claude' },
        { kind: 'file', id: 'f1', name: 'notes.md', mediaType: 'text/plain', originalSize: 12 },
      ]}
      imageLabel="Image"
      imageAlt="Image"
      imageUnavailable="Unavailable"
    />,
  );

  expect(markup).not.toContain('chat-submitted-skill-pill');
  expect(markup).not.toContain('brand-audit');
  expect(markup).toContain('chat-submitted-file-pill');
  expect(markup).toContain('notes.md');
});

it('hides artifact identities unless different artifacts in the attachment row share a title', () => {
  const first: ArtifactAttachment = { kind: 'artifact', artifactId: '12340000-1111-4111-8111-000000000001', title: 'Pricing' };
  const second: ArtifactAttachment = { ...first, artifactId: '12340001-1111-4111-8111-000000000002' };
  const unique = artifactMarkup([first]);
  expect(unique).toContain('Pricing');
  expect(unique).not.toContain(first.artifactId);
  expect(unique).not.toContain(' · ');
  expect(artifactMarkup([first, { ...first, pagePath: 'pages/other.html' }])).not.toContain(' · ');
  const collision = artifactMarkup([first, second]);
  expect(collision).toContain('Pricing · 12340000');
  expect(collision).toContain('Pricing · 12340001');
  expect(collision).not.toContain(first.artifactId);
  expect(artifactMarkup([first, { ...second, title: 'Checkout' }])).not.toContain(' · ');
});

function markup(isFrameArtifact?: (name: string) => boolean): string {
  return renderToStaticMarkup(
    <SubmittedAttachments
      attachments={[{ kind: 'frame', name: 'Pricing — dense' }, { kind: 'frame', name: 'Home' }]}
      imageLabel="Image"
      imageAlt="Image"
      imageUnavailable="Image unavailable"
      {...(isFrameArtifact ? { isFrameArtifact } : {})}
    />,
  );
}

/** `alt` and `unavailable` differ from the generic label, so a hit on "Image" can only be the label. */
function imageMarkup(name?: string): string {
  return renderToStaticMarkup(
    <SubmittedAttachments
      attachments={[{ id: 'a', mediaType: 'image/png', ...(name === undefined ? {} : { name }) }]}
      imageLabel="Image"
      imageAlt="Picture in the conversation"
      imageUnavailable="Not available"
    />,
  );
}

describe('a submitted image chip (ONL-2549)', () => {
  it('names the image its composer named, rather than the generic label', () => {
    const html = imageMarkup('reference.png');
    expect(html).toContain('reference.png');
    expect(html).not.toContain('Image');
  });

  it('falls back to the generic label for a row sent before images carried one', () => {
    expect(imageMarkup()).toContain('Image');
  });
});

describe('a submitted frame chip', () => {
  it('wears the artifact accent only for the frames the app names as artifacts', () => {
    const html = markup((name) => name === 'Pricing — dense');
    expect(html.match(/data-accent="artifact"/g)).toHaveLength(1);
    expect(html.indexOf('data-accent="artifact"')).toBeLessThan(html.indexOf('Pricing — dense'));
    expect(html.indexOf('Home')).toBeGreaterThan(html.lastIndexOf('data-accent="artifact"'));
  });

  it('stays on the default accent when the app does not answer', () => {
    expect(markup()).not.toContain('data-accent');
  });
});
