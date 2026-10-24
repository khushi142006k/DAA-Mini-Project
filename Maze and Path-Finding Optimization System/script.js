/* Maze and Path-Finding Optimization System
   grid[r][c] = 0  -> wall
   grid[r][c] >= 1 -> open cell; the number is the cost of ENTERING that cell */

const $ = id => document.getElementById(id);
const cv = $('maze'), ctx = cv.getContext('2d');
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

let N = 25, grid = [], S = [1, 1], E = [23, 23];
let vis = null, pth = null;      // overlay layers: explored cells and final path
let results = [], busy = false;

const id = (r, c) => r * N + c;
const rc = v => [Math.floor(v / N), v % N];

/* ---------------- MAZE GENERATION (randomized DFS / backtracker) ---------------- */
function newMaze() {
  N = +$('size').value;
  grid = Array.from({ length: N }, () => Array(N).fill(0));
  grid[1][1] = 1;
  const stack = [[1, 1]];
  while (stack.length) {
    const [r, c] = stack[stack.length - 1];
    const opts = DIRS.map(([dr, dc]) => [r + 2 * dr, c + 2 * dc, dr, dc])
      .filter(([a, b]) => a > 0 && b > 0 && a < N - 1 && b < N - 1 && !grid[a][b]);
    if (!opts.length) { stack.pop(); continue; }
    const [a, b, dr, dc] = opts[Math.floor(Math.random() * opts.length)];
    grid[r + dr][c + dc] = 1;
    grid[a][b] = 1;
    stack.push([a, b]);
  }
  // knock down some walls so several routes exist (a perfect maze has only one path)
  const p = +$('loops').value / 100;
  for (let r = 1; r < N - 1; r++)
    for (let c = 1; c < N - 1; c++)
      if (!grid[r][c] && Math.random() < p &&
          ((grid[r - 1][c] && grid[r + 1][c]) || (grid[r][c - 1] && grid[r][c + 1]))) grid[r][c] = 1;
  if ($('weighted').checked)
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++)
        if (grid[r][c]) grid[r][c] = Math.random() < 0.55 ? 1 : 2 + Math.floor(Math.random() * 5);
  S = [1, 1]; E = [N - 2, N - 2];
  grid[S[0]][S[1]] = 1; grid[E[0]][E[1]] = 1;
  resetResults();
}

/* ---------------- HELPERS ---------------- */
function nbrs(u) {
  const [r, c] = rc(u), out = [];
  for (const [dr, dc] of DIRS) {
    const a = r + dr, b = c + dc;
    if (a >= 0 && b >= 0 && a < N && b < N && grid[a][b]) out.push(id(a, b));
  }
  return out;
}
const cost = v => { const [r, c] = rc(v); return grid[r][c]; };
const manhattan = v => { const [r, c] = rc(v); return Math.abs(r - E[0]) + Math.abs(c - E[1]); };

class MinHeap {                       // binary heap of [key, value]
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(k, v) {
    const a = this.a; a.push([k, v]);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p][0] <= a[i][0]) break;
      [a[p], a[i]] = [a[i], a[p]]; i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last; let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]]; i = m;
      }
    }
    return top;
  }
}

// rebuild the path by following parent pointers back from the end cell
function finish(name, order, prev) {
  const t = id(...E);
  const found = order.length > 0 && order[order.length - 1] === t;
  let path = [], total = 0;
  if (found) {
    for (let v = t; v !== -1; v = prev[v]) path.push(v);
    path.reverse();
    for (let i = 1; i < path.length; i++) total += cost(path[i]);
  }
  return { name, order, path, found, cost: total, steps: found ? path.length - 1 : 0, explored: order.length };
}

/* ---------------- ALGORITHMS ---------------- */
function bfs() {
  const s = id(...S), t = id(...E);
  const prev = new Int32Array(N * N).fill(-1), seen = new Uint8Array(N * N), order = [], q = [s];
  seen[s] = 1;
  for (let h = 0; h < q.length; h++) {         // head index = O(1) dequeue
    const u = q[h]; order.push(u);
    if (u === t) break;
    for (const v of nbrs(u)) if (!seen[v]) { seen[v] = 1; prev[v] = u; q.push(v); }
  }
  return finish('BFS', order, prev);
}

