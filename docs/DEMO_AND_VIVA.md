# Demonstration and Viva Guide

## Explain the project in 30 seconds

“Our project is a browser simulation of a smart vacuum-cleaner agent. We represent a room as a grid with dirt and obstacles. The agent senses dirt at its current cell and checks its four neighbors. If it finds dirt, it cleans. Otherwise, our memory-based agent records what it has explored and uses breadth-first search to reach an unvisited cell. We compare it with a simple reflex agent and measure cleaning, coverage, and actions.”

## Five-minute demo

1. **Environment:** show the 8 × 8 room and explain symbols. Dirt is simulated, not measured with hardware.
2. **Agent:** select Memory + BFS and click Single step. Explain the local sensor text and selected action.
3. **Memory:** enable “Show only what the agent knows.” Unknown cells and hidden distant dirt demonstrate limited perception.
4. **Autonomy:** resume at a faster speed. Show dirt removal and visited-cell coverage.
5. **Limits:** reset and load Unreachable corner. Two patches are blocked off. The agent can complete reachable exploration without cleaning these.
6. **Comparison:** compare both agents on the same original room, seed 42, and 500-action limit. Explain the table and download CSV.
7. **Evidence:** show the test results and explain one important case, such as ensuring hidden dirt does not change current decisions.

## Algorithms in simple words

### Simple reflex

```text
If the current cell is dirty: clean it.
Otherwise: randomly choose a free adjacent cell and move.
If no move is possible: stop.
```

It uses the current observation and no map or visited-cell memory. Random choices use a seed so an experiment can be repeated.

### Memory + BFS

```text
Observe current dirt and adjacent occupancy.
Mark the current cell visited; record adjacent free/blocked cells.
If dirty: clean.
Otherwise: BFS through discovered free cells to the nearest unvisited cell.
If a target exists: take the first move on its route.
Otherwise: stop.
```

BFS expands positions in layers using a queue. Since each move costs one, its first target has a shortest known route. A fixed neighbor order breaks ties: up, right, down, left. It explores the start position's connected region; walls can isolate other parts of the room.

## Likely viva questions

**Where is the AI?** In the observation–decision–action cycle, rule-based action selection, internal map, and search. This is classical AI; AI does not require machine learning.

**Why is this model-based?** The memory agent retains an internal representation of discovered free/blocked cells and visited locations. A reflex agent uses current perception without this stored model.

**Does it know the entire room?** The interface and evaluator know the grid. The agent receives only current dirt and adjacent occupancy. Its planner uses its own discovered map.

**Why BFS?** All four-direction moves have equal cost. BFS is easy to explain and finds a shortest route to a known target. It does not produce the best overall cleaning tour.

**What is the state?** Position, room dirt/obstacles, discovered map, visited locations, counters, and running status. The agent only owns the information it needs for decisions; evaluator counters are separate.

**What does coverage mean?** Visited reachable free cells divided by all reachable free cells. A cell visit is different from a cleaning action.

**What if there is no dirt?** The memory agent still explores the room. The cleaning rate displays “No dirt initially” rather than dividing by zero.

**Why can the reflex agent keep moving after cleaning all dirt?** It cannot know the whole room is clean from its current observation. We bound its run by the action limit.

**Is memory always faster?** Do not claim that. Report measured actions, coverage, and cleaning for each test room. The random agent can get lucky in a small room.

**What are the assumptions?** A static discrete environment, deterministic movement, perfect local sensors, and one-action dirt removal. These simplify a classroom model and are not guarantees for a physical robot.

**What is PEAS?** Performance: cleaning, coverage, actions. Environment: grid room. Actuators: four-direction moves, clean, stop. Sensors: current dirt and adjacent occupancy.

**Future scope?** Dynamic dirt, variable cleaning costs, larger rooms, or an additional search strategy. Explain these as future ideas, not implemented features.

## Present results honestly

Use `results/preset-results.csv` for recorded experiments. It contains actual software measurements at seed 42 and a 500-action budget. Additional seeds can be tested through the interface. Do not call a single random-seed result a universal performance proof. The evaluator excludes inaccessible dirt from the reachable cleaning percentage and separately reports remaining dirt.

## Submission checklist

- Confirm faculty's required report and presentation format.
- Practice explaining one reflex decision and one BFS route.
- Keep the complete project folder together; `index.html` needs the adjacent JavaScript/CSS files.
- Open the app and complete one test run before the live demonstration.
