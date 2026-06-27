import React, { useState, useEffect } from 'react';
import { Play, Square, RotateCcw } from 'lucide-react';

export default function Containers() {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchContainers = async () => {
    setLoading(true);
    try {
      // Use Docker's Go templating to format output as JSON
      const cmd = `docker ps -a --format '{"id":"{{.ID}}", "image":"{{.Image}}", "name":"{{.Names}}", "status":"{{.Status}}", "state":"{{.State}}"}'`;
      const output = await window.api.sshExec(cmd);
      
      const lines = output.trim().split('\n').filter(Boolean);
      const parsed = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch(e) {
          return null;
        }
      }).filter(Boolean);
      
      setContainers(parsed);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContainers();
  }, []);

  const getStatusColor = (state) => {
    return state.toLowerCase() === 'running' ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10';
  };

  return (
    <div className="p-8 h-full flex flex-col">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-100">Docker Containers</h2>
          <p className="text-gray-400 mt-2">Manage running and stopped instances</p>
        </div>
        <button 
          onClick={fetchContainers}
          className="p-3 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors flex items-center gap-2 text-gray-200"
        >
          <RotateCcw size={18} /> Refresh
        </button>
      </header>

      <div className="flex-1 glass-panel overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">Loading container states...</div>
        ) : (
          <div className="overflow-y-auto">
            <table className="w-full text-left">
              <thead className="bg-dark-900 border-b border-dark-700 sticky top-0">
                <tr>
                  <th className="p-4 text-gray-400 font-medium">Name</th>
                  <th className="p-4 text-gray-400 font-medium">Image</th>
                  <th className="p-4 text-gray-400 font-medium">State</th>
                  <th className="p-4 text-gray-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {containers.map((c, idx) => (
                  <tr key={c.id} className="border-b border-dark-700/50 hover:bg-dark-700/30 transition-colors">
                    <td className="p-4 font-medium text-gray-200">{c.name}</td>
                    <td className="p-4 text-gray-400 font-mono text-sm">{c.image}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(c.state)}`}>
                        {c.state.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-gray-400 text-sm">{c.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {containers.length === 0 && (
              <div className="text-center p-12 text-gray-500">No Docker containers found.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