function dfs() {
  const s = id(...S), t = id(...E);
  const prev = new Int32Array(N * N).fill(-1), seen = new Uint8Array(N * N), order = [], stack = [[s, -1]];
  while (stack.length) {
    const [u, p] = stack.pop();
    if (seen[u]) continue;
    seen[u] = 1; prev[u] = p; order.push(u);
    if (u === t) break;
    for (const v of nbrs(u)) if (!seen[v]) stack.push([v, u]);
  }
  return finish('DFS', order, prev);
}

function dijkstra() {
  const s = id(...S), t = id(...E);
  const prev = new Int32Array(N * N).fill(-1), dist = new Float64Array(N * N).fill(Infinity);
  const done = new Uint8Array(N * N), order = [], pq = new MinHeap();
  dist[s] = 0; pq.push(0, s);
  while (pq.size) {
    const [d, u] = pq.pop();
    if (done[u]) continue;
    done[u] = 1; order.push(u);
    if (u === t) break;
    for (const v of nbrs(u)) {
      const nd = d + cost(v);
      if (nd < dist[v]) { dist[v] = nd; prev[v] = u; pq.push(nd, v); }
    }
  }
  return finish('Dijkstra', order, prev);
}

function astar() {                    // same as Dijkstra, but ordered by g(n) + h(n)
  const s = id(...S), t = id(...E);
  const prev = new Int32Array(N * N).fill(-1), g = new Float64Array(N * N).fill(Infinity);
  const done = new Uint8Array(N * N), order = [], pq = new MinHeap();
  g[s] = 0; pq.push(manhattan(s), s);
  while (pq.size) {
    const u = pq.pop()[1];
    if (done[u]) continue;
    done[u] = 1; order.push(u);
    if (u === t) break;
    for (const v of nbrs(u)) {
      const ng = g[u] + cost(v);
      if (ng < g[v]) { g[v] = ng; prev[v] = u; pq.push(ng + manhattan(v), v); }
    }
  }
  return finish('A*', order, prev);
}

const ALGOS = { 'BFS': bfs, 'DFS': dfs, 'Dijkstra': dijkstra, 'A*': astar };

function timed(fn, reps = 30) {       // average runtime over many runs for a stable number
  let r; const t0 = performance.now();
  for (let i = 0; i < reps; i++) r = fn();
  r.ms = (performance.now() - t0) / reps;
  return r;
}

