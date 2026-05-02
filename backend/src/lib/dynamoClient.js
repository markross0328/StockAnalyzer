const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
const env = require("../config/env");

const clientConfig = {
  region: env.awsRegion,
};

if (env.dynamodbEndpoint) {
  clientConfig.endpoint = env.dynamodbEndpoint;
  clientConfig.credentials = {
    accessKeyId: "local",
    secretAccessKey: "local",
  };
}

const nativeClient = new DynamoDBClient(clientConfig);
const docClient = DynamoDBDocumentClient.from(nativeClient, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

module.exports = {
  nativeClient,
  docClient,
};
