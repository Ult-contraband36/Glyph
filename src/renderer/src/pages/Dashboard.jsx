import React, { useEffect, useState } from 'react';
import { X, Cpu, MemoryStick, HardDrive, Wifi, ArrowDown, ArrowUp } from 'lucide-react';
import OsLogo from '../components/OsLogo';

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtBytes = (bytes) => {
  const n = parseFloat(bytes) || 0;
  if (n >= 1e9) return (n / 1e9).toFixed(2) + ' GB';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + ' MB';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + ' KB';
  return n.toFixed(0) + ' B';
};

const fmtSpeed = (bps) => {
  const n = parseFloat(bps) || 0;
  if (n >= 1e6) return (n / 1e6).toFixed(1) + ' MB/s';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + ' KB/s';
  return n.toFixed(0) + ' B/s';
};

const parseNet = (raw) => {
  if (!raw) return [];
  return raw.trim().split('\n').map(line => {
    const m = line.match(/^(\S+)\s+RX:(\d+)\s+TX:(\d+)\s+RXS:(\d+)\s+TXS:(\d+)/);
    if (!m) return null;
    return { iface: m[1], rx: m[2], tx: m[3], rxs: m[4], txs: m[5] };
  }).filter(Boolean);
};

// ── Bar helper ────────────────────────────────────────────────────────────────
// inverted=true: high value is GOOD (e.g. Free memory, Swap Free)
const Bar = ({ label, value, max, unit = '', inverted = false }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const score = inverted ? (100 - pct) : pct; // for coloring: low score = good
  const col = score > 90 ? 'bg-red-500' : score > 75 ? 'bg-yellow-500' : 'bg-brand-500';
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{label}</span>
        <span className="font-mono text-gray-200">{value.toFixed(0)}{unit} / {max.toFixed(0)}{unit}</span>
      </div>
      <div className="w-full h-2 bg-dark-700 rounded-full overflow-hidden">
        <div className={`h-2 rounded-full ${col} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

// ── Modal shell ───────────────────────────────────────────────────────────────
function ModalShell({ title, icon, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 bg-dark-900/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-panel w-full max-w-2xl border border-brand-500/30 overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-dark-700 bg-dark-800/50">
          <h3 className="font-semibold text-gray-100 text-lg flex items-center gap-2">{icon}{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-dark-700 rounded-md text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-auto max-h-[75vh]">{children}</div>
      </div>
    </div>
  );
}

// ── CPU Modal ─────────────────────────────────────────────────────────────────
function CpuModal({ raw, cores, temp, onClose }) {
  const lines = (raw || '').split('\n');
  const loadMatch = lines[0] && lines[0].match(/load average:\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
  const tasks = lines.find(l => l.match(/Tasks/i)) || '';

  // Parse per-core data: "cpu0 12.5"
  const coreRows = (cores || '').trim().split('\n').map(line => {
    const m = line.trim().match(/^(cpu\d+)\s+([\d.]+)/);
    return m ? { id: m[1], pct: parseFloat(m[2]) } : null;
  }).filter(Boolean);

  // Parse temperature lines from sensors or /sys/class/thermal
  const tempRows = (temp || '').trim().split('\n').filter(Boolean);

  return (
    <ModalShell title="CPU Details" icon={<Cpu size={20} className="text-brand-400" />} onClose={onClose}>
      {loadMatch && (
        <div className="mb-5">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Load Average</p>
          <div className="grid grid-cols-3 gap-3">
            {['1 min', '5 min', '15 min'].map((l, i) => (
              <div key={l} className="bg-dark-900 rounded-xl p-3 text-center border border-dark-700">
                <p className="text-2xl font-bold text-brand-400">{loadMatch[i + 1]}</p>
                <p className="text-gray-500 text-xs mt-1">{l}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {tasks && <div className="mb-5 text-xs text-gray-300 bg-dark-900 rounded-xl p-3 font-mono border border-dark-700">{tasks.trim()}</div>}

      {coreRows.length > 0 && (
        <div className="mb-5">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Per-Thread Usage ({coreRows.length} threads)</p>
          <div className="grid grid-cols-2 gap-2">
            {coreRows.map(c => {
              const col = c.pct > 90 ? 'bg-red-500' : c.pct > 60 ? 'bg-yellow-500' : 'bg-brand-500';
              return (
                <div key={c.id} className="bg-dark-900 rounded-lg px-3 py-2 border border-dark-700">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400 font-mono">{c.id}</span>
                    <span className={`font-mono font-bold ${c.pct > 90 ? 'text-red-400' : c.pct > 60 ? 'text-yellow-400' : 'text-brand-400'}`}>{c.pct.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-dark-700 rounded-full overflow-hidden">
                    <div className={`h-1.5 rounded-full ${col} transition-all duration-700`} style={{ width: `${c.pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tempRows.length > 0 && (
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Temperature</p>
          <div className="grid grid-cols-2 gap-2">
            {tempRows.map((line, i) => {
              // Match patterns: "+45.0°C", "45.0°C", "45C", "45.0 C"
              const tempMatch = line.match(/([+\-]?\d+(?:\.\d+)?)\s*°?\s*C(?:\s|$)/i);
              const tempVal = tempMatch ? parseFloat(tempMatch[1]) : 0;
              const hot = tempVal > 80;
              const warm = tempVal > 65;
              // Label: everything before the number
              const label = line.replace(/[+\-]?\d+(?:\.\d+)?\s*°?\s*C.*/i, '').replace(/[:\s]+$/, '').trim() || `Zone ${i}`;
              return (
                <div key={i} className={`bg-dark-900 rounded-lg px-3 py-2 border ${hot ? 'border-red-500/40' : warm ? 'border-yellow-500/40' : 'border-dark-700'}`}>
                  <p className="text-gray-400 text-xs truncate">{label}</p>
                  <p className={`font-mono font-bold mt-0.5 ${hot ? 'text-red-400' : warm ? 'text-yellow-400' : 'text-green-400'}`}>
                    {tempVal > 0 ? `${tempVal.toFixed(0)}°C` : '—'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {!cores && !raw && <p className="text-gray-500 text-center py-8">Waiting for data...</p>}
    </ModalShell>
  );
}

// ── Memory Modal ──────────────────────────────────────────────────────────────
function MemModal({ raw, onClose }) {
  const lines = (raw || '').split('\n').filter(Boolean);
  let memTotal = 0, memUsed = 0, memFree = 0, memBuff = 0;
  let swapTotal = 0, swapUsed = 0, swapFree = 0;
  const memLine = lines.find(l => /^Mem/i.test(l));
  const swapLine = lines.find(l => /^Swap/i.test(l));
  if (memLine) { const p = memLine.trim().split(/\s+/); memTotal = +p[1]; memUsed = +p[2]; memFree = +p[3]; memBuff = +p[5] || 0; }
  if (swapLine) { const p = swapLine.trim().split(/\s+/); swapTotal = +p[1]; swapUsed = +p[2]; swapFree = +p[3]; }
  const humanMB = v => v >= 1024 ? (v / 1024).toFixed(1) + ' GB' : v + ' MB';
  return (
    <ModalShell title="Memory Details" icon={<MemoryStick size={20} className="text-purple-400" />} onClose={onClose}>
      {memTotal > 0 ? (
        <>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[{ l: 'Total', v: memTotal }, { l: 'Used', v: memUsed }, { l: 'Free', v: memFree }].map(i => (
              <div key={i.l} className="bg-dark-900 rounded-xl p-3 text-center border border-dark-700">
                <p className="text-xl font-bold text-gray-100">{humanMB(i.v)}</p>
                <p className="text-gray-500 text-xs mt-1">{i.l}</p>
              </div>
            ))}
          </div>
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">RAM Breakdown</p>
          <Bar label="Used" value={memUsed} max={memTotal} unit=" MB" />
          <Bar label="Buff/Cache" value={memBuff} max={memTotal} unit=" MB" />
          <Bar label="Free" value={memFree} max={memTotal} unit=" MB" inverted={true} />
          {swapTotal > 0 && (<>
            <p className="text-gray-400 text-xs uppercase tracking-wider mt-5 mb-3">Swap</p>
            <Bar label="Swap Used" value={swapUsed} max={swapTotal} unit=" MB" />
            <Bar label="Swap Free" value={swapFree} max={swapTotal} unit=" MB" inverted={true} />
          </>)}
        </>
      ) : <p className="text-gray-500 text-center py-8">Waiting for data...</p>}
    </ModalShell>
  );
}

// ── Disk Modal ────────────────────────────────────────────────────────────────
function DiskModal({ raw, onClose }) {
  const rows = (raw || '').split('\n').filter(Boolean).slice(1).map(l => l.trim().split(/\s+/));
  return (
    <ModalShell title="Disk Usage" icon={<HardDrive size={20} className="text-orange-400" />} onClose={onClose}>
      {rows.length > 0 ? rows.map((r, i) => {
        const pct = parseFloat((r[4] || '0').replace('%', ''));
        return (
          <div key={i} className="mb-4 bg-dark-900 rounded-xl p-4 border border-dark-700">
            <div className="flex justify-between items-center mb-2">
              <span className="font-mono text-gray-200 text-sm font-semibold">{r[5]}</span>
              <span className="text-xs text-gray-500">{r[0]}</span>
            </div>
            <div className="w-full h-3 bg-dark-700 rounded-full overflow-hidden mb-2">
              <div className={`h-3 rounded-full transition-all duration-700 ${pct > 90 ? 'bg-red-500' : pct > 75 ? 'bg-yellow-500' : 'bg-brand-500'}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>Used: <span className="text-gray-200 font-mono">{r[2]}</span></span>
              <span>Free: <span className="text-gray-200 font-mono">{r[3]}</span></span>
              <span>Total: <span className="text-gray-200 font-mono">{r[1]}</span></span>
              <span className={`font-bold ${pct > 90 ? 'text-red-400' : pct > 75 ? 'text-yellow-400' : 'text-brand-400'}`}>{pct}%</span>
            </div>
          </div>
        );
      }) : <p className="text-gray-500 text-center py-8">Waiting for data...</p>}
    </ModalShell>
  );
}

// ── Network Modal ─────────────────────────────────────────────────────────────
function NetModal({ raw, onClose }) {
  const rows = parseNet(raw);
  return (
    <ModalShell title="Network Interfaces" icon={<Wifi size={20} className="text-cyan-400" />} onClose={onClose}>
      {rows.length > 0 ? (
        <div className="space-y-3">
          <div className="grid grid-cols-5 gap-2 text-xs text-gray-500 uppercase tracking-wider px-3 pb-2 border-b border-dark-700">
            <span className="col-span-1">Interface</span>
            <span className="col-span-1 text-center text-green-400">↓ Speed</span>
            <span className="col-span-1 text-center text-blue-400">↑ Speed</span>
            <span className="col-span-1 text-center text-gray-500">Total RX</span>
            <span className="col-span-1 text-center text-gray-500">Total TX</span>
          </div>
          {rows.map(r => (
            <div key={r.iface} className="grid grid-cols-5 gap-2 items-center bg-dark-900 rounded-xl px-3 py-3 border border-dark-700">
              <div className="col-span-1 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 shrink-0"></div>
                <span className="font-mono font-semibold text-gray-100 text-sm truncate">{r.iface}</span>
              </div>
              <div className="col-span-1 text-center">
                <span className="text-green-400 font-mono font-bold text-sm">{fmtSpeed(r.rxs)}</span>
              </div>
              <div className="col-span-1 text-center">
                <span className="text-blue-400 font-mono font-bold text-sm">{fmtSpeed(r.txs)}</span>
              </div>
              <div className="col-span-1 text-center">
                <span className="text-gray-400 font-mono text-xs">{fmtBytes(r.rx)}</span>
              </div>
              <div className="col-span-1 text-center">
                <span className="text-gray-400 font-mono text-xs">{fmtBytes(r.tx)}</span>
              </div>
            </div>
          ))}
          <p className="text-gray-600 text-xs pt-2 text-center">Speed updates every 3 seconds</p>
        </div>
      ) : <p className="text-gray-500 text-center py-8">Waiting for network data...</p>}
    </ModalShell>
  );
}

// ── Circular Ring ─────────────────────────────────────────────────────────────
const CircularProgress = ({ percentage, label, onClick }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const color = percentage > 90 ? '#ef4444' : percentage > 70 ? '#f59e0b' : '#6366f1';
  return (
    <div onClick={onClick} className="flex flex-col items-center justify-center p-6 glass-panel cursor-pointer hover:border-brand-500/50 transition-colors group">
      <div className="relative w-32 h-32 flex items-center justify-center group-hover:scale-105 transition-transform">
        <svg className="transform -rotate-90 w-32 h-32">
          <circle cx="64" cy="64" r={radius} className="stroke-dark-700" strokeWidth="8" fill="transparent" />
          <circle cx="64" cy="64" r={radius} stroke={color} strokeWidth="8" fill="transparent"
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
            strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold">{Math.round(percentage)}%</span>
        </div>
      </div>
      <span className="mt-4 text-gray-400 font-medium tracking-wide uppercase text-sm">{label}</span>
    </div>
  );
};

// ── Network Speed Card ────────────────────────────────────────────────────────
const NetworkCard = ({ raw, onClick }) => {
  const rows = parseNet(raw);
  const totRxs = rows.filter(r => r.iface !== 'lo').reduce((s, r) => s + parseFloat(r.rxs), 0);
  const totTxs = rows.filter(r => r.iface !== 'lo').reduce((s, r) => s + parseFloat(r.txs), 0);

  return (
    <div onClick={onClick} className="flex flex-col items-center justify-center p-6 glass-panel cursor-pointer hover:border-brand-500/50 transition-colors group">
      {/* Same size container as the 128×128 SVG ring */}
      <div className="w-32 h-32 flex flex-col items-center justify-center gap-2 group-hover:scale-105 transition-transform">
        <div className="flex items-center gap-1.5">
          <ArrowDown size={16} className="text-green-400 shrink-0" />
          <span className="font-mono font-bold text-xl text-green-400 leading-none">{fmtSpeed(totRxs)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ArrowUp size={16} className="text-blue-400 shrink-0" />
          <span className="font-mono font-bold text-xl text-blue-400 leading-none">{fmtSpeed(totTxs)}</span>
        </div>
      </div>
      <span className="mt-4 text-gray-400 font-medium tracking-wide uppercase text-sm group-hover:text-gray-200 transition-colors">Network</span>
    </div>
  );
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard({ server }) {
  const [stats, setStats] = useState({ cpu: 0, mem: 0, disk: 0, uptime: 'Loading...', users: '0' });
  const [rawStats, setRawStats] = useState({ top: '', free: '', df: '', net: '', cores: '', temp: '' });
  const [activeModal, setActiveModal] = useState(null);

  useEffect(() => {
    const remove = window.api.onSshStats((data) => {
      let cpu = 0, mem = 0, disk = 0;
      try {
        if (data.top) {
          const m = data.top.match(/([\d.]+)\s*us/);
          if (m) cpu = parseFloat(m[1]);
        }
        if (data.free) {
          const memLine = data.free.split('\n').find(l => /^Mem/i.test(l));
          if (memLine) { const p = memLine.trim().split(/\s+/); mem = (+p[2] / +p[1]) * 100; }
        }
        if (data.df) {
          const lines = data.df.split('\n').filter(Boolean);
          if (lines[1]) { const p = lines[1].trim().split(/\s+/); disk = parseFloat((p[4] || '0').replace('%', '')); }
        }
      } catch (e) {}
      setStats(prev => ({
        cpu: cpu || prev.cpu, mem: mem || prev.mem, disk: disk || prev.disk,
        uptime: data.uptime ? data.uptime.trim() : prev.uptime,
        users: data.users ? data.users.trim() : prev.users,
      }));
      setRawStats(prev => ({
        top: data.top || prev.top,
        free: data.free || prev.free,
        df: data.df || prev.df,
        net: data.net !== undefined ? data.net : prev.net,
        cores: data.cores !== undefined ? data.cores : prev.cores,
        temp: data.temp !== undefined ? data.temp : prev.temp,
      }));
    });
    return () => remove();
  }, []);

  return (
    <div className="p-8 h-full overflow-y-auto relative">
      {activeModal === 'cpu' && <CpuModal raw={rawStats.top} cores={rawStats.cores} temp={rawStats.temp} onClose={() => setActiveModal(null)} />}
      {activeModal === 'mem' && <MemModal raw={rawStats.free} onClose={() => setActiveModal(null)} />}
      {activeModal === 'disk' && <DiskModal raw={rawStats.df} onClose={() => setActiveModal(null)} />}
      {activeModal === 'net' && <NetModal raw={rawStats.net} onClose={() => setActiveModal(null)} />}

      <header className="mb-10 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-100">Server Dashboard</h2>
          <p className="text-gray-400 mt-2">Live metrics — click any card for details</p>
        </div>
        {server && (
          <div className="flex items-center gap-4 bg-dark-800/50 p-4 rounded-2xl border border-dark-700">
            <div className="w-12 h-12 bg-dark-900 rounded-full flex items-center justify-center p-2 border border-brand-500/20 shadow-lg shadow-brand-500/10">
              <OsLogo server={server} className="w-full h-full" />
            </div>
            <div>
              <div className="text-lg font-bold text-gray-100">{server.name}</div>
              <div className="text-sm font-mono text-gray-400">
                {server.username}@{server.host}:{server.port}
              </div>
            </div>
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <CircularProgress onClick={() => setActiveModal('cpu')} percentage={stats.cpu} label="CPU Usage" />
        <CircularProgress onClick={() => setActiveModal('mem')} percentage={stats.mem} label="Memory" />
        <CircularProgress onClick={() => setActiveModal('disk')} percentage={stats.disk} label="Disk I/O" />
        <NetworkCard raw={rawStats.net} onClick={() => setActiveModal('net')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6">
          <span className="text-gray-400 text-sm uppercase tracking-wide">System Uptime</span>
          <span className="text-2xl font-semibold mt-2 block text-brand-400">{stats.uptime}</span>
        </div>
        <div className="glass-panel p-6">
          <span className="text-gray-400 text-sm uppercase tracking-wide">Active Users</span>
          <span className="text-2xl font-semibold mt-2 block text-brand-400">{stats.users}</span>
        </div>
      </div>
    </div>
  );
}
