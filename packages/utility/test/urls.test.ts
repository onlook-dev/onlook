import { describe, it, expect } from 'bun:test';
import { inferPageFromUrl } from '../src/urls';

describe('inferPageFromUrl', () => {
    describe('Root path handling', () => {
        it('should return Home for root path', () => {
            expect(inferPageFromUrl('https://example.com/')).toEqual({
                name: 'Home',
                path: '/',
            });
        });

        it('should return Home for URL without trailing slash', () => {
            expect(inferPageFromUrl('https://example.com')).toEqual({
                name: 'Home',
                path: '/',
            });
        });

        it('should return Home for localhost root', () => {
            expect(inferPageFromUrl('http://localhost:3000/')).toEqual({
                name: 'Home',
                path: '/',
            });
        });
    });

    describe('Single path segment', () => {
        it('should extract page name from single segment', () => {
            expect(inferPageFromUrl('https://example.com/about')).toEqual({
                name: 'about',
                path: '/about',
            });
        });

        it('should handle dashes in page names', () => {
            expect(inferPageFromUrl('https://example.com/contact-us')).toEqual({
                name: 'contact us',
                path: '/contact-us',
            });
        });

        it('should handle underscores in page names', () => {
            expect(inferPageFromUrl('https://example.com/user_profile')).toEqual({
                name: 'user profile',
                path: '/user_profile',
            });
        });

        it('should handle mixed dashes and underscores', () => {
            expect(inferPageFromUrl('https://example.com/user-profile_settings')).toEqual({
                name: 'user profile settings',
                path: '/user-profile_settings',
            });
        });

        it('should handle multiple consecutive dashes/underscores', () => {
            expect(inferPageFromUrl('https://example.com/test--page__name')).toEqual({
                name: 'test  page  name',
                path: '/test--page__name',
            });
        });
    });

    describe('Multiple path segments', () => {
        it('should return the last segment as page name', () => {
            expect(inferPageFromUrl('https://example.com/blog/post-title')).toEqual({
                name: 'post title',
                path: '/blog/post-title',
            });
        });

        it('should handle deep nested paths', () => {
            expect(inferPageFromUrl('https://example.com/admin/users/edit')).toEqual({
                name: 'edit',
                path: '/admin/users/edit',
            });
        });

        it('should handle paths with multiple levels and formatting', () => {
            expect(inferPageFromUrl('https://example.com/api/v1/user-settings')).toEqual({
                name: 'user settings',
                path: '/api/v1/user-settings',
            });
        });
    });

    describe('URLs with query parameters and fragments', () => {
        it('should ignore query parameters', () => {
            expect(inferPageFromUrl('https://example.com/search?q=test&page=1')).toEqual({
                name: 'search',
                path: '/search',
            });
        });

        it('should ignore URL fragments', () => {
            expect(inferPageFromUrl('https://example.com/docs#section-1')).toEqual({
                name: 'docs',
                path: '/docs',
            });
        });

        it('should handle both query parameters and fragments', () => {
            expect(inferPageFromUrl('https://example.com/products?category=tech#featured')).toEqual(
                {
                    name: 'products',
                    path: '/products',
                },
            );
        });

        it('should handle root path with query parameters', () => {
            expect(inferPageFromUrl('https://example.com/?welcome=true')).toEqual({
                name: 'Home',
                path: '/',
            });
        });
    });

    describe('Trailing slash handling', () => {
        it('should handle paths with trailing slashes', () => {
            expect(inferPageFromUrl('https://example.com/about/')).toEqual({
                name: 'about',
                path: '/about/',
            });
        });

        it('should handle nested paths with trailing slashes', () => {
            expect(inferPageFromUrl('https://example.com/blog/posts/')).toEqual({
                name: 'posts',
                path: '/blog/posts/',
            });
        });
    });

    describe('Special cases', () => {
        it('should handle numeric page names', () => {
            expect(inferPageFromUrl('https://example.com/page/123')).toEqual({
                name: '123',
                path: '/page/123',
            });
        });

        it('should handle single character segments', () => {
            expect(inferPageFromUrl('https://example.com/a')).toEqual({
                name: 'a',
                path: '/a',
            });
        });

        it('should handle empty segments (double slashes)', () => {
            expect(inferPageFromUrl('https://example.com/blog//post')).toEqual({
                name: 'post',
                path: '/blog//post',
            });
        });

        it('should handle different protocols', () => {
            expect(inferPageFromUrl('http://example.com/secure')).toEqual({
                name: 'secure',
                path: '/secure',
            });
        });

        it('should handle different ports', () => {
            expect(inferPageFromUrl('https://example.com:8080/api')).toEqual({
                name: 'api',
                path: '/api',
            });
        });
    });

    describe('Error handling', () => {
        it('should handle invalid URLs gracefully', () => {
            expect(inferPageFromUrl('not-a-valid-url')).toEqual({
                name: 'Unknown Page',
                path: '/',
            });
        });

        it('should handle empty string', () => {
            expect(inferPageFromUrl('')).toEqual({
                name: 'Unknown Page',
                path: '/',
            });
        });

        it('should handle malformed URLs', () => {
            expect(inferPageFromUrl('http://')).toEqual({
                name: 'Unknown Page',
                path: '/',
            });
        });

        it('should handle URLs with spaces (auto-encoded)', () => {
            expect(inferPageFromUrl('https://example.com/page with spaces')).toEqual({
                name: 'page%20with%20spaces',
                path: '/page%20with%20spaces',
            });
        });

        it('should handle truly malformed URLs', () => {
            expect(inferPageFromUrl('://invalid-url')).toEqual({
                name: 'Unknown Page',
                path: '/',
            });
        });
    });

    describe('Real-world examples', () => {
        it('should handle common website patterns', () => {
            const testCases = [
                {
                    url: 'https://mysite.com/pricing',
                    expected: { name: 'pricing', path: '/pricing' },
                },
                {
                    url: 'https://docs.example.com/getting-started',
                    expected: { name: 'getting started', path: '/getting-started' },
                },
                {
                    url: 'https://blog.example.com/2024/my-first-post',
                    expected: { name: 'my first post', path: '/2024/my-first-post' },
                },
                {
                    url: 'https://shop.example.com/products/t-shirt_blue',
                    expected: { name: 't shirt blue', path: '/products/t-shirt_blue' },
                },
            ];

            testCases.forEach(({ url, expected }) => {
                expect(inferPageFromUrl(url)).toEqual(expected);
            });
        });
    });
});
