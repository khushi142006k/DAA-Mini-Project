// Maze and Path-Finding Optimization System  (C++ core)
// Solves a maze with BFS, DFS, Dijkstra and A*, then compares them on
// path length, path cost, nodes explored and execution time.
//
// Maze file format (same as the web interface):
//   #    wall
//   .    open cell, cost 1
//   2-9  open cell, cost = that digit (e.g. rough terrain)
//   S    start        E    end
//
// Build:  g++ -O2 -std=c++17 maze_solver.cpp -o maze_solver
// Solve:  ./maze_solver ../test_files/02_weighted_trap.txt [bfs|dfs|dijkstra|astar]
// Make:   ./maze_solver --generate <size> <seed> <weighted 0/1> <extra-openings %>

#include <algorithm>
#include <array>
#include <chrono>
#include <climits>
#include <cstdio>
#include <fstream>
#include <functional>
#include <iostream>
#include <queue>
#include <random>
#include <string>
#include <vector>
using namespace std;

struct Maze {
    int R = 0, C = 0, s = -1, e = -1;
    vector<vector<int>> w;          // 0 = wall, >=1 = cost of entering the cell
    int id(int r, int c) const { return r * C + c; }
};

struct Result {
    string name;
    bool found = false;
    int steps = 0, explored = 0;
    long long cost = 0;
    double ms = 0;
    vector<int> path, order;        // order = cells explored, in order
};

static const int DR[4] = {1, -1, 0, 0};   // same direction order as the web version
static const int DC[4] = {0, 0, 1, -1};

// ---------- loading ----------
bool loadMaze(const string& file, Maze& m, string& err) {
    ifstream in(file);
    if (!in) { err = "cannot open file " + file; return false; }
    vector<string> lines;
    string line;
    while (getline(in, line)) {
        while (!line.empty() && (line.back() == '\r' || line.back() == ' ')) line.pop_back();
        if (!line.empty()) lines.push_back(line);
    }
    if (lines.empty()) { err = "file is empty"; return false; }
    m.R = lines.size(); m.C = lines[0].size();
    m.w.assign(m.R, vector<int>(m.C, 0));
    int sCount = 0, eCount = 0;
    for (int r = 0; r < m.R; r++) {
        if ((int)lines[r].size() != m.C) { err = "row " + to_string(r + 1) + " has a different length"; return false; }
        for (int c = 0; c < m.C; c++) {
            char ch = lines[r][c];
            if (ch == '#') m.w[r][c] = 0;
            else if (ch == '.') m.w[r][c] = 1;
            else if (ch >= '1' && ch <= '9') m.w[r][c] = ch - '0';
            else if (ch == 'S') { m.w[r][c] = 1; m.s = m.id(r, c); sCount++; }
            else if (ch == 'E') { m.w[r][c] = 1; m.e = m.id(r, c); eCount++; }
            else { err = string("unknown character '") + ch + "' at row " + to_string(r + 1); return false; }
        }
    }
    if (sCount != 1 || eCount != 1) { err = "maze needs exactly one S and one E"; return false; }
    return true;
}

// ---------- helpers ----------
Result finish(const Maze& m, const string& name, vector<int>& order, const vector<int>& prev) {
    Result r; r.name = name; r.order = order; r.explored = order.size();
    r.found = !order.empty() && order.back() == m.e;
    if (r.found) {
        for (int v = m.e; v != -1; v = prev[v]) r.path.push_back(v);
        reverse(r.path.begin(), r.path.end());
        r.steps = r.path.size() - 1;
        for (size_t i = 1; i < r.path.size(); i++) r.cost += m.w[r.path[i] / m.C][r.path[i] % m.C];
    }
    return r;
}

int manhattan(const Maze& m, int v) {
    return abs(v / m.C - m.e / m.C) + abs(v % m.C - m.e % m.C);
}

// calls f(neighbourId, cost) for each open neighbour of cell u
template <class F> void forNeighbours(const Maze& m, int u, F f) {
    int r = u / m.C, c = u % m.C;
    for (int d = 0; d < 4; d++) {
        int a = r + DR[d], b = c + DC[d];
        if (a >= 0 && b >= 0 && a < m.R && b < m.C && m.w[a][b]) f(m.id(a, b), m.w[a][b]);
    }
}

