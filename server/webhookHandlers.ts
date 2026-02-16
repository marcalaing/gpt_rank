import { getUncachableStripeClient } from './stripeClient';
import { db } from './db';
import { organizations } from '@shared/schema';
import { eq } from 'drizzle-orm';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const stripe = getUncachableStripeClient();
    if (!stripe) {
      throw new Error('Stripe not configured');
    }
    
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.warn('STRIPE_WEBHOOK_SECRET not set - webhook signature verification disabled (INSECURE!)');
      // In production, you should fail here instead of processing unsigned webhooks
      return;
    }
    
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await WebhookHandlers.handleSubscriptionChange(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await WebhookHandlers.handleSubscriptionDeleted(event.data.object);
        break;
      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }
  }

  static async handleSubscriptionChange(subscription: any): Promise<void> {
    try {
      const customerId = subscription.customer;
      const subscriptionId = subscription.id;
      const status = subscription.status;
      
      const priceId = subscription.items?.data?.[0]?.price?.id;
      if (!priceId) {
        console.warn('No price ID found in subscription');
        return;
      }

      const stripe = getUncachableStripeClient();
      if (!stripe) {
        throw new Error('Stripe not configured');
      }

      const price = await stripe.prices.retrieve(priceId, { expand: ['product'] });
      const product = price.product as any;
      const tier = product?.metadata?.tier || 'free';

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
      } else {
        console.warn(`No organization found for Stripe customer: ${customerId}`);
      }
    } catch (error) {
      console.error('Error handling subscription change:', error);
      throw error; // Re-throw so Stripe knows the webhook failed
    }
  }

  static async handleSubscriptionDeleted(subscription: any): Promise<void> {
    try {
      const customerId = subscription.customer;

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
      } else {
        console.warn(`No organization found for Stripe customer: ${customerId}`);
      }
    } catch (error) {
      console.error('Error handling subscription deletion:', error);
      throw error; // Re-throw so Stripe knows the webhook failed
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
