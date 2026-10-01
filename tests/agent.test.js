const assert = require("node:assert/strict");
const test = require("node:test");
const { Agent } = require("../agent.js");
const {
  makeRoom,
  Simulation,
  observe,
  evaluate,
  clone,
} = require("../room.js");
function finish(sim) {
  while (!sim.finished) sim.step();
  return sim;
}
for (const preset of ["open", "obstacles", "corridor", "unreachable"])
  test(`Memory agent completes ${preset} with full reachable cleaning`, () => {
    const sim = finish(new Simulation(makeRoom(preset), "memory", 42, 1000));
    assert.equal(sim.endReason, "Reachable room explored");
    assert.equal(sim.metrics().coverage, 100);
    assert.equal(sim.cleans, sim.evaluation.reachableDirt);
    assert.equal(sim.metrics().remaining, sim.evaluation.unreachableDirt);
  });
test("Cleans before moving and does not count cleaning as a move", () => {
  const room = makeRoom("open");
  room.cells[room.start.r][room.start.c] = "dirt";
  const sim = new Simulation(room);
  assert.equal(sim.step().type, "clean");
  assert.equal(sim.moves, 0);
  assert.equal(sim.cleans, 1);
  assert.deepEqual(sim.position, room.start);
});
test("Enclosed start cleans and stops; hidden dirt remains", () => {
  const room = makeRoom("open");
  room.cells = room.cells.map((row) => row.map(() => "wall"));
  room.start = { r: 3, c: 3 };
  room.cells[3][3] = "dirt";
  room.cells[0][0] = "dirt";
  const sim = finish(new Simulation(room));
  assert.equal(sim.cleans, 1);
  assert.equal(sim.metrics().remaining, 1);
  assert.equal(sim.metrics().coverage, 100);
});
test("BFS chooses a shortest known route through a detour", () => {
  const a = new Agent();
  a.map = new Map([
    ["0,0", "free"],
    ["0,1", "blocked"],
    ["1,0", "free"],
    ["1,1", "free"],
    ["1,2", "free"],
    ["0,2", "free"],
  ]);
  a.visited = new Set(["0,0", "1,0", "1,1", "1,2"]);
  const action = a.decide({
    position: { r: 0, c: 0 },
    dirty: false,
    neighbors: [
      { r: 1, c: 0, free: true },
      { r: 0, c: 1, free: false },
    ],
  });
  assert.deepEqual(a.route, ["1,0", "1,1", "1,2", "0,2"]);
  assert.equal(action.r, 1);
  assert.equal(action.c, 0);
});
test("Observations and agent decisions do not reveal hidden dirt", () => {
  const a = makeRoom("open"),
    b = clone(a);
  b.cells[0][0] = "dirt";
  const oa = observe(a, a.start),
    ob = observe(b, b.start);
  assert.deepEqual(oa, ob);
  assert.deepEqual(new Agent().decide(oa), new Agent().decide(ob));
  assert.deepEqual(Object.keys(oa).sort(), ["dirty", "neighbors", "position"]);
});
test("Reflex runs reproduce with the same seed", () => {
  const a = finish(new Simulation(makeRoom(), "reflex", 91, 200)),
    b = finish(new Simulation(makeRoom(), "reflex", 91, 200));
  assert.deepEqual(a.history, b.history);
  assert.equal(a.actions, 200);
  assert.equal(a.endReason, "Action limit reached");
  assert.equal(a.agent.map.size, 0);
  assert.equal(a.agent.visited.size, 0);
});
test("No initial dirt yields null cleaning rate, not NaN", () => {
  const room = makeRoom();
  room.cells = room.cells.map((row) =>
    row.map((cell) => (cell === "dirt" ? "empty" : cell)),
  );
  const sim = finish(new Simulation(room));
  assert.equal(sim.metrics().cleaning, null);
  assert.equal(sim.metrics().remaining, 0);
});
test("Reset via fresh simulation preserves original room", () => {
  const room = makeRoom();
  const before = clone(room);
  finish(new Simulation(room));
  assert.deepEqual(room, before);
  const reset = new Simulation(room);
  assert.equal(reset.actions, 0);
  assert.deepEqual(reset.room, room);
});
test("Evaluation reports sealed off dirt independently", () => {
  const ev = evaluate(makeRoom("unreachable"));
  assert.equal(ev.unreachableDirt, 2);
  assert.equal(ev.dirt, 8);
});
test("Finished runs cannot take more actions", () => {
  const sim = finish(new Simulation(makeRoom(), "reflex", 42, 1));
  const before = sim.actions;
  assert.equal(sim.step(), null);
  assert.equal(sim.actions, before);
});
test("Memory agent completes 100 varied static rooms without collisions", () => {
  const { randomGenerator } = require("../agent.js");
  const random = randomGenerator(2026);
  for (let i = 0; i < 100; i++) {
    const room = makeRoom();
    room.cells = room.cells.map((row) =>
      row.map(() => {
        const n = random();
        return n < 0.25 ? "wall" : n < 0.55 ? "dirt" : "empty";
      }),
    );
    room.cells[room.start.r][room.start.c] = "empty";
    const sim = finish(new Simulation(room, "memory", 42, 1000));
    assert.equal(sim.metrics().coverage, 100);
    assert.equal(sim.cleans, sim.evaluation.reachableDirt);
    assert.notEqual(sim.endReason, "Action limit reached");
  }
});
