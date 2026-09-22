import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEFAULT_CATEGORIES: Array<{
  name: string;
  plaidPrimary: string | null;
  icon: string;
  excludeFromTotals?: boolean;
}> = [
  { name: "Income", plaidPrimary: "INCOME", icon: "banknote" },
  // NOT blanket-excluded: Plaid files both self-transfers (Chase <-> PNC) and
  // P2P payments to/from other people (Zelle, Venmo) under these same primaries,
  // and the latter is real income/spend. Self-transfers are instead detected
  // per-transaction by detectInternalTransfers() matching opposite entries
  // across the user's own accounts (see src/lib/transfer-matching.ts).
  { name: "Transfers In", plaidPrimary: "TRANSFER_IN", icon: "arrow-down-left" },
  { name: "Transfers Out", plaidPrimary: "TRANSFER_OUT", icon: "arrow-up-right" },
  // A credit card bill payment just settles debt for purchases already
  // counted as spend when they posted on the card — excluded to avoid
  // double-counting. Split out from "Loan Payments" via the detailed category.
  { name: "Credit Card Payments", plaidPrimary: null, icon: "credit-card", excludeFromTotals: true },
  { name: "Loan Payments", plaidPrimary: "LOAN_PAYMENTS", icon: "landmark" },
  { name: "Bank Fees", plaidPrimary: "BANK_FEES", icon: "receipt" },
  { name: "Entertainment", plaidPrimary: "ENTERTAINMENT", icon: "clapperboard" },
  { name: "Food & Drink", plaidPrimary: "FOOD_AND_DRINK", icon: "utensils" },
  { name: "General Merchandise", plaidPrimary: "GENERAL_MERCHANDISE", icon: "shopping-bag" },
  { name: "Home Improvement", plaidPrimary: "HOME_IMPROVEMENT", icon: "hammer" },
  { name: "Medical", plaidPrimary: "MEDICAL", icon: "stethoscope" },
  { name: "Personal Care", plaidPrimary: "PERSONAL_CARE", icon: "sparkles" },
  { name: "General Services", plaidPrimary: "GENERAL_SERVICES", icon: "wrench" },
  { name: "Government & Non-Profit", plaidPrimary: "GOVERNMENT_AND_NON_PROFIT", icon: "building-2" },
  { name: "Transportation", plaidPrimary: "TRANSPORTATION", icon: "car" },
  { name: "Travel", plaidPrimary: "TRAVEL", icon: "plane" },
  { name: "Rent & Utilities", plaidPrimary: "RENT_AND_UTILITIES", icon: "home" },
  { name: "Uncategorized", plaidPrimary: null, icon: "help-circle" },
];

async function main() {
  for (const category of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {
        plaidPrimary: category.plaidPrimary,
        icon: category.icon,
        excludeFromTotals: category.excludeFromTotals ?? false,
      },
      create: {
        name: category.name,
        plaidPrimary: category.plaidPrimary,
        icon: category.icon,
        isDefault: true,
        excludeFromTotals: category.excludeFromTotals ?? false,
      },
    });
  }
  console.log(`Seeded ${DEFAULT_CATEGORIES.length} default categories.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
