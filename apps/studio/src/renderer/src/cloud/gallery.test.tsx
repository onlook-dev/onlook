import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { accountGallery } from '../dev/showroom/account.js';

describe('account Showroom instruments', () => {
  it('exposes every connection, identity, menu and action state, in both placements', () => {
    const gallery = accountGallery();
    const stories = gallery.categories.flatMap((category) => category.stories);
    expect(gallery.id).toBe('account');
    for (const name of ['connected', 'connecting', 'offline', 'cold-offline', 'signed-out', 'loading', 'local', 'no-picture', 'no-name', 'no-role', 'long', 'menu-open', 'menu-open-offline', 'menu-open-no-name', 'menu-open-long', 'card-dismissed', 'rail-picture', 'rail-initials', 'rail-offline', 'rail-signed-out', 'rail-loading', 'rail-menu-open', 'busy', 'sign-in-busy', 'sign-in-error', 'sign-out-error', 'hover', 'focus']) {
      expect(stories.some((story) => story.id === `account-${name}`)).toBe(true);
    }
  });

  it('uses the real account surface, including no surface in local mode', () => {
    const stories = accountGallery().categories.flatMap((category) => category.stories);
    for (const story of stories) {
      const html = renderToStaticMarkup(story.render());
      if (story.id === 'account-local') expect(html).not.toContain('data-testid="onlook-account"');
      else expect(html).toContain('data-testid="onlook-account"');
    }
  });
});
