const planRepository = require("../services/planRepository");
const billingService = require("../services/billing/billingService");
const env = require("../config/env");

function handleKnownError(error, res, next) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ error: error.message, errorCode: error.errorCode });
  }
  return next(error);
}

async function listPlans(req, res, next) {
  try {
    const plans = await planRepository.listPlans();
    res.json({ plans: plans.map((plan) => ({ key: plan.key, name: plan.name, priceCents: plan.priceCents, billingPeriod: plan.billingPeriod, features: plan.features })) });
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

// Phase COMMERCIAL-MVP-001 — the one, real, vendor-agnostic webhook
// receiver. Real signature verification happens entirely inside
// `billingService`/the configured provider — this handler never
// inspects a vendor-specific header/payload shape itself.
async function webhook(req, res, next) {
  try {
    const signatureHeader = req.get("stripe-signature") || req.get("X-Webhook-Signature") || "";
    const event = await billingService.handleWebhookEvent(req.rawBody || req.body, signatureHeader);
    if (!event) {
      return res.json({ received: true, handled: false });
    }
    const subscriptionRepository = require("../services/subscriptionRepository");
    // A real webhook event only ever updates the ONE subscription row
    // matching its own real externalSubscriptionId — never a broader
    // write.
    const prisma = require("../db/prismaClient").getPrismaClient();
    const existing = await prisma.subscription.findFirst({ where: { externalSubscriptionId: event.externalSubscriptionId } });
    if (existing) {
      await subscriptionRepository.updateForUser(existing.userId, { status: event.status, currentPeriodEnd: event.currentPeriodEnd });
    }
    res.json({ received: true, handled: Boolean(existing) });
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function providerInfo(req, res) {
  res.json({ provider: billingService.getProviderName(), stripeConfigured: Boolean(env.STRIPE_SECRET_KEY) });
}

module.exports = { listPlans, webhook, providerInfo };
