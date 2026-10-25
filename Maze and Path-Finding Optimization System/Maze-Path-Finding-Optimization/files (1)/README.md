# Maze and Path-Finding Optimization System

## 1. Problem Statement
Design and develop an interactive maze-solving system that finds optimal paths from a source to a destination using **BFS, DFS, Dijkstra's algorithm and A\***, and compares the algorithms on **path length, execution time and number of nodes explored**.

**DAA concepts:** BFS, DFS, Dijkstra, A*, path finding, performance comparison, time and space complexity.

## 2. Project Structure
```
Maze-Pathfinding-Project/
  codes/
    maze_solver.cpp     C++ core: BFS, DFS, Dijkstra, A*, comparison table, maze generator
  index.html            web interface (layout)
  style.css             web interface (styling)
  script.js             web interface: maze generator, the 4 algorithms, animation, race simulation
  test_files/           6 sample mazes (text files, used by both C++ and web)
  tests/                Node.js test scripts: benchmark.js and edge_cases.js
  screenshots/          add your screenshots here
  README.md
```

## 3. How the Two Parts Fit Together
| Part | Technology | Purpose |
|---|---|---|
| **C++ core** (`codes/maze_solver.cpp`) | C++17 | Reference implementation. Reads a maze file, runs all 4 algorithms, prints the comparison table and the solved maze. Also generates mazes. |
| **Web interface** (`index.html`, `style.css`, `script.js`) | HTML, CSS, JavaScript | Interactive part: draw walls, watch the search animate, run a live race of all 4 algorithms, compare results. |

Both use the **same maze text format**, so any maze can be solved in both and the results checked against each other (see section 8).

## 4. How to Run

### Web interface
Put the files together and open `index.html` in any browser. No installation is needed.

### C++ program
```bash
cd codes
g++ -O2 -std=c++17 maze_solver.cpp -o maze_solver

./maze_solver ../test_files/02_weighted_trap.txt          # solve (shows the A* path)
./maze_solver ../test_files/02_weighted_trap.txt bfs      # show the BFS path instead
./maze_solver --generate 31 5 1 10 > mymaze.txt           # make a maze: size seed weighted(0/1) extra-openings%
```
(On Windows use `maze_solver.exe` instead of `./maze_solver`.)

### Using the same maze in both
In the web page open **Import / export maze (text)**. Press *Show current maze as text*, save it as a `.txt` file, then run it with the C++ program. In the other direction, *Load maze from text* (or open a `.txt` file) loads a maze made by the C++ program. The web page needs a square maze from 5 to 81 cells wide; the C++ program accepts any rectangle.

## 5. Maze Format
```
#    wall
.    open cell (cost 1)
2-9  open cell with that cost to enter (rough terrain)
S    start        E    end
```
The maze is a grid. Movement is 4-directional (up, down, left, right). The cost of a path is the sum of the costs of the cells it enters.

## 6. Algorithms
| Algorithm | Idea | Data structure | Shortest path? |
|---|---|---|---|
| BFS | Explore level by level | Queue | Fewest steps. Optimal in cost only when all cells cost the same. |
| DFS | Go as deep as possible, then backtrack | Stack | No |
| Dijkstra | Always expand the cell with the lowest cost so far g(n) | Min-heap | Yes, lowest cost |
| A* | Expand the lowest g(n) + h(n), h = Manhattan distance to the end | Min-heap | Yes, since h never overestimates |

Each algorithm remembers, for every cell, the cell it came from. When the end is reached, the path is rebuilt by following these links backwards.

## 7. Complexity
V = open cells, E = connections between them (about 4V on a grid).

| Algorithm | Time | Space |
|---|---|---|
| BFS | O(V + E) | O(V) |
| DFS | O(V + E) | O(V) |
| Dijkstra | O((V + E) log V) | O(V) |
| A* | O((V + E) log V) worst case, usually far fewer nodes | O(V) |

## 8. Testing and Results
Results from the C++ program on the files in `test_files/` (steps / cost / nodes explored):

