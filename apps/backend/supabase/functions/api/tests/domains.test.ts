import { HOSTING_DOMAIN } from '@onlook/models/constants/editor.ts';
import { CustomDomain } from "@onlook/models/hosting/index.ts";
import { assertEquals } from "jsr:@std/assert";
import { describe, it } from "jsr:@std/testing/bdd";
import { verifyDomain } from "../hosting.ts/index.ts";

describe('verifyDomain', () => {
    const customDomains: CustomDomain[] = [
        {
            id: '1',
            domain: 'example.com',
            subdomains: ['app', 'blog'],
            user_id: 'user1',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
        {
            id: '2',
            domain: 'another-domain.com',
            subdomains: ['test'],
            user_id: 'user1',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }
    ];

    it('should allow domains ending with HOSTING_DOMAIN', () => {
        const requestDomains = [`test.${HOSTING_DOMAIN}`];
        assertEquals(verifyDomain(requestDomains, []), true);
    });

    it('should allow verified custom domains', () => {
        const requestDomains = ['example.com'];
        assertEquals(verifyDomain(requestDomains, customDomains), true);
    });

    it('should allow verified subdomains', () => {
        const requestDomains = ['app.example.com', 'blog.example.com'];
        assertEquals(verifyDomain(requestDomains, customDomains), true);
    });

    it('should reject unverified domains', () => {
        const requestDomains = ['unverified.com'];
        assertEquals(verifyDomain(requestDomains, customDomains), false);
    });

    it('should reject unverified subdomains', () => {
        const requestDomains = ['invalid.example.com'];
        assertEquals(verifyDomain(requestDomains, customDomains), false);
    });

    it('should validate multiple domains correctly', () => {
        const requestDomains = [
            `test.${HOSTING_DOMAIN}`,
            'example.com',
            'app.example.com',
            'test.another-domain.com'
        ];
        assertEquals(verifyDomain(requestDomains, customDomains), true);
    });

    it('should reject if any domain in the list is invalid', () => {
        const requestDomains = [
            `test.${HOSTING_DOMAIN}`,
            'example.com',
            'invalid.com'  // This one is not verified
        ];
        assertEquals(verifyDomain(requestDomains, customDomains), false);
    });
});
