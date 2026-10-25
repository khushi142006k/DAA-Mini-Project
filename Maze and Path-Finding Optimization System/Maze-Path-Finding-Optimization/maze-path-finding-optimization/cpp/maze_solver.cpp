#include <algorithm>
#include <chrono>
#include <cmath>
#include <iomanip>
#include <iostream>
#include <limits>
#include <queue>
#include <string>
#include <vector>
using namespace std;
using Clock = chrono::high_resolution_clock;

struct Result { string name; bool found=false; vector<int> path, explored; double ms=0; };
struct Item { int id, g, f; };
struct ByPriority { bool operator()(const Item& a,const Item& b) const { return a.f>b.f || (a.f==b.f && a.g>b.g); } };

class MazeSolver {
    int rows, cols, start, goal;
    vector<string> grid;
    int heuristic(int id) const { return abs(id/cols-goal/cols)+abs(id%cols-goal%cols); }
    vector<int> neighbors(int id) const {
        int r=id/cols,c=id%cols; vector<int> out;
        if(r>0)out.push_back(id-cols); if(c+1<cols)out.push_back(id+1);
        if(r+1<rows)out.push_back(id+cols); if(c>0)out.push_back(id-1);
        vector<int> valid; for(int n:out)if(grid[n/cols][n%cols]!='#')valid.push_back(n); return valid;
    }
    vector<int> reconstruct(const vector<int>& parent) const {
        vector<int> p; if(parent[goal]==-2 && start!=goal)return p;
        for(int cur=goal;cur!=-1;cur=parent[cur]){p.push_back(cur);if(cur==start)break;}
        if(p.empty()||p.back()!=start)return {}; reverse(p.begin(),p.end());return p;
    }
public:
    MazeSolver(vector<string> g,int s,int t):rows((int)g.size()),cols((int)g[0].size()),start(s),goal(t),grid(move(g)){}
    Result run(const string& algo) {
        Result res;res.name=algo;auto t0=Clock::now();int n=rows*cols;
        vector<int> parent(n,-2),dist(n,numeric_limits<int>::max());parent[start]=-1;dist[start]=0;bool found=false;
        if(algo=="BFS"||algo=="DFS"){
            vector<int> st{start};vector<char> seen(n,false);seen[start]=true;size_t head=0;
            while(algo=="BFS"?head<st.size():!st.empty()){
                int cur;if(algo=="BFS")cur=st[head++];else{cur=st.back();st.pop_back();}
                if(cur!=start)res.explored.push_back(cur);if(cur==goal){found=true;break;}
                auto ns=neighbors(cur);if(algo=="DFS")reverse(ns.begin(),ns.end());
                for(int v:ns)if(!seen[v]){seen[v]=true;parent[v]=cur;dist[v]=dist[cur]+1;st.push_back(v);}
            }
        } else {
            priority_queue<Item,vector<Item>,ByPriority> pq;pq.push({start,0,algo=="A*"?heuristic(start):0});
            while(!pq.empty()){
                Item it=pq.top();pq.pop();int cur=it.id;if(it.g!=dist[cur])continue;
                if(cur!=start)res.explored.push_back(cur);if(cur==goal){found=true;break;}
                for(int v:neighbors(cur)){int ng=dist[cur]+1;if(ng<dist[v]){dist[v]=ng;parent[v]=cur;int h=algo=="A*"?heuristic(v):0;pq.push({v,ng,ng+h});}}
            }
        }
        res.found=found;if(found)res.path=reconstruct(parent);
        res.ms=chrono::duration<double,milli>(Clock::now()-t0).count();return res;
    }
};

int main(){
    ios::sync_with_stdio(false);cin.tie(nullptr);
    int rows,cols;cout<<"Maze and Path-Finding Optimization System (C++)\n";
    cout<<"Enter rows and columns: ";if(!(cin>>rows>>cols)||rows<1||cols<1||rows>200||cols>200){cerr<<"Invalid dimensions (1..200).\n";return 1;}
    cout<<"Enter maze rows using '.' for open cells and '#' for walls.\n";
    cout<<"Start and goal are entered as row column (1-based).\n";
    vector<string> grid(rows);for(int r=0;r<rows;r++){cin>>grid[r];if((int)grid[r].size()!=cols){cerr<<"Each row must contain exactly "<<cols<<" characters.\n";return 1;}for(char ch:grid[r])if(ch!='.'&&ch!='#'){cerr<<"Only '.' and '#' are allowed.\n";return 1;}}
    int sr,sc,gr,gc;cout<<"Start row column: ";cin>>sr>>sc;cout<<"Goal row column: ";cin>>gr>>gc;
    if(sr<1||sr>rows||gr<1||gr>rows||sc<1||sc>cols||gc<1||gc>cols){cerr<<"Start/goal is outside the maze.\n";return 1;}
    int start=(sr-1)*cols+sc-1,goal=(gr-1)*cols+gc-1;grid[sr-1][sc-1]='.';grid[gr-1][gc-1]='.';
    MazeSolver solver(grid,start,goal);vector<Result> results;
    for(string algo:{"BFS","DFS","Dijkstra","A*"})results.push_back(solver.run(algo));
    cout<<"\n"<<left<<setw(12)<<"Algorithm"<<setw(12)<<"Found"<<setw(15)<<"Path steps"<<setw(18)<<"Nodes explored"<<"Time (ms)\n";
    cout<<string(68,'-')<<"\n";for(const auto&r:results){cout<<left<<setw(12)<<r.name<<setw(12)<<(r.found?"Yes":"No")<<setw(15)<<(r.found?to_string((int)r.path.size()-1):"-")<<setw(18)<<r.explored.size()<<fixed<<setprecision(4)<<r.ms<<"\n";}
    auto best=find_if(results.begin(),results.end(),[](const Result&r){return r.name=="A*";});
    cout<<"\nA* path coordinates (row,column): ";if(best!=results.end()&&best->found){for(size_t i=0;i<best->path.size();i++){int id=best->path[i];cout<<"("<<id/cols+1<<","<<id%cols+1<<")"<<(i+1<best->path.size()?" -> ":"");}}else cout<<"No path found.";cout<<"\n";
    cout<<"\nComplexity summary (V=cells, E=valid neighbor links):\nBFS/DFS: O(V+E) time and O(V) space.\nDijkstra: O((V+E) log V) time with a priority queue.\nA*: priority-queue search; worst-case performance depends on heuristic and maze.\n";
    return 0;
}
