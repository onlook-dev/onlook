import { legacySubscriptions } from '@/schema/subscription/legacy';
import { db } from '@onlook/db/src/client';
import { createStripeClient } from '@onlook/stripe/src/client';
import { createCodeForCoupon, createLegacyCoupon } from '@onlook/stripe/src/scripts/production/coupon';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import path from 'path';

// Load .env file
config({ path: '../../.env' });

export const seedLegacySubscriptions = async () => {
    const stripe = createStripeClient();

    // Read all legacy subscriptions from csv file
    console.log('Getting legacy subscriptions emails...');
    const emails: string[] = readFileSync(path.join(__dirname, './subscriptions.csv'), 'utf8').split('\n');

    // Create a stripe coupon
    console.log('Create Coupon...');
    const { id: stripeCouponId, redeemBy } = await createLegacyCoupon(stripe);

    // Create a code for each email
    for (const email of emails) {
        if (!email) continue;
        const { id: stripePromotionCodeId, code: stripePromotionCode } = await createCodeForCoupon(stripe, stripeCouponId, email);
        await db.insert(legacySubscriptions).values({
            email,
            stripeCouponId,
            stripePromotionCodeId,
            stripePromotionCode,
            redeemBy
        });
        console.log(`Created legacy subscription for ${email}`);
    }
}

(async () => {
    try {
        if (!process.env.SUPABASE_DATABASE_URL || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            const missingVars: string[] = [];
            if (!process.env.SUPABASE_DATABASE_URL) missingVars.push('SUPABASE_DATABASE_URL');
            if (!process.env.SUPABASE_URL) missingVars.push('SUPABASE_URL');
            if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
            throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
        }

        console.log('Seeding stripe...');
        await seedLegacySubscriptions();
        console.log('Stripe seeded!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
})();