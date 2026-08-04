import { apiClient } from "./apiClient";

export const calibrationReportApi = {
  get() {
    return apiClient.get("/v2/calibration-reports");
  },
};
