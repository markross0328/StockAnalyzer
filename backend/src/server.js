const app = require("./app");
const env = require("./config/env");

env.validateEnv();

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend running on port ${env.port}`);
});
