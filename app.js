/* UI orchestration. Core algorithms are in agent.js and room.js. */
(() => {
  "use strict";
  const { makeRoom, clone, observe, Simulation } = CleaningRoom;
  const { key } = CleaningAgent;
  const $ = (id) => document.getElementById(id);
  let initial = makeRoom("obstacles"),
    sim,
    tool = "dirt",
    phase = "ready",
    timer = null,
    resultRows = null,
    noticeTimer;
  const labels = {
    dirt: "Click a cell to add dirt. Choose Erase to remove it.",
    wall: "Click a cell to place an obstacle. The starting cell must stay free.",
    start: "Click a free cell to choose the agent’s starting position.",
    erase: "Click a cell to remove dirt or an obstacle.",
  };
  const delays = [1000, 650, 350, 140, 45],
    speeds = ["Slow", "Relaxed", "Normal", "Fast", "Very fast"];
  function notice(message) {
    $("notice").textContent = message;
    $("notice").hidden = false;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => ($("notice").hidden = true), 4000);
  }
  function settings() {
    const seed = Math.min(
      4294967295,
      Math.max(0, Math.trunc(Number($("seed").value) || 0)),
    );
    const budget = Math.min(
      10000,
      Math.max(1, Math.trunc(Number($("budget").value) || 500)),
    );
    $("seed").value = seed;
    $("budget").value = budget;
    return { mode: $("mode").value, seed, budget };
  }
  function prepareRun() {
    if (phase === "ready") {
      const s = settings();
      sim = new Simulation(initial, s.mode, s.seed, s.budget);
    }
  }
  function stopTimer() {
    clearTimeout(timer);
    timer = null;
  }
  function clearComparison() {
    resultRows = null;
    $("csv-preview").hidden = true;
    $("csv-preview").open = false;
    $("export").disabled = true;
    $("comparison-result").className = "comparison-empty";
    $("comparison-result").textContent =
      "Your experiment results will appear here.";
  }
  function reset(clearResults = false) {
    stopTimer();
    const s = settings();
    sim = new Simulation(initial, s.mode, s.seed, s.budget);
    phase = "ready";
    $("decision-title").textContent = "Ready to explore";
    $("decision-text").textContent =
      "Start cleaning, or use Single step to follow one decision at a time.";
    if (clearResults) clearComparison();
    render();
  }
  function render() {
    const active = document.activeElement?.dataset?.cell;
    const m = sim.metrics(),
      obs = observe(sim.room, sim.position),
      known = new Set([
        ...sim.agent.map.keys(),
        key(sim.position.r, sim.position.c),
        ...obs.neighbors.map((n) => key(n.r, n.c)),
      ]);
    const agentView = $("agent-view").checked;
    if (sim.mode === "reflex") {
      known.clear();
      known.add(key(sim.position.r, sim.position.c));
      obs.neighbors.forEach((n) => known.add(key(n.r, n.c)));
    }
    const route = new Set(sim.agent.route),
      fragment = document.createDocumentFragment();
    sim.room.cells.forEach((row, r) =>
      row.forEach((cell, c) => {
        const k = key(r, c),
          robot = sim.position.r === r && sim.position.c === c,
          unknown = agentView && !known.has(k);
        const visibleCell =
          agentView && cell === "dirt" && !robot ? "empty" : cell;
        const showVisited =
          sim.visited.has(k) && (!agentView || sim.mode === "memory" || robot);
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.cell = k;
        button.className = "cell";
        if (unknown) {
          button.classList.add("unknown");
          button.textContent = "?";
        } else {
          if (showVisited) button.classList.add("visited");
          if (visibleCell === "wall") {
            button.classList.add("wall");
            button.textContent = "▧";
          } else if (visibleCell === "dirt") {
            button.classList.add("dirt");
            button.textContent = "✦";
          } else if (showVisited) button.textContent = "✓";
          if (route.has(k)) button.classList.add("route");
          if (robot) {
            button.classList.add("robot");
            button.innerHTML =
              '<span class="robot-icon" aria-hidden="true">◉</span>' +
              (cell === "dirt"
                ? '<span class="under-dirt" aria-hidden="true">✦</span>'
                : "");
          }
        }
        button.setAttribute(
          "aria-label",
          `Row ${r + 1}, column ${c + 1}: ${unknown ? "unknown" : visibleCell === "wall" ? "obstacle" : visibleCell === "dirt" ? "dirty" : agentView && !robot ? "free, dirt status unknown" : "clean"}${robot ? ", agent here" : ""}${!unknown && showVisited ? ", visited" : ""}`,
        );
        button.disabled = phase !== "ready";
        button.tabIndex = k === (active || "0,0") ? 0 : -1;
        fragment.append(button);
      }),
    );
    $("grid").replaceChildren(fragment);
    if (active && phase === "ready")
      $("grid").querySelector(`[data-cell="${active}"]`)?.focus();
    $("remaining").textContent = m.remaining;
    $("moves").textContent = m.moves;
    $("cleans").textContent = m.cleans;
    $("coverage").textContent = `${Math.round(m.coverage)}%`;
    $("clean-percent").textContent =
      m.cleaning === null ? "No dirt initially" : `${Math.round(m.cleaning)}%`;
    $("clean-progress").value = m.cleaning === null ? 0 : m.cleaning;
    const local = obs.neighbors
      .map((n) => `${n.name}: ${n.free ? "free" : "blocked"}`)
      .join(" · ");
    $("sensor-text").textContent =
      `Current cell: ${obs.dirty ? "dirty" : "clean"}. ${local}.`;
    $("status").textContent =
      phase === "running"
        ? "Cleaning"
        : phase === "paused"
          ? "Paused"
          : phase === "finished"
            ? "Finished"
            : "Ready";
    $("status").className =
      "status " +
      (phase === "running"
        ? "running"
        : phase === "finished"
          ? "finished"
          : "");
    $("start").disabled = phase === "running" || phase === "finished";
    $("start").textContent =
      phase === "paused" ? "▶ Resume cleaning" : "▶ Start cleaning";
    $("pause").disabled = phase !== "running";
    $("step").disabled = phase === "running" || phase === "finished";
    ["preset", "clear", "mode", "seed", "budget"].forEach(
      (id) => ($(id).disabled = phase !== "ready"),
    );
    document
      .querySelectorAll("[data-tool]")
      .forEach((button) => (button.disabled = phase !== "ready"));
    $("edit-hint").textContent =
      phase === "ready"
        ? labels[tool]
        : "Room editing is locked during a run. Reset to edit the original room.";
    $("mode-description").textContent =
      sim.mode === "memory"
        ? "Remembers visited cells and searches for the nearest unexplored cell."
        : "Cleans if dirty; otherwise chooses a free neighbor randomly. It can revisit cells.";
    $("seed").disabled = phase !== "ready"; // Seed also controls comparison, so keep it visible in both modes.
    $("action-count").textContent =
      `${m.actions} action${m.actions === 1 ? "" : "s"}`;
    const log = document.createDocumentFragment();
    if (!sim.history.length) {
      const li = document.createElement("li");
      li.textContent = "Decisions will appear here as the agent runs.";
      log.append(li);
    } else
      sim.history
        .slice(-12)
        .reverse()
        .forEach((item) => {
          const li = document.createElement("li");
          li.textContent = `${item.type === "stop" ? "Stop" : `Action ${item.action}`} — ${item.reason}`;
          log.append(li);
        });
    $("log").replaceChildren(log);
    let note = `${m.unreachable} dirt patch${m.unreachable === 1 ? " is" : "es are"} unreachable from the start. Coverage counts visited reachable cells.`;
    if (phase === "finished")
      note =
        `${sim.endReason}. ${m.remaining} dirt patch${m.remaining === 1 ? " remains" : "es remain"}, including ${m.unreachable} unreachable. ` +
        (m.cleaning === null
          ? "There was no reachable dirt initially."
          : `${Math.round(m.cleaning)}% of reachable dirt cleaned.`);
    $("result-note").textContent = note;
  }
  function advance() {
    try {
      const decision = sim.step();
      if (decision) {
        $("decision-title").textContent =
          decision.type === "clean"
            ? "Clean this cell"
            : decision.type === "move"
              ? "Choose the next cell"
              : sim.endReason;
        $("decision-text").textContent = decision.reason;
      }
      if (sim.finished) {
        phase = "finished";
        stopTimer();
      }
      render();
    } catch (error) {
      stopTimer();
      phase = "paused";
      notice(`Run paused: ${error.message}`);
      render();
    }
  }
  function tick() {
    timer = null;
    if (phase !== "running") return;
    advance();
    if (phase === "running")
      timer = setTimeout(tick, delays[Number($("speed").value) - 1]);
  }
  $("start").addEventListener("click", () => {
    if (phase === "running" || sim.finished) return;
    prepareRun();
    phase = "running";
    render();
    tick();
  });
  $("pause").addEventListener("click", () => {
    stopTimer();
    phase = "paused";
    render();
  });
  $("step").addEventListener("click", () => {
    if (phase === "running" || sim.finished) return;
    prepareRun();
    phase = "paused";
    advance();
  });
  $("reset").addEventListener("click", () => reset());
  $("speed").addEventListener("input", () => {
    $("speed-value").textContent = speeds[Number($("speed").value) - 1];
  });
  $("agent-view").addEventListener("change", render);
  document.querySelectorAll("[data-tool]").forEach((button) =>
    button.addEventListener("click", () => {
      tool = button.dataset.tool;
      document
        .querySelectorAll("[data-tool]")
        .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      $("edit-hint").textContent = labels[tool];
    }),
  );
  $("grid").addEventListener("click", (event) => {
    const button = event.target.closest("[data-cell]");
    if (!button || phase !== "ready") return;
    const [r, c] = button.dataset.cell.split(",").map(Number);
    if (tool === "start") {
      if (initial.cells[r][c] === "wall") {
        notice("Erase the obstacle before placing the agent here.");
        return;
      }
      initial.start = { r, c };
    } else if (
      tool === "wall" &&
      initial.start.r === r &&
      initial.start.c === c
    ) {
      notice("The agent’s starting cell must stay free. Move the agent first.");
      return;
    } else initial.cells[r][c] = tool === "erase" ? "empty" : tool;
    reset(true);
  });
  $("grid").addEventListener("keydown", (event) => {
    const button = event.target.closest("[data-cell]");
    if (!button) return;
    const delta = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    }[event.key];
    if (!delta) return;
    event.preventDefault();
    const [r, c] = button.dataset.cell.split(",").map(Number),
      next = $("grid").querySelector(
        `[data-cell="${r + delta[0]},${c + delta[1]}"]`,
      );
    if (next) {
      button.tabIndex = -1;
      next.tabIndex = 0;
      next.focus();
    }
  });
  $("preset").addEventListener("change", () => {
    initial = makeRoom($("preset").value);
    reset(true);
  });
  $("clear").addEventListener("click", () => {
    initial.cells = initial.cells.map((row) => row.map(() => "empty"));
    reset(true);
    notice(
      "Room cleared. Place dirt and obstacles to make your own experiment.",
    );
  });
  ["mode", "seed", "budget"].forEach((id) =>
    $(id).addEventListener("change", () => reset(true)),
  );
  $("help-button").addEventListener("click", () =>
    $("learn").scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    }),
  );
  $("compare").addEventListener("click", () => {
    const s = settings();
    resultRows = ["memory", "reflex"].map((mode) => {
      const experiment = new Simulation(initial, mode, s.seed, s.budget);
      while (!experiment.finished) experiment.step();
      return {
        strategy: mode === "memory" ? "Memory + BFS" : "Simple reflex",
        seed: s.seed,
        budget: s.budget,
        ...experiment.metrics(),
        end: experiment.endReason,
      };
    });
    const area = $("comparison-result");
    area.className = "";
    area.replaceChildren();
    const wrap = document.createElement("div");
    wrap.className = "table-wrap";
    const table = document.createElement("table");
    table.innerHTML =
      '<caption class="sr-only">Agent comparison using the original room</caption><thead><tr><th scope="col">Strategy</th><th scope="col">Moves</th><th scope="col">Cleans</th><th scope="col">Actions</th><th scope="col">Coverage</th><th scope="col">Dirt cleaned*</th><th scope="col">End reason</th></tr></thead>';
    const body = document.createElement("tbody");
    resultRows.forEach((row) => {
      const tr = document.createElement("tr");
      [
        row.strategy,
        row.moves,
        row.cleans,
        row.actions,
        `${Math.round(row.coverage)}%`,
        row.cleaning === null ? "No dirt" : `${Math.round(row.cleaning)}%`,
        row.end,
      ].forEach((value) => {
        const td = document.createElement("td");
        td.textContent = value;
        tr.append(td);
      });
      body.append(tr);
    });
    table.append(body);
    wrap.append(table);
    area.append(wrap);
    const caption = document.createElement("p");
    caption.className = "comparison-caption";
    caption.textContent = `*Of initially reachable dirt. Seed ${s.seed}; limit ${s.budget} actions for each agent. ${resultRows[0].unreachable} unreachable dirt patches excluded. This single experiment does not establish which strategy is always better.`;
    area.append(caption);
    $("export").disabled = false;
  });
  $("export").addEventListener("click", () => {
    if (!resultRows) return;
    const header = [
      "Strategy",
      "Seed",
      "Action limit",
      "Moves",
      "Cleaning actions",
      "Total actions",
      "Coverage percent",
      "Reachable dirt cleaned percent",
      "Unreachable dirt",
      "Remaining dirt",
      "End reason",
    ];
    const rows = resultRows.map((r) => [
      r.strategy,
      r.seed,
      r.budget,
      r.moves,
      r.cleans,
      r.actions,
      r.coverage.toFixed(2),
      r.cleaning === null ? "N/A" : r.cleaning.toFixed(2),
      r.unreachable,
      r.remaining,
      r.end,
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row.map((v) => '"' + String(v).replaceAll('"', '""') + '"').join(","),
      )
      .join("\r\n");
    $("csv-text").value = csv;
    $("csv-preview").hidden = false;
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "roomwise-comparison.csv";
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  reset();
})();
