process.env.JWT_SECRET = "test-secret";
process.env.DYNAMODB_TABLE_USERS = "users-test";
process.env.DYNAMODB_TABLE_FAVORITES = "favorites-test";
process.env.DYNAMODB_TABLE_REVOKED_TOKENS = "revoked-test";

const mockSend = jest.fn();

jest.mock("../src/lib/dynamoClient", () => ({
  docClient: {
    send: mockSend,
  },
}));

const favoritesRepository = require("../src/repositories/favoritesRepository");

describe("favorites repository", () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  test("saveFavorite writes uppercase ticker and user key", async () => {
    mockSend.mockResolvedValueOnce({});

    await favoritesRepository.saveFavorite({
      userId: "user-1",
      ticker: "msft",
      industry: "Technology",
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const command = mockSend.mock.calls[0][0];
    expect(command.constructor.name).toBe("PutCommand");
    expect(command.input.TableName).toBe("favorites-test");
    expect(command.input.Item.userId).toBe("user-1");
    expect(command.input.Item.ticker).toBe("MSFT");
    expect(command.input.Item.industry).toBe("Technology");
  });

  test("listFavoritesByUser queries favorites by userId", async () => {
    mockSend.mockResolvedValueOnce({ Items: [{ userId: "user-1", ticker: "MSFT" }] });

    const results = await favoritesRepository.listFavoritesByUser("user-1");

    expect(mockSend).toHaveBeenCalledTimes(1);
    const command = mockSend.mock.calls[0][0];
    expect(command.constructor.name).toBe("QueryCommand");
    expect(command.input.KeyConditionExpression).toBe("userId = :userId");
    expect(command.input.ExpressionAttributeValues[":userId"]).toBe("user-1");
    expect(results).toHaveLength(1);
  });

  test("searchFavoritesByIndustry uses industry-index gsi", async () => {
    mockSend.mockResolvedValueOnce({ Items: [{ ticker: "UNH", industry: "Healthcare" }] });

    const results = await favoritesRepository.searchFavoritesByIndustry({
      userId: "user-1",
      industry: "Healthcare",
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const command = mockSend.mock.calls[0][0];
    expect(command.constructor.name).toBe("QueryCommand");
    expect(command.input.IndexName).toBe("industry-index");
    expect(command.input.KeyConditionExpression).toBe("userId = :userId AND industry = :industry");
    expect(command.input.ExpressionAttributeValues[":industry"]).toBe("Healthcare");
    expect(results).toHaveLength(1);
  });
});
