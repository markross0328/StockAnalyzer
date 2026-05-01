const { PutCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../lib/dynamoClient");
const env = require("../config/env");

async function createUser({ userId, email, name, passwordHash }) {
  const now = new Date().toISOString();
  await docClient.send(
    new PutCommand({
      TableName: env.usersTable,
      Item: {
        userId,
        email: email.toLowerCase(),
        name,
        passwordHash,
        createdAt: now,
        updatedAt: now,
      },
      ConditionExpression: "attribute_not_exists(userId)",
    })
  );
}

async function getUserByEmail(email) {
  const response = await docClient.send(
    new QueryCommand({
      TableName: env.usersTable,
      IndexName: "email-index",
      KeyConditionExpression: "email = :email",
      ExpressionAttributeValues: {
        ":email": email.toLowerCase(),
      },
      Limit: 1,
    })
  );

  return response.Items?.[0] || null;
}

module.exports = {
  createUser,
  getUserByEmail,
};
