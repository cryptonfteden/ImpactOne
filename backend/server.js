const { PORT, AUTONOMOUS_ENGINE_ENABLED } = require("./config/env");
const app = require("./app");
const schedulerService = require("./services/schedulerService");

app.listen(PORT, () => {
  console.log(`ImpactOne backend running on port ${PORT}`);

  if (AUTONOMOUS_ENGINE_ENABLED) {
    schedulerService.start();
  }
});
