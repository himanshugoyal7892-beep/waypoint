/**
 * Idempotent seed: one demo user, one project, one DRAFT tour with five steps.
 *
 * To see the seeded project in your dashboard, set SEED_CLERK_USER_ID to your own Clerk user
 * id (Clerk dashboard → Users, "user_…") before running `pnpm db:seed`.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const DEMO = {
  publicKey: "pk_demoShop0000000000000000",
  tourId: "seed_tour_find_product",
  origins: ["http://localhost:5173"],
} as const;

const STEPS = [
  {
    pageUrl: "/",
    cssSelector: '[data-tour-id="search-input"]',
    title: "Search the catalogue",
    description: "Type a product name here to filter the catalogue instantly.",
    placement: "BOTTOM",
  },
  {
    pageUrl: "/",
    cssSelector: '[data-tour-id="product-card-aurora-headphones"]',
    title: "Pick a product",
    description: "Each card shows the price and rating. Open one to see the details.",
    placement: "RIGHT",
  },
  {
    pageUrl: "/products/aurora-headphones",
    cssSelector: '[data-tour-id="add-to-cart"]',
    title: "Add it to your cart",
    description: "Choose a quantity and add the product to your cart.",
    placement: "LEFT",
  },
  {
    pageUrl: "/products/aurora-headphones",
    cssSelector: '[data-tour-id="cart-icon"]',
    title: "Your cart",
    description: "The badge shows how many items are waiting in your cart.",
    placement: "BOTTOM",
  },
  {
    pageUrl: "/cart",
    cssSelector: '[data-tour-id="checkout-button"]',
    title: "Check out",
    description: "Review your items, then continue to checkout when you're ready.",
    placement: "TOP",
  },
] as const;

async function main() {
  const clerkUserId = process.env.SEED_CLERK_USER_ID || "user_seed_demo";
  const email = process.env.SEED_USER_EMAIL || "demo@example.com";

  const user = await prisma.user.upsert({
    where: { clerkUserId },
    update: {},
    create: { clerkUserId, email, name: "Demo Admin" },
  });

  const project = await prisma.project.upsert({
    where: { publicKey: DEMO.publicKey },
    update: { createdById: user.id, allowedOrigins: [...DEMO.origins] },
    create: {
      name: "Demo Shop",
      domain: "localhost:5173",
      allowedOrigins: [...DEMO.origins],
      publicKey: DEMO.publicKey,
      createdById: user.id,
    },
  });

  await prisma.$transaction(async (tx) => {
    await tx.tour.upsert({
      where: { id: DEMO.tourId },
      update: { projectId: project.id },
      create: {
        id: DEMO.tourId,
        projectId: project.id,
        name: "Find a Product and Add It to Cart",
        description: "Walks a new shopper from search to checkout.",
        status: "DRAFT",
        startUrl: "/",
        triggerType: "AUTO",
      },
    });
    await tx.tourStep.deleteMany({ where: { tourId: DEMO.tourId } });
    await tx.tourStep.createMany({
      data: STEPS.map((s, i) => ({ ...s, tourId: DEMO.tourId, stepOrder: i + 1 })),
    });
  });

  console.log(
    `Seeded user ${clerkUserId}, project "${project.name}" (${project.publicKey}) and a ${STEPS.length}-step draft tour.`,
  );
}

main()
  .catch((err) => {
    console.error("Seed failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
