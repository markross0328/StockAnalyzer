const { PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../lib/dynamoClient");
const env = require("../config/env");

async function revokeToken({ jti, expiresAtUnix }) {
  await docClient.send(
    new PutCommand({
      TableName: env.revokedTokensTable,
      Item: {
        jti,
        expiresAtUnix,
      },
    })
  );
}

async function isTokenRevoked(jti) {
  const response = await docClient.send(
    new GetCommand({
      TableName: env.revokedTokensTable,
      Key: { jti },
    })
  );

  return Boolean(response.Item);
}

module.exports = {
  revokeToken,
  isTokenRevoked,
};
