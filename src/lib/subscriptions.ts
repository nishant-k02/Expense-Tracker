import { prisma } from "@/lib/prisma";

export type SubscriptionFrequency = "weekly" | "biweekly" | "monthly" | "quarterly" | "annually" | "unknown";

const DAY_MS = 24 * 60 * 60 * 1000;

const FREQUENCY_RANGES: { frequency: SubscriptionFrequency; min: number; max: number; intervalDays: number }[] = [
  { frequency: "weekly", min: 6, max: 8, intervalDays: 7 },
  { frequency: "biweekly", min: 12, max: 16, intervalDays: 14 },
  { frequency: "monthly", min: 26, max: 35, intervalDays: 30 },
  { frequency: "quarterly", min: 85, max: 97, intervalDays: 91 },
  { frequency: "annually", min: 350, max: 380, intervalDays: 365 },
];

// Matched against Plaid's cleaned `merchantName` field only — never the raw
// bank descriptor, which often contains noise like "APPLE PAY ENDING IN
// 5224" on completely unrelated purchases (see Divvy/Ventra/Temu/PayRange in
// this app's own transaction data) that would otherwise false-positive on a
// naive "apple" substring match.
const KNOWN_SUBSCRIPTION_MERCHANTS = [
  "apple",
  "icloud",
  "google",
  "resum", // bank descriptors sometimes garble "ResumeWorded" to e.g. "Resumewrde"
  "anthropic",
  "openai",
  "chatgpt",
  "netflix",
  "spotify",
  "hulu",
  "disney",
  "hbo",
  "max",
  "amazon web services",
  "amazon prime",
  "microsoft",
  "adobe",
  "dropbox",
  "github",
  "notion",
  "slack",
  "zoom",
  "rocketride",
  "youtube",
  "playstation",
  "xbox",
  "linkedin",
  "canva",
  "grammarly",
];

function isKnownSubscriptionMerchant(merchantName: string): boolean {
  const lower = merchantName.toLowerCase();
  return KNOWN_SUBSCRIPTION_MERCHANTS.some((keyword) => lower.includes(keyword));
}

function classifyFrequency(avgGapDays: number) {
  return FREQUENCY_RANGES.find((r) => avgGapDays >= r.min && avgGapDays <= r.max) ?? null;
}

type Entry = { date: Date; amount: number };

/** Greedily splits entries into amount-consistent clusters (e.g. one merchant
 * billing two different subscriptions at two different price points, like
 * Apple Music vs. iCloud both showing up as merchantName "Apple"). */
function clusterByAmount(entries: Entry[]): Entry[][] {
  const sorted = [...entries].sort((a, b) => a.amount - b.amount);
  const clusters: Entry[][] = [];
  for (const entry of sorted) {
    const cluster = clusters.find((c) => {
      const avg = c.reduce((s, e) => s + e.amount, 0) / c.length;
      return Math.abs(entry.amount - avg) <= Math.max(2, avg * 0.15);
    });
    if (cluster) cluster.push(entry);
    else clusters.push([entry]);
  }
  return clusters;
}

export type SubscriptionCandidate = {
  name: string;
  // Stable identity (merchant+amount, independent of `name`) used to find an
  // existing row on re-sync even after the user has renamed it.
  detectionKey: string;
  accountId: string;
  amount: number;
  currency: string;
  frequency: SubscriptionFrequency;
  lastChargedDate: Date;
  nextDueDate: Date | null;
  occurrences: number;
  categoryName: string;
};

/**
 * Detects recurring/subscription-like charges directly from already-synced
 * transaction history — no separate Plaid product or external email access
 * needed. Two detection paths:
 *  1. Pattern-based: >=2 charges from the same account+merchant, clustered by
 *     amount, with a regular date cadence -> frequency + predicted next date.
 *  2. Keyword-based: a single charge from a well-known subscription service
 *     (Google Cloud, ResumeWorded, etc.) that hasn't recurred yet in the
 *     synced window -> surfaced with frequency "unknown", no predicted date.
 */
