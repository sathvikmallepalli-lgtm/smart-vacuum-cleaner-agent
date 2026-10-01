/* The agent receives observations, never the complete room. */
(function (root) {
  const directions = [
    { dr: -1, dc: 0, name: "up" },
    { dr: 0, dc: 1, name: "right" },
    { dr: 1, dc: 0, name: "down" },
    { dr: 0, dc: -1, name: "left" },
  ];
  const key = (r, c) => `${r},${c}`;
  function randomGenerator(seed) {
    let state = Number(seed) >>> 0;
    return () => {
      state += 0x6d2b79f5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  class Agent {
    constructor(mode = "memory", seed = 42) {
      this.mode = mode;
      this.map = new Map();
      this.visited = new Set();
      this.random = randomGenerator(seed);
      this.route = [];
      this.target = null;
    }
    decide(observation) {
      const { position, dirty, neighbors } = observation;
      const here = key(position.r, position.c);
      if (this.mode === "memory") {
        this.visited.add(here);
        this.map.set(here, "free");
        neighbors.forEach((n) =>
          this.map.set(key(n.r, n.c), n.free ? "free" : "blocked"),
        );
      }
      this.route = [];
      this.target = null;
      if (dirty)
        return {
          type: "clean",
          reason: "Dirt detected at the current cell. Clean before moving.",
        };
      if (this.mode === "reflex") {
        const choices = neighbors.filter((n) => n.free);
        if (!choices.length)
          return {
            type: "stop",
            reason: "No adjacent free cell. The reflex agent cannot move.",
          };
        const next = choices[Math.floor(this.random() * choices.length)];
        return {
          type: "move",
          r: next.r,
          c: next.c,
          reason: `Current cell is clean. Choose a valid neighbor at random: move ${next.name}.`,
        };
      }
      // BFS explores only the agent's discovered free cells.
      const queue = [here],
        previous = new Map([[here, null]]);
      let target = null;
      for (let i = 0; i < queue.length; i++) {
        const current = queue[i];
        if (!this.visited.has(current)) {
          target = current;
          break;
        }
        const [r, c] = current.split(",").map(Number);
        for (const d of directions) {
          const next = key(r + d.dr, c + d.dc);
          if (this.map.get(next) === "free" && !previous.has(next)) {
            previous.set(next, current);
            queue.push(next);
          }
        }
      }
      if (!target)
        return {
          type: "stop",
          reason:
            "No reachable unvisited cell remains in the discovered map. Exploration is complete.",
        };
      const path = [];
      for (
        let current = target;
        current !== here;
        current = previous.get(current)
      )
        path.unshift(current);
      this.route = path;
      this.target = target;
      const [r, c] = path[0].split(",").map(Number);
      const direction = directions.find(
        (d) => position.r + d.dr === r && position.c + d.dc === c,
      ).name;
      return {
        type: "move",
        r,
        c,
        reason: `BFS found an unvisited cell ${path.length} move${path.length === 1 ? "" : "s"} away. Move ${direction} along the shortest known route.`,
      };
    }
  }
  const api = { Agent, directions, key, randomGenerator };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CleaningAgent = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
