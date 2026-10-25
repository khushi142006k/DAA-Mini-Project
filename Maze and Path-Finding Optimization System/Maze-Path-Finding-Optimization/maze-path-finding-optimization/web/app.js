(() => {
  'use strict';
  const ROWS = 17, COLS = 25;
  const mazeEl = document.getElementById('maze');
  const algorithmEl = document.getElementById('algorithm');
  const statusEl = document.getElementById('status');
  const comparisonBody = document.getElementById('comparisonBody');
  let walls = new Set(), start = 2 * COLS + 2, end = 14 * COLS + 22;
  let tool = 'wall', dragging = false, lastCell = -1, busy = false;
  const names = {bfs:'BFS', dfs:'DFS', dijkstra:'Dijkstra', astar:'A* Search'};
  const descriptions = {bfs:'Level-by-level search',dfs:'Depth-first exploration',dijkstra:'Lowest-cost-first search',astar:'Cost + heuristic search'};
  const cells = [];
  function index(r,c){return r*COLS+c} function rc(i){return [Math.floor(i/COLS),i%COLS]}
  function neighbors(i){const [r,c]=rc(i), out=[];if(r>0)out.push(i-COLS);if(c<COLS-1)out.push(i+1);if(r<ROWS-1)out.push(i+COLS);if(c>0)out.push(i-1);return out.filter(n=>!walls.has(n))}
  function renderGrid(){mazeEl.innerHTML='';cells.length=0;mazeEl.style.gridTemplateColumns=`repeat(${COLS},minmax(13px,1fr))`;for(let i=0;i<ROWS*COLS;i++){const el=document.createElement('div');el.className='cell';el.dataset.index=i;el.setAttribute('role','gridcell');el.setAttribute('aria-label',`Row ${rc(i)[0]+1}, column ${rc(i)[1]+1}`);el.addEventListener('pointerdown',e=>{if(busy)return;e.preventDefault();dragging=true;lastCell=-1;applyTool(i)});el.addEventListener('pointerenter',()=>{if(dragging&&!busy)applyTool(i)});mazeEl.appendChild(el);cells.push(el)}draw()}
  function draw(){for(let i=0;i<cells.length;i++){const el=cells[i];el.className='cell';if(walls.has(i))el.classList.add('wall');if(i===start)el.className='cell start';if(i===end)el.className='cell end'}}
  function clearVisualization(){cells.forEach(el=>{el.classList.remove('visited','path')})}
  function applyTool(i){if(i===lastCell)return;lastCell=i;if(tool==='start'){if(i===end)return;start=i;walls.delete(i);clearVisualization();draw()}else if(tool==='end'){if(i===start)return;end=i;walls.delete(i);clearVisualization();draw()}else if(i===start||i===end)return;else if(tool==='wall'){walls.add(i);clearVisualization();draw()}else if(tool==='erase'){walls.delete(i);clearVisualization();draw()}}
  window.addEventListener('pointerup',()=>{dragging=false;lastCell=-1});
  function heuristic(a,b){const [ar,ac]=rc(a),[br,bc]=rc(b);return Math.abs(ar-br)+Math.abs(ac-bc)}
  function search(type){const t0=performance.now(), total=ROWS*COLS, parent=new Int32Array(total).fill(-1), dist=new Float64Array(total).fill(Infinity), seen=new Uint8Array(total), explored=[];dist[start]=0;let found=false;
    if(type==='bfs'||type==='dfs'){
      const structure=[start];seen[start]=1;let head=0;
      while(type==='bfs'?head<structure.length:structure.length>0){const cur=type==='bfs'?structure[head++]:structure.pop();if(cur!==start)explored.push(cur);if(cur===end){found=true;break}const ns=neighbors(cur);if(type==='dfs')ns.reverse();for(const n of ns){if(!seen[n]){seen[n]=1;parent[n]=cur;dist[n]=dist[cur]+1;structure.push(n)}}}
    }else{
      // Binary-heap-free priority list keeps this educational implementation compact; graph size is small.
      const open=[{i:start,p:type==='astar'?heuristic(start,end):0,g:0}];seen[start]=1;
      while(open.length){open.sort((a,b)=>a.p-b.p||a.g-b.g);const item=open.shift(),cur=item.i;if(item.g!==dist[cur])continue;if(cur!==start)explored.push(cur);if(cur===end){found=true;break}for(const n of neighbors(cur)){const ng=dist[cur]+1;if(ng<dist[n]){dist[n]=ng;parent[n]=cur;seen[n]=1;open.push({i:n,g:ng,p:ng+(type==='astar'?heuristic(n,end):0)})}}}
    }
    let path=[];if(found){let cur=end;while(cur!==-1){path.push(cur);if(cur===start)break;cur=parent[cur]}if(path[path.length-1]!==start){path=[];found=false}else path.reverse()}
    return {type,found,path,explored,pathLength:found?path.length-1:null,time:performance.now()-t0};
  }
  function formatTime(ms){return ms<1?`${ms.toFixed(3)} ms`:`${ms.toFixed(2)} ms`}
  function showResult(result){clearVisualization();result.explored.forEach(i=>{if(i!==start&&i!==end)cells[i].classList.add('visited')});result.path.forEach(i=>cells[i].classList.add('path'));cells[start].classList.add('start');cells[end].classList.add('end');document.getElementById('metricAlgo').textContent=names[result.type];document.getElementById('metricAlgoNote').textContent=descriptions[result.type];document.getElementById('metricPath').textContent=result.found?result.pathLength:'No path';document.getElementById('metricNodes').textContent=result.explored.length.toLocaleString();document.getElementById('metricTime').textContent=formatTime(result.time);statusEl.textContent=result.found?`Path found · ${result.pathLength} steps`:'No path exists';statusEl.className='status '+(result.found?'good':'');}
  function renderComparison(results){comparisonBody.innerHTML='';for(const r of results){const tr=document.createElement('tr');const cellsData=[names[r.type],r.found?'Yes':'No',r.found?String(r.pathLength):'—',String(r.explored.length),formatTime(r.time),({bfs:'Shortest path (unit cost)',dfs:'Not guaranteed optimal',dijkstra:'Optimal (non-negative cost)',astar:'Optimal with admissible heuristic'})[r.type]];cellsData.forEach((v,i)=>{const td=document.createElement('td');td.textContent=v;if(i===1){td.className=r.found?'found':'not-found'}if(i===0)td.style.color=({bfs:'#6857e8',dfs:'#d47a43',dijkstra:'#229d90',astar:'#526bc5'})[r.type];tr.appendChild(td)});comparisonBody.appendChild(tr)}}
  function runSelected(){if(busy)return;const r=search(algorithmEl.value);showResult(r);renderComparison([r])}
  function compareAll(){if(busy)return;const results=['bfs','dfs','dijkstra','astar'].map(search);renderComparison(results);const selected=results.find(r=>r.type===algorithmEl.value)||results[0];showResult(selected);statusEl.textContent='Comparison complete · 4 algorithms';statusEl.className='status good'}
  document.querySelectorAll('.tool').forEach(btn=>btn.addEventListener('click',()=>{tool=btn.dataset.tool;document.querySelectorAll('.tool').forEach(b=>b.classList.toggle('active',b===btn));statusEl.textContent=({wall:'Draw walls selected',erase:'Erase selected',start:'Click a cell to move start',end:'Click a cell to move target'})[tool];statusEl.className='status'}));
  document.getElementById('runBtn').addEventListener('click',runSelected);document.getElementById('compareBtn').addEventListener('click',compareAll);
  document.getElementById('clearBtn').addEventListener('click',()=>{walls.clear();clearVisualization();draw();statusEl.textContent='Walls cleared';statusEl.className='status'});
  document.getElementById('resetBtn').addEventListener('click',()=>{clearVisualization();draw();statusEl.textContent='Visualization reset';statusEl.className='status'});
  document.getElementById('randomBtn').addEventListener('click',()=>{walls.clear();for(let i=0;i<ROWS*COLS;i++){if(i!==start&&i!==end&&Math.random()<.27)walls.add(i)}// Keep a guaranteed corridor to make the generated maze useful.
    let cur=start;const [sr,sc]=rc(start),[er,ec]=rc(end);for(let c=Math.min(sc,ec);c<=Math.max(sc,ec);c++)walls.delete(index(sr,c));for(let r=Math.min(sr,er);r<=Math.max(sr,er);r++)walls.delete(index(r,ec));clearVisualization();draw();statusEl.textContent='Random maze generated';statusEl.className='status'});
  algorithmEl.addEventListener('change',()=>{if(comparisonBody.children.length&&comparisonBody.querySelector('.empty')===null){/* selection takes effect on next run */}});
  document.getElementById('dimensions').textContent=`${COLS} × ${ROWS}`;renderGrid();
})();
