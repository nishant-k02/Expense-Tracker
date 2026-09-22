import type { AccountBase, RemovedTransaction, Transaction as PlaidTransaction } from "plaid";
import { plaidClient } from "@/lib/plaid";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { resolveCategoryId } from "@/lib/categories";
import { detectInternalTransfers } from "@/lib/transfer-matching";

async function upsertAccounts(itemId: string, accounts: AccountBase[]) {
  for (const account of accounts) {
    await prisma.account.upsert({
      where: { plaidAccountId: account.account_id },
      update: {
        name: account.name,
        officialName: account.official_name,
        mask: account.mask,
        type: account.type,
        subtype: account.subtype,
        currentBalance: account.balances.current,
        availableBalance: account.balances.available,
        isoCurrencyCode: account.balances.iso_currency_code ?? "USD",
      },
      create: {
        itemId,
        plaidAccountId: account.account_id,
        name: account.name,
        officialName: account.official_name,
        mask: account.mask,
        type: account.type,
        subtype: account.subtype,
        currentBalance: account.balances.current,
        availableBalance: account.balances.available,
        isoCurrencyCode: account.balances.iso_currency_code ?? "USD",
      },
    });
  }
}

async function upsertTransaction(tx: PlaidTransaction) {
  const account = await prisma.account.findUnique({ where: { plaidAccountId: tx.account_id } });
  if (!account) return; // account not yet synced; will resolve on a later sync pass

  const existing = await prisma.transaction.findUnique({ where: { plaidTransactionId: tx.transaction_id } });
  const categoryId = existing?.categoryOverridden
    ? existing.categoryId
    : await resolveCategoryId(tx.personal_finance_category?.primary ?? null, tx.personal_finance_category?.detailed ?? null);

  await prisma.transaction.upsert({
    where: { plaidTransactionId: tx.transaction_id },
    update: {
      accountId: account.id,
      amount: tx.amount,
      isoCurrencyCode: tx.iso_currency_code ?? "USD",
      date: new Date(tx.date),
      authorizedDate: tx.authorized_date ? new Date(tx.authorized_date) : null,
      merchantName: tx.merchant_name ?? null,
      name: tx.name,
      pending: tx.pending,
      plaidCategoryPrimary: tx.personal_finance_category?.primary ?? null,
      plaidCategoryDetailed: tx.personal_finance_category?.detailed ?? null,
      categoryId,
    },
    create: {
      accountId: account.id,
      plaidTransactionId: tx.transaction_id,
      amount: tx.amount,
      isoCurrencyCode: tx.iso_currency_code ?? "USD",
      date: new Date(tx.date),
      authorizedDate: tx.authorized_date ? new Date(tx.authorized_date) : null,
      merchantName: tx.merchant_name ?? null,
      name: tx.name,
      pending: tx.pending,
      plaidCategoryPrimary: tx.personal_finance_category?.primary ?? null,
      plaidCategoryDetailed: tx.personal_finance_category?.detailed ?? null,
      categoryId,
    },
  });
}

async function removeTransactions(removed: RemovedTransaction[]) {
  const ids = removed.map((r) => r.transaction_id).filter((id): id is string => !!id);
  if (ids.length === 0) return;
  await prisma.transaction.deleteMany({ where: { plaidTransactionId: { in: ids } } });
}

export async function syncTransactionsForItem(itemId: string): Promise<void> {
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) throw new Error(`Item ${itemId} not found`);

  const accessToken = decrypt(item.plaidAccessToken);
  let cursor = item.cursor ?? undefined;
  let hasMore = true;

  try {
    while (hasMore) {
      const response = await plaidClient.transactionsSync({
        access_token: accessToken,
        cursor,
        count: 500,
      });
      const data = response.data;

      await upsertAccounts(itemId, data.accounts);

      for (const tx of data.added) await upsertTransaction(tx);
      for (const tx of data.modified) await upsertTransaction(tx);
      await removeTransactions(data.removed);

      cursor = data.next_cursor;
      hasMore = data.has_more;

      await prisma.item.update({
        where: { id: itemId },
        data: { cursor, status: "active", error: null },
      });
    }

    await detectInternalTransfers();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    await prisma.item.update({
      where: { id: itemId },
      data: { status: "error", error: message },
    });
    throw error;
  }
}

export async function syncAllItems(): Promise<void> {
  const items = await prisma.item.findMany({ select: { id: true } });
  for (const item of items) {
    await syncTransactionsForItem(item.id);
  }
}
