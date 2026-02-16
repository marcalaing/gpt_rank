import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

/**
 * Initialize Stripe client with standard SDK.
 * Uses STRIPE_SECRET_KEY environment variable.
 * If not set, logs a warning and returns null (payments disabled).
 */
function initializeStripe(): Stripe | null {
  if (stripeClient) {
    return stripeClient;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!secretKey) {
    console.warn('STRIPE_SECRET_KEY not set - Stripe features will be disabled');
    return null;
  }

  try {
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2024-12-18.acacia',
    });
    console.log('Stripe client initialized successfully');
    return stripeClient;
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
    return null;
  }
}

/**
 * Get the Stripe client instance.
 * Returns null if Stripe is not configured.
 */
export function getStripeClient(): Stripe | null {
  return initializeStripe();
}

/**
 * Get an uncachable Stripe client (same as cached for standard SDK).
 */
export function getUncachableStripeClient(): Stripe | null {
  return getStripeClient();
}

/**
 * Get Stripe publishable key from environment.
 * Returns null if not configured.
 */
export function getStripePublishableKey(): string | null {
  const key = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    console.warn('STRIPE_PUBLISHABLE_KEY not set');
  }
  return key || null;
}

/**
 * Get Stripe secret key from environment.
 * Returns null if not configured.
 */
export function getStripeSecretKey(): string | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.warn('STRIPE_SECRET_KEY not set');
  }
  return key || null;
}

/**
 * Legacy compatibility: returns null (StripeSync no longer used).
 * Kept for backward compatibility with existing code.
 */
export async function getStripeSync(): Promise<null> {
  console.warn('getStripeSync() called but StripeSync is no longer available (Replit-specific)');
  return null;
}
