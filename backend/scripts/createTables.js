const {
  CreateTableCommand,
  DescribeTableCommand,
  ResourceInUseException,
} = require("@aws-sdk/client-dynamodb");
const { nativeClient } = require("../src/lib/dynamoClient");
const env = require("../src/config/env");

async function waitForTable(tableName) {
  let ready = false;
  while (!ready) {
    const response = await nativeClient.send(
      new DescribeTableCommand({
        TableName: tableName,
      })
    );
    ready = response.Table?.TableStatus === "ACTIVE";
    if (!ready) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

async function createUsersTable() {
  try {
    await nativeClient.send(
      new CreateTableCommand({
        TableName: env.usersTable,
        BillingMode: "PAY_PER_REQUEST",
        AttributeDefinitions: [
          { AttributeName: "userId", AttributeType: "S" },
          { AttributeName: "email", AttributeType: "S" },
        ],
        KeySchema: [{ AttributeName: "userId", KeyType: "HASH" }],
        GlobalSecondaryIndexes: [
          {
            IndexName: "email-index",
            KeySchema: [{ AttributeName: "email", KeyType: "HASH" }],
            Projection: { ProjectionType: "ALL" },
          },
        ],
      })
    );
  } catch (error) {
    if (!(error instanceof ResourceInUseException)) {
      throw error;
    }
  }
  await waitForTable(env.usersTable);
}

async function createFavoritesTable() {
  try {
    await nativeClient.send(
      new CreateTableCommand({
        TableName: env.favoritesTable,
        BillingMode: "PAY_PER_REQUEST",
        AttributeDefinitions: [
          { AttributeName: "userId", AttributeType: "S" },
          { AttributeName: "ticker", AttributeType: "S" },
          { AttributeName: "industry", AttributeType: "S" },
        ],
        KeySchema: [
          { AttributeName: "userId", KeyType: "HASH" },
          { AttributeName: "ticker", KeyType: "RANGE" },
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: "industry-index",
            KeySchema: [
              { AttributeName: "userId", KeyType: "HASH" },
              { AttributeName: "industry", KeyType: "RANGE" },
            ],
            Projection: { ProjectionType: "ALL" },
          },
        ],
      })
    );
  } catch (error) {
    if (!(error instanceof ResourceInUseException)) {
      throw error;
    }
  }
  await waitForTable(env.favoritesTable);
}

async function createRevokedTokensTable() {
  try {
    await nativeClient.send(
      new CreateTableCommand({
        TableName: env.revokedTokensTable,
        BillingMode: "PAY_PER_REQUEST",
        AttributeDefinitions: [{ AttributeName: "jti", AttributeType: "S" }],
        KeySchema: [{ AttributeName: "jti", KeyType: "HASH" }],
      })
    );
  } catch (error) {
    if (!(error instanceof ResourceInUseException)) {
      throw error;
    }
  }
  await waitForTable(env.revokedTokensTable);
}

async function main() {
  await createUsersTable();
  await createFavoritesTable();
  await createRevokedTokensTable();
  // eslint-disable-next-line no-console
  console.log("DynamoDB tables are ready.");
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
