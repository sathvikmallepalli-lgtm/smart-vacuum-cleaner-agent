// Reproduce the submitted experiment results without a browser.
const fs = require("node:fs");
const { makeRoom, Simulation } = require("../room.js");
const rows = [];
for (const preset of ["open", "obstacles", "corridor", "unreachable"]) {
  for (const mode of ["memory", "reflex"]) {
    const sim = new Simulation(makeRoom(preset), mode, 42, 500);
    while (!sim.finished) sim.step();
    const m = sim.metrics();
    rows.push({
      room: preset,
      strategy: mode,
      seed: 42,
      budget: 500,
      moves: m.moves,
      cleans: m.cleans,
      actions: m.actions,
      coverage: +m.coverage.toFixed(2),
      reachableDirtCleaned:
        m.cleaning === null ? "N/A" : +m.cleaning.toFixed(2),
      remaining: m.remaining,
      unreachable: m.unreachable,
      end: sim.endReason,
    });
  }
}
fs.mkdirSync("results", { recursive: true });
fs.writeFileSync(
  "results/preset-results.json",
  JSON.stringify(rows, null, 2) + "\n",
);
const columns = Object.keys(rows[0]);
fs.writeFileSync(
  "results/preset-results.csv",
  [
    columns.join(","),
    ...rows.map((row) => columns.map((c) => JSON.stringify(row[c])).join(",")),
  ].join("\n") + "\n",
);
console.table(rows);
