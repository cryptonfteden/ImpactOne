// Phase H2 — one-off script to create BetaUser rows, per the approved F2
// design ("five rows created once, directly, before beta launch — not
// via a signup flow"). Run manually: node backend/scripts/seedBetaUsers.js
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const betaUserRepository = require("../services/betaUserRepository");

const USERS = [
  { label: "Beta User A", inviteCode: "BETA-A1" },
  { label: "Beta User B", inviteCode: "BETA-B2" },
];

(async () => {
  for (const user of USERS) {
    const existing = await betaUserRepository.findByInviteCode(user.inviteCode);
    if (existing) {
      console.log("already exists:", user.inviteCode, "->", existing.id);
      continue;
    }
    const created = await betaUserRepository.createBetaUser(user);
    console.log("created:", user.inviteCode, "->", created.id);
  }
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