/* ---------------- DRAWING ---------------- */
function draw() {
  const k = cv.width / N;
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++) {
      const w = grid[r][c], v = id(r, c);
      ctx.fillStyle = !w ? '#14213d' : `hsl(45,30%,${96 - (w - 1) * 9}%)`;
      ctx.fillRect(c * k, r * k, k, k);
      if (w && vis && vis[v]) { ctx.fillStyle = 'rgba(11,114,144,.5)'; ctx.fillRect(c * k, r * k, k, k); }
      if (w && pth && pth[v]) { ctx.fillStyle = '#f59f00'; ctx.fillRect(c * k, r * k, k, k); }
    }
  ctx.fillStyle = '#2f9e44'; ctx.fillRect(S[1] * k, S[0] * k, k, k);
  ctx.fillStyle = '#e03131'; ctx.fillRect(E[1] * k, E[0] * k, k, k);
  if ($('weighted').checked && k > 14) {
    ctx.fillStyle = '#14213d'; ctx.font = `${k * 0.5}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++)
      if (grid[r][c] > 1 && !(pth && pth[id(r, c)])) ctx.fillText(grid[r][c], (c + .5) * k, (r + .5) * k);
  }
}

function resetOverlay() { vis = new Uint8Array(N * N); pth = new Uint8Array(N * N); }
function resetResults() {
  resetOverlay(); results = []; draw();
  $('single').innerHTML = '';
  $('cmp').tBodies[0].innerHTML = '<tr><td colspan="7" class="empty">Press "Run all and compare".</td></tr>';
}

const frame = () => new Promise(requestAnimationFrame);

async function animate(r) {
  resetOverlay();
  const per = +$('speed').value;
  for (let i = 0; i < r.order.length; i += per) {
    for (let j = i; j < Math.min(i + per, r.order.length); j++) vis[r.order[j]] = 1;
    draw(); await frame();
  }
  for (let i = 0; i < r.path.length; i++) { pth[r.path[i]] = 1; if (i % 2 === 0) { draw(); await frame(); } }
  draw();
}

function showStatic(r) {                // instant display (used by comparison table)
  resetOverlay();
  r.order.forEach(v => vis[v] = 1);
  r.path.forEach(v => pth[v] = 1);
  draw();
}

/* ---------------- RESULTS ---------------- */
function showSingle(r) {
  $('single').innerHTML = r.found
    ? `<div>Path length<b>${r.steps}</b></div><div>Path cost<b>${r.cost}</b></div>
       <div>Nodes explored<b>${r.explored}</b></div><div>Time<b>${r.ms.toFixed(3)} ms</b></div>`
    : `<div class="msg"><b>No path found</b>The end cell is blocked off by walls.</div>`;
}

function showTable() {
  const found = results.filter(r => r.found);
  const best = found.length ? Math.min(...found.map(r => r.cost)) : 0;
  const maxEx = Math.max(...results.map(r => r.explored), 1);
  const fastest = found.length ? Math.min(...found.map(r => r.ms)) : 0;
  $('cmp').tBodies[0].innerHTML = results.map((r, i) => `
    <tr data-i="${i}">
      <td><b>${r.name}</b></td>
      <td>${r.found ? 'Yes' : 'No'}</td>
      <td>${r.found ? r.steps : '-'}</td>
      <td>${r.found ? r.cost : '-'}</td>
      <td><span class="bar" style="width:${Math.round(80 * r.explored / maxEx)}px"></span>${r.explored}</td>
      <td>${r.ms.toFixed(3)}${r.found && r.ms === fastest ? ' (fastest)' : ''}</td>
      <td>${!r.found ? '<span class="tag bad">No path</span>'
          : r.cost === best ? '<span class="tag good">Optimal</span>' : '<span class="tag bad">Not optimal</span>'}</td>
    </tr>`).join('');
}

/* ---------------- EVENTS ---------------- */
function setBusy(b) { busy = b; ['btnNew', 'btnRun', 'btnAll', 'btnClear'].forEach(i => $(i).disabled = b); }

$('btnNew').onclick = newMaze_;
function newMaze_() { newMaze(); }
$('size').onchange = newMaze_;
$('weighted').onchange = newMaze_;
$('loops').oninput = () => $('loopsOut').textContent = $('loops').value;
$('loops').onchange = newMaze_;

$('btnRun').onclick = async () => {
  if (busy) return;
  setBusy(true);
  const r = timed(ALGOS[$('algo').value]);
  await animate(r);
  showSingle(r);
  setBusy(false);
};

$('btnAll').onclick = () => {
  if (busy) return;
  results = Object.values(ALGOS).map(f => timed(f));
  showTable();
  showStatic(results[results.length - 1]);
  showSingle(results[results.length - 1]);
};

$('cmp').tBodies[0].onclick = e => {
  const tr = e.target.closest('tr[data-i]');
  if (tr && !busy) { const r = results[+tr.dataset.i]; showStatic(r); showSingle(r); }
};

$('btnClear').onclick = () => { if (!busy) { resetOverlay(); draw(); $('single').innerHTML = ''; } };

// click or drag on the canvas to draw / erase walls
let painting = null;
function cellAt(e) {
  const b = cv.getBoundingClientRect();
  return [Math.floor((e.clientY - b.top) / b.height * N), Math.floor((e.clientX - b.left) / b.width * N)];
}
function paint(e) {
  const [r, c] = cellAt(e);
  if (r < 0 || c < 0 || r >= N || c >= N) return;
  if ((r === S[0] && c === S[1]) || (r === E[0] && c === E[1])) return;
  const val = painting ? 1 : 0;
  if ((grid[r][c] > 0) === (val === 1)) return;   // already in that state
  grid[r][c] = val;
  resetOverlay(); draw();
}
cv.addEventListener('pointerdown', e => {
  if (busy) return;
  const [r, c] = cellAt(e);
  painting = grid[r] && grid[r][c] === 0;      // started on a wall -> erase; else -> build
  cv.setPointerCapture(e.pointerId);
  paint(e);
});
cv.addEventListener('pointermove', e => { if (painting !== null && !busy) paint(e); });
cv.addEventListener('pointerup', () => {
  if (painting !== null) { painting = null; results = []; $('single').innerHTML = ''; }
});

newMaze();
