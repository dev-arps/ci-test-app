"use strict";

// Configuration for outbound payment notifications.
// NOTE: this file intentionally contains fake, randomly generated credentials.
// It exists to exercise the secret-scanning pipeline from a pull request.

module.exports = {
  // --- Should be flagged: high-entropy secrets assigned to sensitive names ---
  PAYMENT_API_KEY: "Zk8vQ2mXr9TpL4wNb7YcH1sJd5GfA3eU",
  WEBHOOK_CLIENT_SECRET: "r7VqXp2Lm9TzW4cH8nB5dK3fJy6QaE1s",
  notifierAuthToken: "9fT3kXq7LmP2vRz8WcN4hB6dJ1yA5sGe",

  // Database connection string with an embedded password.
  DATABASE_URL: "postgres://orders_svc:Xq7mR2vL9pTz4NcW@db.internal.acme-corp.io:5432/orders",

  // --- Should NOT be flagged: negative controls ---
  // Read from the environment, never committed.
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
  // Obvious placeholder.
  EXAMPLE_API_TOKEN: "changeme-example-token-value",
  // Explicitly allow-listed line.
  LEGACY_SIGNING_KEY: "Wq5Tn8Bz2Hk7Vd4Lc9Xr3Mp6Js1Fy0Ga", // agentic:allow-secret
};
