(function (root) {
  const { directions, key, Agent } =
    typeof module !== "undefined" && module.exports
      ? require("./agent.js")
      : root.CleaningAgent;
  const SIZE = 8;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  function makeRoom(preset = "obstacles") {
    const room = {
      size: SIZE,
      cells: Array.from({ length: SIZE }, () => Array(SIZE).fill("empty")),
      start: { r: 6, c: 1 },
    };
    let walls = [],
      dirt = [];
    if (preset === "open")
      dirt = [
        [0, 1],
        [0, 6],
        [1, 3],
        [2, 5],
        [3, 1],
        [4, 6],
        [5, 3],
        [6, 5],
        [7, 0],
        [7, 7],
      ];
    else if (preset === "unreachable") {
      walls = [
        [0, 5],
        [1, 5],
        [2, 5],
        [2, 6],
        [2, 7],
        [3, 2],
        [4, 2],
      ];
      dirt = [
        [0, 7],
        [1, 6],
        [0, 1],
        [2, 3],
        [4, 5],
        [5, 0],
        [6, 6],
        [7, 3],
      ];
    } else if (preset === "corridor") {
      for (let r = 0; r < SIZE; r++)
        for (let c = 0; c < SIZE; c++)
          if (r % 2 === 1 && c !== (r % 4 === 1 ? 7 : 0)) walls.push([r, c]);
      room.start = { r: 0, c: 0 };
      dirt = [
        [0, 2],
        [0, 6],
        [2, 4],
        [2, 1],
        [4, 3],
        [4, 7],
        [6, 5],
        [6, 0],
      ];
    } else {
      walls = [
        [1, 2],
        [1, 3],
        [1, 4],
        [2, 4],
        [3, 4],
        [4, 1],
        [4, 2],
        [5, 5],
        [5, 6],
        [6, 5],
      ];
      dirt = [
        [0, 1],
        [0, 6],
        [1, 6],
        [2, 2],
        [3, 0],
        [3, 6],
        [4, 4],
        [5, 2],
        [6, 3],
        [6, 7],
        [7, 0],
        [7, 5],
      ];
    }
    walls.forEach(([r, c]) => (room.cells[r][c] = "wall"));
    dirt.forEach(([r, c]) => (room.cells[r][c] = "dirt"));
    return room;
  }
  function isFree(room, r, c) {
    return (
      r >= 0 &&
      c >= 0 &&
      r < room.size &&
      c < room.size &&
      room.cells[r][c] !== "wall"
    );
  }
  function observe(room, position) {
    return {
      position: { ...position },
      dirty: room.cells[position.r][position.c] === "dirt",
      neighbors: directions.map((d) => ({
        r: position.r + d.dr,
        c: position.c + d.dc,
        free: isFree(room, position.r + d.dr, position.c + d.dc),
        name: d.name,
      })),
    };
  }
  function evaluate(room) {
    const reachable = new Set([key(room.start.r, room.start.c)]),
      queue = [{ ...room.start }];
    for (let i = 0; i < queue.length; i++)
      for (const d of directions) {
        const r = queue[i].r + d.dr,
          c = queue[i].c + d.dc,
          k = key(r, c);
        if (isFree(room, r, c) && !reachable.has(k)) {
          reachable.add(k);
          queue.push({ r, c });
        }
      }
    let dirt = 0,
      reachableDirt = 0;
    room.cells.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell === "dirt") {
          dirt++;
          if (reachable.has(key(r, c))) reachableDirt++;
        }
      }),
    );
    return {
      reachable,
      dirt,
      reachableDirt,
      unreachableDirt: dirt - reachableDirt,
    };
  }
  class Simulation {
    constructor(initial, mode = "memory", seed = 42, budget = 500) {
      this.initial = clone(initial);
      this.room = clone(initial);
      this.position = { ...initial.start };
      this.agent = new Agent(mode, seed);
      this.mode = mode;
      this.seed = seed;
      this.budget = budget;
      this.evaluation = evaluate(initial);
      this.visited = new Set([key(this.position.r, this.position.c)]);
      this.moves = 0;
      this.cleans = 0;
      this.actions = 0;
      this.finished = false;
      this.endReason = "";
      this.history = [];
    }
    step() {
      if (this.finished) return null;
      if (this.actions >= this.budget) {
        this.finished = true;
        this.endReason = "Action limit reached";
        return {
          type: "stop",
          reason: "The shared action budget has been reached.",
        };
      }
      const decision = this.agent.decide(observe(this.room, this.position));
      if (decision.type === "clean") {
        this.room.cells[this.position.r][this.position.c] = "empty";
        this.cleans++;
        this.actions++;
      } else if (decision.type === "move") {
        const distance =
          Math.abs(decision.r - this.position.r) +
          Math.abs(decision.c - this.position.c);
        if (distance !== 1 || !isFree(this.room, decision.r, decision.c))
          throw new Error("Agent attempted an invalid move.");
        this.position = { r: decision.r, c: decision.c };
        this.moves++;
        this.actions++;
        this.visited.add(key(decision.r, decision.c));
      } else {
        this.finished = true;
        this.endReason =
          this.mode === "memory" ? "Reachable room explored" : "No valid move";
      }
      // The evaluator recognizes completion without exposing hidden state to the agent.
      // Reflex mode keeps running to the budget because it has no completion memory.
      if (!this.finished && this.actions >= this.budget) {
        this.finished = true;
        this.endReason = "Action limit reached";
      }
      this.history.push({ action: this.actions, ...decision });
      return decision;
    }
    metrics() {
      return {
        moves: this.moves,
        cleans: this.cleans,
        actions: this.actions,
        remaining: this.evaluation.dirt - this.cleans,
        coverage: (100 * this.visited.size) / this.evaluation.reachable.size,
        cleaning: this.evaluation.reachableDirt
          ? (100 * this.cleans) / this.evaluation.reachableDirt
          : null,
        unreachable: this.evaluation.unreachableDirt,
      };
    }
  }
  const api = { SIZE, clone, makeRoom, isFree, observe, evaluate, Simulation };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CleaningRoom = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