| Test file | BFS | DFS | Dijkstra | A* | What it shows |
|---|---|---|---|---|---|
| 01_small_single_path | 28 / 28 / 31 | 28 / 28 / 31 | 28 / 28 / 31 | 28 / 28 / 31 | One route only, so all algorithms agree |
| 02_weighted_trap | 6 / **46** / 13 | 6 / **46** / 7 | 18 / **18** / 21 | 18 / **18** / 20 | BFS and DFS take the short route through costly cells; Dijkstra and A* find the cheapest |
| 03_no_path | none | none | none | none | The end is walled off, so every algorithm reports "No path" |
| 04_open_field | 36 / 36 / 361 | 360 / 360 / 361 | 36 / 36 / 361 | 36 / 36 / 361 | No walls. DFS wanders and finds a path 10 times longer |
| 05_medium_weighted | 52 / 117 / 272 | 144 / 320 / 311 | 52 / **102** / 250 | 52 / **102** / 126 | BFS has the same steps as Dijkstra but a higher cost; A* explores about half as many cells |
| 06_large_maze | 134 / 134 / 1318 | 486 / 486 / 1168 | 134 / 134 / 1318 | 134 / 134 / 809 | A* explores about 40% fewer cells on a large maze |

**Cross-check:** every test maze was also solved by the web version. Steps and cost matched the C++ program exactly for all four algorithms, and BFS and DFS explored exactly the same number of cells. Dijkstra and A* can differ by a few explored cells, because the two heaps break ties between equal-priority cells differently. The web version was also run on 400 random mazes: Dijkstra and A* always had the same cost, and neither was ever worse than BFS or DFS.

### Benchmark on random mazes
`node tests/benchmark.js` solves 100 random mazes for each size (800 mazes in total) and averages the results. Summary for **41 x 41** mazes:

| Maze type | Algorithm | Avg steps | Avg cost | Avg nodes explored | Avg time (ms) | Found the cheapest path |
|---|---|---|---|---|---|---|
| Unweighted | BFS | 99.1 | 99.1 | 802 | 0.25 | 100% |
| Unweighted | DFS | 289.4 | 289.4 | 636 | 0.26 | 0% |
| Unweighted | Dijkstra | 99.1 | 99.1 | 803 | 0.57 | 100% |
| Unweighted | A* | 99.1 | 99.1 | **430** | 0.47 | 100% |
| Weighted | BFS | 97.5 | 229.8 | 790 | 0.25 | 10% |
| Weighted | DFS | 303.1 | 705.7 | 640 | 0.25 | 0% |
| Weighted | Dijkstra | 100.2 | **218.8** | 781 | 0.55 | 100% |
| Weighted | A* | 100.3 | **218.8** | 689 | 0.76 | 100% |

`node tests/edge_cases.js` checks two special cases on 100 mazes: a maze with only one route gives the identical path from all four algorithms (100/100), and a blocked end cell gives "no path" from all four (100/100).

(Timings were measured in JavaScript on one machine, so only compare them with each other.)

## 9. Observations
- **BFS** gives the fewest steps, but on weighted mazes it can have a higher cost than Dijkstra.
- **DFS** finds a path quickly but it is usually long and not optimal.
- **Dijkstra and A\*** always give the minimum cost.
- **A\*** explores fewer cells than Dijkstra because the heuristic steers it toward the goal. This is the main benefit of an informed search.
- **Fewer nodes does not always mean less time.** A* explores up to 45% fewer cells than Dijkstra, but in the benchmark BFS is the fastest in milliseconds, because a plain queue is cheaper per cell than a heap. A* wins on nodes explored; BFS wins on speed when the maze is unweighted. On weighted mazes only Dijkstra and A* are guaranteed to give the cheapest path, and BFS found it in only 10% of 41 x 41 mazes.
- Execution times on small mazes are tiny, so each algorithm is run 30 times and averaged.

## 10. Limitations and Future Scope
- Only 4-directional movement; the heuristic would change for diagonal moves.
- Fixed start and end in generated mazes (imported mazes can place S and E anywhere).
- Future work: diagonal moves, other heuristics (Euclidean, Chebyshev), bidirectional search, Greedy Best-First comparison, compiling the C++ core to WebAssembly so the page runs it directly.
