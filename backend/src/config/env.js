const dotenv = require("dotenv");

dotenv.config({ quiet: true });

const requiredEnvVars = [
  "JWT_SECRET",
  "DYNAMODB_TABLE_USERS",
  "DYNAMODB_TABLE_FAVORITES",
  "DYNAMODB_TABLE_REVOKED_TOKENS",
];

function validateEnv() {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

module.exports = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  awsRegion: process.env.AWS_REGION || "us-east-1",
  dynamodbEndpoint: process.env.DYNAMODB_ENDPOINT || undefined,
  usersTable: process.env.DYNAMODB_TABLE_USERS || "stock-analyzer-users",
  favoritesTable: process.env.DYNAMODB_TABLE_FAVORITES || "stock-analyzer-favorites",
  revokedTokensTable: process.env.DYNAMODB_TABLE_REVOKED_TOKENS || "stock-analyzer-revoked-tokens",
  alphaVantageApiKey: process.env.ALPHAVANTAGE_API_KEY || "",
  stockCacheTtlMs: Number(process.env.STOCK_CACHE_TTL_MS || 300000),
  validateEnv,
};
