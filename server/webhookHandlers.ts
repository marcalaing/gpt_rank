import { getStripeClient } from './stripeClient';
import { db } from './db';
import { organizations } from '@shared/schema';
import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';

export class WebhookHandlers {
  /**
   * Process a verified Stripe webhook event
   * @param event - Stripe event object (already verified)
   */
  static async processStripeEvent(event: Stripe.Event): Promise<void> {
    console.log(`Processing Stripe webhook: ${event.type}`);

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await WebhookHandlers.handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await WebhookHandlers.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }
  }

  static async handleSubscriptionChange(subscription: Stripe.Subscription): Promise<void> {
    try {
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
      const subscriptionId = subscription.id;
      const status = subscription.status;
      
      const priceId = subscription.items?.data?.[0]?.price?.id;
      if (!priceId) return;

      const stripe = getStripeClient();
      const price = await stripe.prices.retrieve(priceId, { expand: ['product'] });
      const product = price.product as Stripe.Product;
      const tier = (product?.metadata?.tier || 'free') as 'free' | 'starter' | 'pro' | 'enterprise';

      const [org] = await db.select().from(organizations).where(eq(organizations.stripeCustomerId, customerId));
      
      if (org) {
        await db.update(organizations)
          .set({
            stripeSubscriptionId: subscriptionId,
            subscriptionTier: tier,
            subscriptionStatus: status,
          })
          .where(eq(organizations.id, org.id));
        
        console.log(`Updated org ${org.id} to tier: ${tier}, status: ${status}`);
      }
    } catch (error) {
      console.error('Error handling subscription change:', error);
    }
  }

  static async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    try {
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

      const [org] = await db.select().from(organizations).where(eq(organizations.stripeCustomerId, customerId));
      
      if (org) {
        await db.update(organizations)
          .set({
            stripeSubscriptionId: null,
            subscriptionTier: 'free',
            subscriptionStatus: 'canceled',
          })
          .where(eq(organizations.id, org.id));
        
        console.log(`Subscription deleted for org ${org.id}, reverted to free tier`);
      }
    } catch (error) {
      console.error('Error handling subscription deletion:', error);
    }
  }
}

// Tier limits use legacy database keys for backwards compatibility
// Display names: Free → free, Pro ($29) → starter, Max ($79) → pro
export const TIER_LIMITS: Record<string, { projectLimit: number; promptsPerProject: number; runsPerMonth: number }> = {
  free: { projectLimit: 1, promptsPerProject: 5, runsPerMonth: 50 },
  starter: { projectLimit: 3, promptsPerProject: 20, runsPerMonth: 500 }, // Display: Pro ($29)
  pro: { projectLimit: 10, promptsPerProject: 100, runsPerMonth: 2500 }, // Display: Max ($79)
  // Legacy enterprise tier maps to max limits
  enterprise: { projectLimit: 10, promptsPerProject: 100, runsPerMonth: 2500 },
};

export function getTierLimits(tier: string) {
  return TIER_LIMITS[tier] || TIER_LIMITS.free;
}
