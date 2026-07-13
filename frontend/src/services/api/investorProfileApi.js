import { apiClient } from "./apiClient";

export const investorProfileApi = {
  get() {
    return apiClient.get("/v2/investor-profile");
  },
  create(profile) {
    return apiClient.post("/v2/investor-profile", profile);
  },
  update(profile) {
    return apiClient.patch("/v2/investor-profile", profile);
  },
  getInvestmentProfile() {
    return apiClient.get("/v2/investor-profile/investment-profile");
  },
};