// ---------- the four algorithms ----------
Result bfs(const Maze& m) {                      // queue, explores level by level
    vector<int> prev(m.R * m.C, -1), order, q{m.s};
    vector<char> seen(m.R * m.C, 0);
    seen[m.s] = 1;
    for (size_t h = 0; h < q.size(); h++) {
        int u = q[h]; order.push_back(u);
        if (u == m.e) break;
        forNeighbours(m, u, [&](int v, int) { if (!seen[v]) { seen[v] = 1; prev[v] = u; q.push_back(v); } });
    }
    return finish(m, "BFS", order, prev);
}

Result dfs(const Maze& m) {                      // stack, goes deep first
    vector<int> prev(m.R * m.C, -1), order;
    vector<char> seen(m.R * m.C, 0);
    vector<pair<int, int>> st{{m.s, -1}};
    while (!st.empty()) {
        auto [u, p] = st.back(); st.pop_back();
        if (seen[u]) continue;
        seen[u] = 1; prev[u] = p; order.push_back(u);
        if (u == m.e) break;
        forNeighbours(m, u, [&](int v, int) { if (!seen[v]) st.push_back({v, u}); });
    }
    return finish(m, "DFS", order, prev);
}

Result dijkstra(const Maze& m) {                 // min-heap ordered by cost so far
    typedef pair<long long, int> P;
    vector<int> prev(m.R * m.C, -1), order;
    vector<long long> dist(m.R * m.C, LLONG_MAX);
    vector<char> done(m.R * m.C, 0);
    priority_queue<P, vector<P>, greater<P>> pq;
    dist[m.s] = 0; pq.push({0, m.s});
    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (done[u]) continue;
        done[u] = 1; order.push_back(u);
        if (u == m.e) break;
        forNeighbours(m, u, [&](int v, int w) {
            if (d + w < dist[v]) { dist[v] = d + w; prev[v] = u; pq.push({dist[v], v}); }
        });
    }
    return finish(m, "Dijkstra", order, prev);
}

Result astar(const Maze& m) {                    // min-heap ordered by g(n) + h(n)
    typedef pair<long long, int> P;
    vector<int> prev(m.R * m.C, -1), order;
    vector<long long> g(m.R * m.C, LLONG_MAX);
    vector<char> done(m.R * m.C, 0);
    priority_queue<P, vector<P>, greater<P>> pq;
    g[m.s] = 0; pq.push({manhattan(m, m.s), m.s});
    while (!pq.empty()) {
        int u = pq.top().second; pq.pop();
        if (done[u]) continue;
        done[u] = 1; order.push_back(u);
        if (u == m.e) break;
        forNeighbours(m, u, [&](int v, int w) {
            if (g[u] + w < g[v]) { g[v] = g[u] + w; prev[v] = u; pq.push({g[v] + manhattan(m, v), v}); }
        });
    }
    return finish(m, "A*", order, prev);
}

// run an algorithm many times and average the time (one run is too fast to measure)
Result timed(const Maze& m, function<Result(const Maze&)> f, int reps = 30) {
    Result r;
    auto t0 = chrono::steady_clock::now();
    for (int i = 0; i < reps; i++) r = f(m);
    r.ms = chrono::duration<double, milli>(chrono::steady_clock::now() - t0).count() / reps;
    return r;
}

// ---------- output ----------
void printMaze(const Maze& m, const Result& r) {
    vector<string> g(m.R, string(m.C, ' '));
    for (int i = 0; i < m.R; i++)
        for (int j = 0; j < m.C; j++) {
            int w = m.w[i][j];
            g[i][j] = w == 0 ? '#' : w == 1 ? '.' : char('0' + w);
        }
    for (int v : r.path) g[v / m.C][v % m.C] = '*';
    g[m.s / m.C][m.s % m.C] = 'S';
    g[m.e / m.C][m.e % m.C] = 'E';
    for (auto& row : g) cout << row << "\n";
}

