# DAA-Mini-Project

# Maze and Path-Finding Optimization System

## 1. Problem Statement
Design and develop an interactive maze-solving system that finds optimal paths from a source to a destination using BFS, DFS, Dijkstra's algorithm and A*, and compares the algorithms on path length, execution time and number of nodes explored.

## 2. Technologies
HTML (structure), CSS (styling), JavaScript (algorithms, maze generation, canvas animation). No libraries or server needed.

## 3. How to Run
Download the folder and open `index.html` in any browser.

```
Maze-Pathfinding-Project/
  index.html   page layout, controls, tables
  style.css    styling
  script.js    maze generator + BFS, DFS, Dijkstra, A* + comparison
  README.md
```

## 4. Maze Model
The maze is an N x N grid. Each cell is a wall (0) or open with a cost (1 or more) to enter it. Movement is 4-directional (up, down, left, right). Start is the top-left open cell and End is the bottom-right open cell. The maze is generated with a randomized DFS (recursive backtracker), then a few extra walls are removed so that several routes exist. With "Weighted terrain" ticked, some cells cost 2 to 6 (darker, with numbers).

## 5. Algorithms
| Algorithm | Idea | Data structure | Shortest path? |
|---|---|---|---|
| BFS | Explore level by level | Queue | Fewest steps (optimal when all costs are equal) |
| DFS | Go as deep as possible, then backtrack | Stack | No |
| Dijkstra | Always expand the cell with the lowest cost so far g(n) | Min-heap | Yes, lowest total cost |
| A* | Expand the lowest g(n) + h(n), where h is the Manhattan distance to the end | Min-heap | Yes (h never overestimates) |

## 6. Complexity
V = open cells, E = connections (about 4V on a grid).

| Algorithm | Time | Space |
|---|---|---|
| BFS | O(V + E) | O(V) |
| DFS | O(V + E) | O(V) |
| Dijkstra | O((V + E) log V) | O(V) |
| A* | O((V + E) log V) worst case, usually far fewer nodes | O(V) |

## 7. Comparison Metrics
- **Path length**: number of steps from start to end.
- **Path cost**: sum of the cell costs along the path (the real "optimal" measure).
- **Nodes explored**: cells taken out of the queue, stack or heap before reaching the end.
- **Time**: average of 30 runs using `performance.now()`.

## 8. What You Should Observe
- DFS explores fewer cells sometimes but returns a long, non-optimal path.
- BFS gives the fewest steps but on a weighted maze it can have a higher cost than Dijkstra.
- Dijkstra and A* always return the same minimum cost, but A* explores fewer cells because the heuristic pulls the search toward the goal.

## 9. Testing
Try these cases: unweighted vs weighted maze; sizes 15 to 61; extra openings at 0% (only one path, so all algorithms return the same path) and 40% (many paths); draw walls to block the end and check "No path found".
The algorithms were also checked on 400 random mazes: Dijkstra and A* always matched in cost and were never worse than BFS or DFS.

## 10. Limitations and Future Scope
- Only 4-directional movement and a fixed start and end.
- Future: diagonal moves, movable start/end, bidirectional search, other heuristics (Euclidean, Chebyshev), Greedy Best-First comparison.
