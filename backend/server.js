const { PORT } = require("./config/env");
const app = require("./app");

app.listen(PORT, () => {
  console.log(`ImpactOne backend running on port ${PORT}`);
});