// ---------- maze generator (randomized DFS + extra openings) ----------
void generate(int n, int seed, bool weighted, int loops) {
    if (n < 5) n = 5;
    if (n % 2 == 0) n++;
    mt19937 rng(seed);
    vector<vector<int>> g(n, vector<int>(n, 0));
    g[1][1] = 1;
    vector<pair<int, int>> st{{1, 1}};
    while (!st.empty()) {
        auto [r, c] = st.back();
        vector<array<int, 4>> opts;
        for (int d = 0; d < 4; d++) {
            int a = r + 2 * DR[d], b = c + 2 * DC[d];
            if (a > 0 && b > 0 && a < n - 1 && b < n - 1 && !g[a][b]) opts.push_back({a, b, DR[d], DC[d]});
        }
        if (opts.empty()) { st.pop_back(); continue; }
        auto o = opts[rng() % opts.size()];
        g[r + o[2]][c + o[3]] = 1; g[o[0]][o[1]] = 1;
        st.push_back({o[0], o[1]});
    }
    for (int r = 1; r < n - 1; r++)
        for (int c = 1; c < n - 1; c++)
            if (!g[r][c] && (int)(rng() % 100) < loops &&
                ((g[r - 1][c] && g[r + 1][c]) || (g[r][c - 1] && g[r][c + 1]))) g[r][c] = 1;
    if (weighted)
        for (auto& row : g) for (int& v : row) if (v) v = (rng() % 100 < 55) ? 1 : 2 + rng() % 5;
    for (int r = 0; r < n; r++) {
        for (int c = 0; c < n; c++) {
            if (r == 1 && c == 1) cout << 'S';
            else if (r == n - 2 && c == n - 2) cout << 'E';
            else cout << (g[r][c] == 0 ? '#' : g[r][c] == 1 ? '.' : char('0' + g[r][c]));
        }
        cout << "\n";
    }
}

int main(int argc, char** argv) {
    if (argc >= 2 && string(argv[1]) == "--generate") {
        if (argc < 6) { cerr << "usage: maze_solver --generate <size> <seed> <weighted 0/1> <extra-openings %>\n"; return 1; }
        generate(atoi(argv[2]), atoi(argv[3]), atoi(argv[4]) != 0, atoi(argv[5]));
        return 0;
    }
    if (argc < 2) {
        cerr << "usage: maze_solver <maze_file> [bfs|dfs|dijkstra|astar]\n"
             << "       maze_solver --generate <size> <seed> <weighted 0/1> <extra-openings %>\n";
        return 1;
    }
    Maze m; string err;
    if (!loadMaze(argv[1], m, err)) { cerr << "Error: " << err << "\n"; return 1; }

    vector<Result> res = {timed(m, bfs), timed(m, dfs), timed(m, dijkstra), timed(m, astar)};

    long long best = LLONG_MAX;
    for (auto& r : res) if (r.found) best = min(best, r.cost);

    printf("\nMaze: %d x %d\n\n", m.R, m.C);
    printf("%-10s %-6s %-8s %-8s %-10s %-10s %s\n", "Algorithm", "Found", "Steps", "Cost", "Explored", "Time(ms)", "Result");
    printf("--------------------------------------------------------------------------\n");
    for (auto& r : res) {
        if (r.found)
            printf("%-10s %-6s %-8d %-8lld %-10d %-10.4f %s\n", r.name.c_str(), "Yes", r.steps, r.cost, r.explored, r.ms,
                   r.cost == best ? "Optimal" : "Not optimal");
        else
            printf("%-10s %-6s %-8s %-8s %-10d %-10.4f %s\n", r.name.c_str(), "No", "-", "-", r.explored, r.ms, "No path");
    }

    if (best == LLONG_MAX) { printf("\nNo path exists between S and E.\n"); return 0; }

    string pick = argc >= 3 ? argv[2] : "astar";
    for (auto& ch : pick) ch = tolower(ch);
    int idx = pick == "bfs" ? 0 : pick == "dfs" ? 1 : pick == "dijkstra" ? 2 : 3;
    printf("\nPath found by %s  (* = path)\n\n", res[idx].name.c_str());
    printMaze(m, res[idx]);

    auto fewest = min_element(res.begin(), res.end(), [](const Result& a, const Result& b) {
        return (a.found ? a.explored : INT_MAX) < (b.found ? b.explored : INT_MAX); });
    printf("\nLowest path cost: %lld.  Fewest nodes explored: %s (%d).\n", best, fewest->name.c_str(), fewest->explored);
    return 0;
}
