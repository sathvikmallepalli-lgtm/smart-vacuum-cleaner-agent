# Architecture

The project deliberately separates the room simulator, the agent, and the evaluator so the planner cannot use information outside its sensor observations.

## Data flow

```text
Room + current position
          |
          v
Local observation: current dirt + adjacent occupancy
          |
          v
Agent: rules + internal memory + BFS
          |
          v
One decision: move / clean / stop
          |
          v
Simulator validates and applies the action
          |
          v
Updated room, counters, and display
```

## Files and responsibilities

- `agent.js`: the `Agent` class owns its discovered free/blocked map, visited set, seeded random generator, and route. `decide()` accepts an observation rather than a room object.
- `room.js`: constructs presets, produces local observations, validates movement, applies cleaning, and maintains simulation counters. Its separate evaluator determines reachable cells and initially reachable dirt from the initial grid.
- `app.js`: manages editing, animation timers, run states, accessibility labels, explanations, side-by-side experiments, and CSV generation.
- `index.html` and `styles.css`: the interface and responsive layout.

The evaluator knows the complete room to score a run. Its visited-cell tracking is not agent memory and does not influence the reflex agent's decisions.

## Coordinates and actions

Positions use zero-based `{r, c}` coordinates. The interface announces one-based row and column numbers. Movement is restricted to four adjacent cells. Room boundaries and obstacles cannot be entered.

A move or a cleaning operation increments the action count once. Stopping is not a movement or cleaning action. The action limit bounds a run. Completion can mean explored reachable space, no valid reflex move, or a reached action limit; the UI reports the applicable reason.

## BFS

The agent records its current cell and adjacent occupancy on every decision. If the current cell is dirty, it returns a cleaning action first. Otherwise, BFS traverses only discovered free cells, records predecessors, and chooses the first unvisited target. It reconstructs the route and returns its first movement.

The queue's neighbor order is up, right, down, left, making ties deterministic. The current route is recomputed after each observation. With unit-cost edges, BFS finds a shortest known route. For a discovered graph with V vertices and E edges, traversal is O(V + E).

## UI state

- **Ready:** editing and strategy settings are enabled.
- **Running:** automatic decisions execute through one timer loop.
- **Paused:** manual stepping and resume are available.
- **Finished:** the user can inspect results or reset.

Reset creates a fresh simulation from the original configured room. It restores dirt, position, counters, and agent memory. Comparison always uses the original room, even if the visible animated run has partly cleaned it.

## Metrics

- Reachable coverage = visited reachable cells / total reachable free cells.
- Reachable cleaning = cleaned initially reachable dirt / initial reachable dirt.
- Remaining dirt = initial total dirt minus cleaning actions.

If there is no initially reachable dirt, the cleaning rate is displayed as a no-dirt case rather than dividing by zero. Unreachable dirt remains visible and is separately reported.

## Reproducibility

Seeded pseudorandom choices make reflex trials repeatable. The recorded presets use seed 42 and 500 actions. The test suite checks local observation isolation by changing hidden dirt and verifying that identical observations produce identical immediate decisions.
