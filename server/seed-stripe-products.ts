import { getUncachableStripeClient } from "./stripeClient";
import Stripe from "stripe";

interface PlanConfig {
  name: string;
  description: string;
  metadata: Stripe.MetadataParam;
  prices: Array<{ amount: number; interval: "month" | "year" }>;
}

const PLANS: PlanConfig[] = [
  {
    name: "Free",
    description: "Get started with basic AI visibility tracking",
    metadata: {
      order: "1",
      tier: "free",
      projectLimit: "1",
      promptsPerProject: "5",
      runsPerMonth: "50",
    },
    prices: [
      { amount: 0, interval: "month" },
    ],
  },
  {
    name: "Starter",
    description: "For small teams tracking brand visibility",
    metadata: {
      order: "2",
      tier: "starter",
      projectLimit: "3",
      promptsPerProject: "25",
      runsPerMonth: "500",
    },
    prices: [
      { amount: 2900, interval: "month" },
      { amount: 29000, interval: "year" },
    ],
  },
  {
    name: "Pro",
    description: "For growing teams with advanced analytics",
    metadata: {
      order: "3",
      tier: "pro",
      projectLimit: "10",
      promptsPerProject: "100",
      runsPerMonth: "2500",
      popular: "true",
    },
    prices: [
      { amount: 7900, interval: "month" },
      { amount: 79000, interval: "year" },
    ],
  },
  {
    name: "Enterprise",
    description: "Unlimited access with dedicated support",
    metadata: {
      order: "4",
      tier: "enterprise",
      projectLimit: "unlimited",
      promptsPerProject: "unlimited",
      runsPerMonth: "unlimited",
    },
    prices: [
      { amount: 29900, interval: "month" },
      { amount: 299000, interval: "year" },
    ],
  },
];

async function seedProducts() {
  const stripe = await getUncachableStripeClient();
  console.log("Seeding Stripe products...");

  for (const plan of PLANS) {
    const existing = await stripe.products.search({
      query: `name:'${plan.name}'`,
    });

    if (existing.data.length > 0) {
      console.log(`Product "${plan.name}" already exists, skipping...`);
      continue;
    }

    const product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
      metadata: plan.metadata,
    });
    console.log(`Created product: ${product.name} (${product.id})`);

    for (const priceConfig of plan.prices) {
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: priceConfig.amount,
        currency: "usd",
        recurring: priceConfig.amount > 0 ? { interval: priceConfig.interval } : undefined,
        metadata: {
          interval: priceConfig.interval,
        },
      });
      console.log(`  Created price: $${priceConfig.amount / 100}/${priceConfig.interval} (${price.id})`);
    }
  }

  console.log("Stripe products seeded successfully!");
}

seedProducts().catch(console.error);