export async function detectSubscriptionCandidates(): Promise<SubscriptionCandidate[]> {
  const transactions = await prisma.transaction.findMany({
    where: { pending: false, amount: { gt: 0 }, merchantName: { not: null } },
    select: {
      accountId: true,
      date: true,
      amount: true,
      isoCurrencyCode: true,
      merchantName: true,
      isInternalTransfer: true,
      plaidCategoryPrimary: true,
      category: { select: { name: true, excludeFromTotals: true } },
    },
    orderBy: { date: "asc" },
  });

  type Group = { accountId: string; name: string; currency: string; categoryName: string; entries: Entry[] };
  const groups = new Map<string, Group>();

  for (const tx of transactions) {
    // Exclude internal transfers, credit card payments, and ALL transfers
    // (even to accounts we don't track, like Robinhood) — moving money to
    // savings/investments/other people isn't a service "subscription".
    if (
      tx.isInternalTransfer ||
      tx.category?.excludeFromTotals ||
      tx.plaidCategoryPrimary === "TRANSFER_IN" ||
      tx.plaidCategoryPrimary === "TRANSFER_OUT"
    ) {
      continue;
    }
    const merchantName = tx.merchantName!.trim();
    if (!merchantName) continue;

    const key = `${tx.accountId}::${merchantName.toLowerCase()}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        accountId: tx.accountId,
        name: merchantName,
        currency: tx.isoCurrencyCode ?? "USD",
        categoryName: tx.category?.name ?? "Uncategorized",
        entries: [],
      };
      groups.set(key, group);
    }
    group.entries.push({ date: tx.date, amount: Number(tx.amount) });
  }

  const candidates: SubscriptionCandidate[] = [];

  for (const group of groups.values()) {
    const clusters = clusterByAmount(group.entries);
    // Same merchant name but multiple distinct price points (e.g. "Apple"
    // billing both Apple Music at $9.99 and iCloud+ at ~$7) — disambiguate
    // so both survive as separate, individually renameable subscriptions
    // instead of colliding on the same name+account key.
    const needsDisambiguation = clusters.length > 1;

    for (const cluster of clusters) {
      const avgAmount = cluster.reduce((s, e) => s + e.amount, 0) / cluster.length;
      const name = needsDisambiguation ? `${group.name} ($${avgAmount.toFixed(2)})` : group.name;
      // Always keyed on merchant+amount (not the possibly-disambiguated display
      // name), so renaming this row later never breaks re-sync matching.
      const detectionKey = `${group.name.toLowerCase()}::${avgAmount.toFixed(2)}`;
      const dates = cluster.map((e) => e.date.getTime()).sort((a, b) => a - b);
      const lastChargedDate = new Date(dates[dates.length - 1]);

      if (cluster.length >= 2) {
        const gaps: number[] = [];
        for (let i = 1; i < dates.length; i++) gaps.push((dates[i] - dates[i - 1]) / DAY_MS);
        const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
        const classification = classifyFrequency(avgGap);
        if (classification) {
          let nextDueDate = new Date(lastChargedDate.getTime() + classification.intervalDays * DAY_MS);
          const now = Date.now();
          while (nextDueDate.getTime() < now) {
            nextDueDate = new Date(nextDueDate.getTime() + classification.intervalDays * DAY_MS);
          }
          candidates.push({
            name,
            detectionKey,
            accountId: group.accountId,
            amount: avgAmount,
            currency: group.currency,
            frequency: classification.frequency,
            lastChargedDate,
            nextDueDate,
            occurrences: cluster.length,
            categoryName: group.categoryName,
          });
          continue;
        }
      }

      // Fewer than 2 occurrences, or no regular cadence yet — only surface
      // if it's a recognizable subscription service, since we can't infer
      // "recurring" from a single generic charge otherwise.
      if (isKnownSubscriptionMerchant(group.name)) {
        candidates.push({
          name,
          detectionKey,
          accountId: group.accountId,
          amount: avgAmount,
          currency: group.currency,
          frequency: "unknown",
          lastChargedDate,
          nextDueDate: null,
          occurrences: cluster.length,
          categoryName: group.categoryName,
        });
      }
    }
  }

  return candidates;
}

/**
 * Upserts detected candidates into the persisted Subscription table so they
 * become editable (billing email, next due date, active/inactive, etc.).
 * Rows the user has already edited (overridden=true) or added manually are
 * left untouched — detection only fills in gaps, never overwrites a
 * correction.
 */
export async function syncDetectedSubscriptions(): Promise<void> {
  const candidates = await detectSubscriptionCandidates();

  for (const candidate of candidates) {
    // Atomic create-if-missing against the (accountId, detectionKey) unique
    // constraint — avoids the race where two concurrent syncs (e.g. two page
    // loads) both see "no existing row" and insert a duplicate. Keyed on
    // detectionKey (merchant+amount) rather than the display `name`, so
    // renaming a row (e.g. "Apple ($6.97)" -> "Apple Music") doesn't cause
    // the next sync to recreate it under its original detected name.
    await prisma.subscription.upsert({
      where: { accountId_detectionKey: { accountId: candidate.accountId, detectionKey: candidate.detectionKey } },
      create: {
        name: candidate.name,
        detectionKey: candidate.detectionKey,
        amount: candidate.amount,
        currency: candidate.currency,
        frequency: candidate.frequency,
        nextDueDate: candidate.nextDueDate,
        lastChargedDate: candidate.lastChargedDate,
        accountId: candidate.accountId,
        categoryName: candidate.categoryName,
        source: "detected",
      },
      update: {},
    });

    // Refresh latest amount/frequency/dates, but only for rows the user
    // hasn't edited — detection fills gaps, never overwrites a correction.
    await prisma.subscription.updateMany({
      where: {
        accountId: candidate.accountId,
        detectionKey: candidate.detectionKey,
        source: "detected",
        overridden: false,
      },
      data: {
        amount: candidate.amount,
        frequency: candidate.frequency,
        nextDueDate: candidate.nextDueDate,
        lastChargedDate: candidate.lastChargedDate,
      },
    });
  }
}

export function isDueSoon(nextDueDate: Date | null, days = 7): boolean {
  if (!nextDueDate) return false;
  return (nextDueDate.getTime() - Date.now()) / DAY_MS <= days;
}
