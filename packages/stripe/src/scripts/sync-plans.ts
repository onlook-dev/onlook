import { config } from 'dotenv';
import { subscriptionService } from '@onlook/db';
import { PlanType } from '@onlook/models';
import { createStripeClient } from '../client';
import { PLANS } from '../plans';

config({ path: '../.env' });

async function syncPlansWithStripe() {
    const stripe = createStripeClient();
    
    console.log('Syncing plans with Stripe...');
    
    for (const [planType, planConfig] of Object.entries(PLANS)) {
        try {
            // Create or get product
            const products = await stripe.products.list({
                limit: 100,
            });
            
            let product = products.data.find(p => p.name === planConfig.name);
            
            if (!product) {
                console.log(`Creating product: ${planConfig.name}`);
                product = await stripe.products.create({
                    name: planConfig.name,
                    metadata: {
                        planType,
                    },
                });
            }
            
            // Set usage limits based on plan type
            const usageLimits = planType === PlanType.FREE 
                ? { dailyMessages: 10, monthlyMessages: 100 }
                : { dailyMessages: 1000, monthlyMessages: 10000 };
            
            // Upsert plan in database
            await subscriptionService.upsertPlan({
                stripeProductId: product.id,
                name: planConfig.name,
                type: planType as 'free' | 'pro',
                ...usageLimits,
            });
            
            console.log(`Synced plan: ${planConfig.name} (${product.id})`);
            
            // Create prices for the plan
            if (planConfig.tiers) {
                // Create tiered pricing
                const existingPrices = await stripe.prices.list({
                    product: product.id,
                    active: true,
                });
                
                if (existingPrices.data.length === 0) {
                    console.log(`Creating tiered price for ${planConfig.name}`);
                    const price = await stripe.prices.create({
                        product: product.id,
                        currency: 'usd',
                        recurring: {
                            interval: 'month',
                            usage_type: 'licensed',
                        },
                        billing_scheme: 'tiered',
                        tiers_mode: 'graduated',
                        tiers: planConfig.tiers,
                        metadata: {
                            planType,
                        },
                    });
                    
                    // Get plan from database
                    const dbPlan = await subscriptionService.getPlanByStripeProductId(product.id);
                    if (dbPlan) {
                        // Calculate price per month (use the first tier as base price)
                        const pricePerMonth = planConfig.tiers[0].unit_amount || 0;
                        
                        await subscriptionService.upsertPrice({
                            stripePriceId: price.id,
                            planId: dbPlan.id,
                            pricePerMonth: pricePerMonth / 100, // Convert from cents
                        });
                        
                        console.log(`Created price: ${price.id}`);
                    }
                }
            } else {
                // Create simple pricing (for free plan)
                const existingPrices = await stripe.prices.list({
                    product: product.id,
                    active: true,
                });
                
                if (existingPrices.data.length === 0) {
                    console.log(`Creating simple price for ${planConfig.name}`);
                    const price = await stripe.prices.create({
                        product: product.id,
                        currency: 'usd',
                        unit_amount: 0,
                        recurring: {
                            interval: 'month',
                        },
                        metadata: {
                            planType,
                        },
                    });
                    
                    // Get plan from database
                    const dbPlan = await subscriptionService.getPlanByStripeProductId(product.id);
                    if (dbPlan) {
                        await subscriptionService.upsertPrice({
                            stripePriceId: price.id,
                            planId: dbPlan.id,
                            pricePerMonth: 0,
                        });
                        
                        console.log(`Created price: ${price.id}`);
                    }
                }
            }
            
        } catch (error) {
            console.error(`Error syncing plan ${planType}:`, error);
        }
    }
    
    console.log('Plan sync complete!');
}

// Run the sync
if (require.main === module) {
    syncPlansWithStripe()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('Sync failed:', error);
            process.exit(1);
        });
}

export { syncPlansWithStripe };