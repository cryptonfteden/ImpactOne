const { PORT, AUTONOMOUS_ENGINE_ENABLED } = require("./config/env");
const app = require("./app");
const schedulerService = require("./services/schedulerService");
const themeSnapshotScheduler = require("./services/themeSnapshotScheduler");
const providerScheduler = require("./services/providerScheduler");

app.listen(PORT, () => {
  console.log(`ImpactOne backend running on port ${PORT}`);

  if (AUTONOMOUS_ENGINE_ENABLED) {
    schedulerService.start();
  }

  themeSnapshotScheduler.start();
  providerScheduler.start();
});
