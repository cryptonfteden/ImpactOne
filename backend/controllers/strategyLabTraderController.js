const service = require("../services/strategyLabTraderService");

async function status(req, res, next) { try { res.json(await service.getStatus()); } catch (error) { next(error); } }
async function run(req, res, next) { try { res.json(await service.executeCycle()); } catch (error) { next(error); } }
async function reset(req, res, next) { try { res.json(await service.resetExperiment({ preservePlans: Boolean(req.body?.preservePlans) })); } catch (error) { next(error); } }
async function weeklyReport(req, res, next) { try { res.json(await service.generateWeeklyReport()); } catch (error) { next(error); } }

module.exports = { status, run, reset, weeklyReport };
