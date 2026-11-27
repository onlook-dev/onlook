import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { IconEmail1 } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconEmail1';
import { IconGoogle } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconGoogle';
import type { OnlookState } from '@studio/events';
import { t } from '@studio/i18n';
import { accountAccessGallery } from '../dev/showroom/account-access.js';
import { GettingStarted } from './GettingStarted.js';
import { AccountSettings } from './AccountSettings.js';
import { accountErrorText } from './useAccountAction.js';
import { SignInIcon } from './SignInIcon.js';

const STATE: OnlookState = {
  revision: 1, session: 'signed-in', connection: 'offline',
  profile: { name: 'Alex Designer', email: 'alex.with-a-very-long-address@a-very-long-company-domain.example.com', picture: null },
  me: null,
};
const noop = (): void => {};
/** Every glyph in `round-outlined-radius-1-stroke-1.5` draws at this width (ONL-2821). */
const FAMILY_STROKE = 1.5;
/** An Astryx button's focus ring is 2px wide at its own 3px offset (ONL-2821). */
const FOCUS_RING_EXTENT = 5;
const settings = { state: STATE, onSignOut: noop, onRequestDelete: noop, onCancelDelete: noop, onDelete: noop };

describe('pure account access surfaces', () => {
  it('offers only the three browser methods and no manual identity form', () => {
    const html = renderToStaticMarkup(<GettingStarted onSignIn={noop} onCancel={noop} />);
    for (const [method, label] of [['google', 'Sign in with Google'], ['github', 'Sign in with GitHub'], ['email', 'Sign in with email']] as const) {
      expect(t(`account.continue.${method}`)).toBe(label);
      expect(html).toContain(`aria-label="${label}"`);
    }
    expect(html).not.toContain('<input');
    expect(html).not.toContain('You’ll sign in securely in your browser');
    expect(html).toContain('https://www.onlook.com/privacy-policy');
    expect(html).toContain('https://www.onlook.com/terms-of-service');
    expect(html).toContain(t('account.privacyPolicy'));
    expect(html).toContain(t('account.termsOfService'));
    expect(html).not.toContain('{privacyPolicy}');
    expect(html).not.toContain('{termsOfService}');
  });

  it('uses decorative local provider marks without changing button names', () => {
    for (const method of ['google', 'github', 'email'] as const) {
      const icon = renderToStaticMarkup(<SignInIcon method={method} />);
      expect(icon.match(/aria-hidden="true"/g)).toHaveLength(1);
      expect(icon).not.toContain('<title');
      expect(icon).not.toContain('<mask');
      expect(icon).not.toMatch(/(?:src|href)="https?:/);
      expect(icon).toContain('<svg');
      expect(icon).toContain('currentColor');
      expect(icon).not.toContain('<img');
    }
  });

  it('keeps every provider mark in the centered button content flow', () => {
    const html = renderToStaticMarkup(<GettingStarted onSignIn={noop} onCancel={noop} />);
    expect(html.match(/display:flex;align-items:center;gap:var\(--spacing-2\)/g)).toHaveLength(3);
    const boxes = [...html.matchAll(/<span([^>]*data-testid="account-mark"[^>]*)>/g)].map((match) => match[1]);
    expect(boxes).toHaveLength(3);
    expect(new Set(boxes).size).toBe(1);
    expect(boxes[0]).not.toContain('position:absolute');
    expect(boxes[0]).toContain('flex-shrink:0');
    for (const method of ['google', 'github', 'email'] as const) {
      expect(html).toContain(`aria-label="${t(`account.continue.${method}`)}"`);
    }
  });

  it('seats the provider buttons in a column narrower than the one the text measures by', () => {
    const html = renderToStaticMarkup(<GettingStarted onSignIn={noop} onCancel={noop} />);
    // The width of the element AROUND the marker's own, since that is what holds a column (ONL-2821).
    const column = (marker: string): number => {
      const own = html.lastIndexOf('<', html.indexOf(marker));
      const parent = html.lastIndexOf('<div', own - 1);
      return Number(/max-width:(\d+)px/.exec(html.slice(parent, html.indexOf('>', parent)))?.[1]);
    };
    expect(column('onboarding-heading')).toBeGreaterThan(0);
    expect(column('account-continue-google')).toBeLessThan(column('onboarding-heading'));
  });

  for (const split of [false, true]) {
    it(`leaves every box that clips this screen room for a focus ring, and shifts none of them (split: ${String(split)})`, () => {
      const html = renderToStaticMarkup(<GettingStarted onSignIn={noop} onCancel={noop} {...(split ? { aside: <div /> } : {})} />);
      const styles = [...html.matchAll(/style="([^"]*)"/g)].map((match) => match[1]!);
      const scroller = styles.findIndex((style) => style.includes('overflow-y:auto'));
      expect(scroller).toBeGreaterThanOrEqual(0);
      const clipping = styles.slice(scroller).filter((style) => /(?:^|;)overflow(?:-[xy])?:(?!visible)/.test(style));
      for (const style of clipping) {
        const length = (property: string): number => Number(new RegExp(`(?:^|;)${property}:(-?[\\d.]+)px`).exec(style)?.[1]);
        expect(length('padding-inline')).toBeGreaterThanOrEqual(FOCUS_RING_EXTENT);
        expect(length('margin-inline')).toBe(-length('padding-inline'));
      }
    });
  }

  it('draws both paths of the email mark at one weight, heavier than the family default', () => {
    const marked = renderToStaticMarkup(<SignInIcon method="email" />).match(/class="([^"]+)"/)?.[1];
    const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
    const rule = (path: string): string => new RegExp(`\\.${marked!} path\\[${path}\\]\\s*\\{[^}]*\\}`).exec(css)?.[0] ?? '';
    const width = (path: string): number => Number(/stroke-width:\s*([\d.]+)/.exec(rule(path))?.[1]);
    expect(marked).toBeDefined();
    // The outline is the family's 1.5-unit fill, which its stroke adds to; the flap is stroke alone.
    expect(rule('fill')).toContain('stroke: currentColor');
    expect(width('fill') + FAMILY_STROKE).toBeCloseTo(width('stroke'), 5);
    expect(width('stroke')).toBeGreaterThan(FAMILY_STROKE);
  });

  it('uses the Central Icons Google and email glyphs at the shared size', () => {
    for (const [method, Glyph] of [['google', IconGoogle], ['email', IconEmail1]] as const) {
      const icon = renderToStaticMarkup(<SignInIcon method={method} />);
      const expected = renderToStaticMarkup(<Glyph mode="raw" size={20} />);
      expect(icon.match(/<path\b[^>]*>/g)).toEqual(expected.match(/<path\b[^>]*>/g));
      expect(icon).toContain('viewBox="0 0 24 24"');
      expect(icon).toContain('width="20px"');
      expect(icon).toContain('height="20px"');
      expect(icon).toContain('flex-shrink:0');
    }
  });

  it('dims the legal copy with a shared neutral token while links inherit its color', () => {
    const html = renderToStaticMarkup(<GettingStarted onSignIn={noop} onCancel={noop} />);
    expect(html).toContain('color:var(--color-icon-secondary)');
    const links = [...html.matchAll(/<a\b[^>]*href="https:\/\/www\.onlook\.com\/(?:privacy-policy|terms-of-service)"[^>]*>/g)];
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link[0]).toContain('target="_blank"');
      expect(link[0]).toContain('rel="noopener noreferrer"');
      expect(link[0]).toContain('data-color="inherit"');
    }
  });

  for (const busy of ['google', 'github', 'email', 'sign-out'] as const) {
    it(`replaces provider buttons with browser status and secondary cancellation during ${busy}`, () => {
      const html = renderToStaticMarkup(<GettingStarted busy={busy} onSignIn={noop} onCancel={noop} />);
      expect(html).not.toContain('account-continue-');
      expect(html).toContain('aria-busy="true"');
      expect(html).toContain(t(busy === 'sign-out' ? 'account.cancellingSignIn' : busy === 'email' ? 'account.hostedSignIn' : 'account.browserPending'));
      expect(html).toContain('account-cancel-sign-in');
      expect(html.includes('disabled=""')).toBe(busy === 'sign-out');
    });
  }

  it('restores the provider marks when sign-in fails', () => {
    const html = renderToStaticMarkup(<GettingStarted error="failed" onSignIn={noop} onCancel={noop} />);
    expect(html).toContain('account-continue-google');
    expect(html).toContain('data-testid="account-mark"');
    expect(html).toContain('role="alert"');
  });

  it('names the method the person pressed, and predicts the browser may ask again (ONL-2948)', () => {
    for (const [method, sentence] of [['google', 'Couldn’t sign in with Google. Try again.'], ['github', 'Couldn’t sign in with GitHub. Try again.'], ['email', 'Couldn’t sign in with email. Try again.']] as const) {
      const html = renderToStaticMarkup(<GettingStarted error="invalid_grant" errorMethod={method} onSignIn={noop} onCancel={noop} />);
      expect(html).toContain('role="alert"');
      expect(html).toContain(sentence);
    }
    // A refusal WorkOS reported a cause for keeps that cause, even when the method is known.
    for (const code of ['team_only', 'mfa_enrollment', 'mfa_challenge', 'mfa_verification', 'organization_selection_required', 'sso_required', 'denied', 'access_denied', 'last_admin', 'busy', 'not_configured', 'superseded'] as const) {
      const html = renderToStaticMarkup(<GettingStarted error={code} errorMethod="github" onSignIn={noop} onCancel={noop} />);
      expect(html).toContain(accountErrorText(code));
      expect(html).not.toContain(t('account.signInGithubFailed'));
    }
    // `failed` is what the hook's catch branch settles with; a known method still names it.
    expect(renderToStaticMarkup(<GettingStarted error="failed" errorMethod="google" onSignIn={noop} onCancel={noop} />)).toContain(t('account.signInGoogleFailed'));
    // Sign-out, deletion, and the account menu's plain "Sign in to Onlook" name no method.
    expect(renderToStaticMarkup(<GettingStarted error="failed" onSignIn={noop} onCancel={noop} />)).toContain(t('account.actionFailed'));
    const waiting = renderToStaticMarkup(<GettingStarted busy="github" onSignIn={noop} onCancel={noop} />);
    expect(waiting).toContain('Your browser may ask how you want to sign in.');
  });

  it('explains the known team gate without assigning that reason to every browser denial', () => {
    const html = renderToStaticMarkup(<GettingStarted error="team_only" onSignIn={noop} onCancel={noop} />);
    expect(html).toContain('role="alert"');
    expect(html).toContain(t('account.signInDenied'));
    expect(html).toContain('Sign-in is currently limited to the Onlook team.');
    expect(html).not.toContain(t('account.actionDenied'));
    const denied = accountAccessGallery().categories.flatMap((category) => category.stories)
      .find((story) => story.id === 'account-access-start-team-only')!;
    expect(denied.title).toBe(t('account.signInDenied'));
    expect(renderToStaticMarkup(denied.render())).toContain('Sign-in is currently limited to the Onlook team.');
    const cancelled = renderToStaticMarkup(<GettingStarted error="denied" onSignIn={noop} onCancel={noop} />);
    expect(cancelled).toContain(t('account.actionDenied'));
    expect(cancelled).not.toContain(t('account.signInDenied'));
  });

  for (const error of ['denied', 'last_admin', 'failed', 'busy', 'not_configured', 'superseded'] as const) {
    it(`renders the bounded ${error} result as a catalogued accessible error`, () => {
      const html = renderToStaticMarkup(<AccountSettings {...settings} confirming error={error} />);
      expect(html).toContain('role="alert"');
      expect(html).toContain(accountErrorText(error));
      expect(html).toContain(STATE.profile!.email!);
    });
  }

  it('shows who is signed in while offline and keeps destructive action behind a second step', () => {
    const html = renderToStaticMarkup(<AccountSettings {...settings} />);
    expect(html).toContain(STATE.profile!.email!);
    expect(html).toContain('overflow-wrap:anywhere');
    expect(html).toContain('account-delete-request');
    expect(html).not.toContain('account-delete-confirm');
    const confirmed = renderToStaticMarkup(<AccountSettings {...settings} confirming busy="delete" />);
    expect(confirmed).toContain('account-delete-confirm');
    expect(confirmed).toContain('account-delete-cancel');
    expect(confirmed).toContain('aria-busy="true"');
    expect(confirmed).toContain(t('account.deleting'));
  });

  it('exposes every account screen and interaction state in the showroom', () => {
    const gallery = accountAccessGallery();
    const stories = gallery.categories.flatMap((category) => category.stories);
    expect(gallery.id).toBe('account-access');
    for (const state of ['default', 'hover', 'focus', 'google', 'github', 'email', 'google_failed', 'github_failed', 'email_failed', 'mfa_enrollment', 'mfa_challenge', 'mfa_verification', 'organization_selection_required', 'sso_required', 'cancelling', 'failed', 'denied', 'busy', 'not_configured', 'superseded']) {
      expect(stories.some((story) => story.id === `account-access-start-${state.replaceAll('_', '-')}`)).toBe(true);
    }
    for (const state of ['default', 'hover', 'focus', 'long', 'signout', 'failed', 'confirmation', 'deleting', 'last_admin', 'denied', 'busy', 'superseded', 'not_configured']) {
      expect(stories.some((story) => story.id === `account-access-settings-${state.replaceAll('_', '-')}`)).toBe(true);
    }
    for (const story of stories) {
      const html = renderToStaticMarkup(story.render());
      expect(html).toContain(story.id.includes('-start-') ? 'getting-started' : story.id.includes('-settings-') ? 'account-settings' : 'account-pending');
    }
  });
});
