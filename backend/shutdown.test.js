const test = require("node:test");
const assert = require("node:assert/strict");
const { createShutdownHandler } = require("./shutdown");

function fakeServer() {
  return {
    closeCalled: false,
    close(cb) {
      this.closeCalled = true;
      cb();
    },
  };
}

function fakeScheduler() {
  return { stopped: false, stop() { this.stopped = true; } };
}

test("shutdown: stops every real scheduler, closes the server, and disconnects DB + Redis", async () => {
  const server = fakeServer();
  const schedulerA = fakeScheduler();
  const schedulerB = fakeScheduler();
  let dbDisconnected = false;
  let redisDisconnected = false;
  let exitCode = null;
  const logs = [];

  const shutdown = createShutdownHandler({
    server,
    schedulers: [schedulerA, schedulerB],
    disconnectDatabase: async () => { dbDisconnected = true; },
    disconnectRedis: async () => { redisDisconnected = true; },
    shutdownTimeoutMs: 5000,
    exit: (code) => { exitCode = code; },
    log: (msg) => logs.push(msg),
  });

  await shutdown("SIGTERM");

  assert.equal(schedulerA.stopped, true);
  assert.equal(schedulerB.stopped, true);
  assert.equal(server.closeCalled, true);
  assert.equal(dbDisconnected, true);
  assert.equal(redisDisconnected, true);
  assert.equal(exitCode, 0);
  assert.ok(logs.some((l) => l.includes("Received SIGTERM")));
  assert.ok(logs.some((l) => l.includes("Graceful shutdown complete")));
});

test("shutdown: a second real signal while already shutting down is a real no-op (never double-runs)", async () => {
  const server = fakeServer();
  let closeCallCount = 0;
  server.close = (cb) => { closeCallCount += 1; cb(); };

  const shutdown = createShutdownHandler({
    server,
    schedulers: [],
    disconnectDatabase: async () => {},
    disconnectRedis: async () => {},
    shutdownTimeoutMs: 5000,
    exit: () => {},
    log: () => {},
  });

  await Promise.all([shutdown("SIGTERM"), shutdown("SIGINT")]);
  assert.equal(closeCallCount, 1);
});

test("shutdown: a real database disconnect failure never blocks the rest of shutdown", async () => {
  const server = fakeServer();
  let redisDisconnected = false;
  let exitCode = null;

  const shutdown = createShutdownHandler({
    server,
    schedulers: [],
    disconnectDatabase: async () => { throw new Error("DB already gone"); },
    disconnectRedis: async () => { redisDisconnected = true; },
    shutdownTimeoutMs: 5000,
    exit: (code) => { exitCode = code; },
    log: () => {},
  });

  await shutdown("SIGTERM");
  assert.equal(redisDisconnected, true);
  assert.equal(exitCode, 0);
});

test("shutdown: exceeding the real shutdown timeout forces a real exit(1)", async () => {
  const server = { close: () => {} }; // never calls back — simulates a hung close
  let exitCode = null;
  let forcedTimeoutCallback = null;

  const shutdown = createShutdownHandler({
    server,
    schedulers: [],
    disconnectDatabase: async () => {},
    disconnectRedis: async () => {},
    shutdownTimeoutMs: 5000,
    exit: (code) => { exitCode = code; },
    log: () => {},
    setTimeoutFn: (cb) => { forcedTimeoutCallback = cb; return { unref: () => {} }; },
    clearTimeoutFn: () => {},
  });

  shutdown("SIGTERM");
  await Promise.resolve();
  assert.equal(typeof forcedTimeoutCallback, "function");
  forcedTimeoutCallback();
  assert.equal(exitCode, 1);
});
