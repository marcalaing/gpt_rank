import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

/**
 * Get the Stripe secret key from environment
 * @throws Error if STRIPE_SECRET_KEY is not set
 */
export function getStripeSecretKey(): string {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is required');
  }
  return secretKey;
}

/**
 * Get the Stripe publishable key from environment
 * @throws Error if STRIPE_PUBLISHABLE_KEY is not set
 */
export function getStripePublishableKey(): string {
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    throw new Error('STRIPE_PUBLISHABLE_KEY environment variable is required');
  }
  return publishableKey;
}

/**
 * Get a singleton Stripe client instance
 * Uses standard Stripe SDK with direct API key
 */
export function getStripeClient(): Stripe {
  if (!stripeInstance) {
    const secretKey = getStripeSecretKey();
    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2025-11-17.clover',
      typescript: true,
    });
  }
  return stripeInstance;
}

/**
 * Get a new uncached Stripe client instance
 * Useful for cases where you need a fresh client
 */
export function getUncachableStripeClient(): Stripe {
  const secretKey = getStripeSecretKey();
  return new Stripe(secretKey, {
    apiVersion: '2025-11-17.clover',
    typescript: true,
  });
}

/**
 * Legacy compatibility - returns the singleton client
 * @deprecated Use getStripeClient() instead
 */
export async function getStripeSync(): Promise<Stripe> {
  return getStripeClient();
}
