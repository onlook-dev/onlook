import Stripe from "stripe";
import { v4 as uuidv4 } from 'uuid';

export const createCodeForCoupon = async (
    stripe: Stripe,
    stripeCouponId: string,
    email: string,
): Promise<{
    id: string;
    code: string;
}> => {
    const promotionCode = await stripe.promotionCodes.create({
        coupon: stripeCouponId,
        code: uuidv4(),
        max_redemptions: 1,
        metadata: {
            email,
        },
    });
    return {
        id: promotionCode.id,
        code: promotionCode.code,
    };
}

export const createLegacyCoupon = async (stripe: Stripe): Promise<{
    id: string;
    redeemBy: Date;
}> => {
    const redeemBy = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 90); // 90 days from now
    const coupon = await stripe.coupons.create({
        amount_off: 2500, // $25
        currency: 'usd',
        duration: 'once',
        max_redemptions: 1,
        name: 'Desktop Pro User',
        redeem_by: redeemBy,
        metadata: {
            type: 'legacy'
        },
    });
    return {
        id: coupon.id,
        redeemBy: new Date(redeemBy * 1000),
    }
}