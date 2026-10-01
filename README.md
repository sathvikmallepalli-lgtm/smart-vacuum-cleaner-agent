# Roomwise · Smart Vacuum Cleaner Agent

[![Tests](https://github.com/sathvikmallepalli-lgtm/smart-vacuum-cleaner-agent/actions/workflows/tests.yml/badge.svg)](https://github.com/sathvikmallepalli-lgtm/smart-vacuum-cleaner-agent/actions/workflows/tests.yml)

This is my second-year B.Tech project for **Fundamentals of Artificial Intelligence (FOA)**, developed with my project team. We built an interactive vacuum-cleaner simulation to demonstrate how an intelligent agent senses a room, chooses an action, and cleans accessible areas.

The project uses beginner-friendly **HTML, CSS, and JavaScript**, with rule-based decisions, memory, and breadth-first search (BFS). It runs entirely in a browser and requires no physical robot, paid services, or machine-learning training.

## What it does

- Design an 8 × 8 room by placing dirt, obstacles, and the agent.
- Try four presets: open room, furniture, winding corridor, and unreachable corner.
- Run a **memory + BFS agent** or a **simple reflex agent**.
- Start, pause, resume, or step through individual actions.
- Inspect local observations, decision explanations, and recent action history.
- Switch to the agent's limited view to hide unknown cells and distant dirt.
- Measure movement, cleaning actions, reachable coverage, and remaining dirt.
- Compare both strategies on the same room and export results as CSV.

## Try it locally

### Open directly

Download or clone the repository and open **`index.html`** in a modern browser. Keep the adjacent CSS and JavaScript files together. The application has no external runtime dependencies and works offline.

```sh
git clone https://github.com/sathvikmallepalli-lgtm/smart-vacuum-cleaner-agent.git
cd smart-vacuum-cleaner-agent
```

### Optional local server

If Python 3 is installed:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Open [the local preview](http://127.0.0.1:8080). Stop the server with `Ctrl+C`. Alternatively, `npm start` runs the same command when Node.js and Python are available. No `npm install` is needed.

## How the AI works

Both agents receive the same local observation: dirt at the current cell and the free/blocked status of the four neighboring cells. The interface can draw the whole room, but the agent's planner cannot read the simulator's full grid.

| Strategy      | Decision rule                                                                                    | Internal memory                  |
| ------------- | ------------------------------------------------------------------------------------------------ | -------------------------------- |
| Simple reflex | Clean if dirty; otherwise randomly choose a valid neighbor                                       | No map or visited-cell memory    |
| Memory + BFS  | Clean if dirty; otherwise find the nearest discovered unvisited cell and take one step toward it | Discovered map and visited cells |

BFS uses a queue to explore positions in layers. Because each move costs one action, it finds a shortest known route to its selected target. It does **not** compute an optimal tour of the entire room.

The memory agent stops when it has explored every cell reachable from its start. The reflex agent cannot infer room completion, so it runs until it is trapped or reaches the configured action limit. A random seed makes reflex experiments reproducible.

### PEAS

| Element     | This project                                                 |
| ----------- | ------------------------------------------------------------ |
| Performance | Reachable dirt cleaned, reachable-cell coverage, and actions |
| Environment | Static grid room with dirt and obstacles                     |
| Actuators   | Move up/right/down/left, clean, stop                         |
| Sensors     | Current-cell dirt and adjacent occupancy                     |

## Recorded results

These measurements use **seed 42** and the same **500-action limit** for both strategies. “Dirt cleaned” counts initially reachable dirt; blocked-off dirt is reported separately.

| Room               | Memory actions | Memory coverage | Reflex actions | Reflex coverage | Reflex dirt cleaned |
| ------------------ | -------------: | --------------: | -------------: | --------------: | ------------------: |
| Open room          |             75 |            100% |            500 |            100% |                100% |
| Furniture          |             71 |            100% |            500 |          92.59% |                100% |
| Winding corridor   |             43 |            100% |            500 |          61.11% |               62.5% |
| Unreachable corner |             61 |            100% |            500 |            100% |                100% |

The memory agent cleaned 100% of reachable dirt in each preset. The unreachable-corner room contains two inaccessible dirt patches, which both agents leave behind. These results describe the recorded rooms and seed; they do not prove one strategy is always better.

Full measurements: [CSV](results/preset-results.csv) · [JSON](results/preset-results.json).

## Tests

With Node.js installed:

```sh
npm test
node tests/record-results.js
```

The 14 automated tests include the four presets and 100 generated rooms, obstacle-safe movement, clean-first behavior, shortest-path detours, inaccessible dirt, local-observation isolation, seeded repeatability, empty-room metrics, and reset isolation. GitHub Actions runs tests on pushes and pull requests.

## Project structure

```text
smart-vacuum-cleaner-agent/
├── index.html                 Interface and FOA explanation
├── styles.css                 Responsive styling
├── agent.js                   Rules, memory, BFS, seeded randomness
├── room.js                    Room state, observations, evaluator
├── app.js                     Controls, rendering, comparison, CSV
├── package.json               Test and local-server commands
├── docs/
│   ├── ARCHITECTURE.md         Data flow and implementation notes
│   └── DEMO_AND_VIVA.md        Presentation walkthrough and explanations
├── tests/
│   ├── agent.test.js          Algorithm verification
│   └── record-results.js      Repeatable preset experiments
├── results/
│   ├── preset-results.csv
│   └── preset-results.json
└── .github/workflows/
    └── tests.yml              Automated checks
```

## Demonstrate the project

1. Load the furniture room and select Memory + BFS.
2. Use **Single step** to explain sensing, decision-making, and action.
3. Resume cleaning and inspect the agent's limited view.
4. Reset, load the unreachable-corner room, and explain inaccessible dirt.
5. Select **Compare agents** and discuss coverage and action counts.

See the [demo and viva guide](docs/DEMO_AND_VIVA.md) for a complete walkthrough.

## Assumptions and limitations

This is a software simulation. Cleaning removes a dirt patch in one action; movement and local sensing are deterministic. The room stays static during a run. Coverage means visited reachable cells and is different from debris removal. Custom room layouts are reset on browser reload. CSV export includes a copyable fallback for browsers that block downloads.

## Author

Developed by [sathvikmallepalli-lgtm](https://github.com/sathvikmallepalli-lgtm) with the FOA project team as a second-year B.Tech academic project.
