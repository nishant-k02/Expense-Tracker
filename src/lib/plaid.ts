import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

function getEnv(): keyof typeof PlaidEnvironments {
  const env = process.env.PLAID_ENV ?? "sandbox";
  if (env !== "sandbox" && env !== "development" && env !== "production") {
    throw new Error(`Invalid PLAID_ENV: ${env}`);
  }
  return env;
}

const configuration = new Configuration({
  basePath: PlaidEnvironments[getEnv()],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
      "PLAID-SECRET": process.env.PLAID_SECRET,
    },
  },
});

export const plaidClient = new PlaidApi(configuration);

// Single-user app: a fixed identifier is fine, Plaid just needs a stable client_user_id.
export const PLAID_CLIENT_USER_ID = "expense-tracker-owner";
