import { Client } from 'ssh2';

export default class SSHManager {
  constructor() {
    this.client = new Client();
    this.shellStream = null;
    this.sftp = null;
    this.isConnected = false;
    this.mainWindow = null;
    this.statInterval = null;
  }

  async connect(config, mainWindow) {
    this.mainWindow = mainWindow;
    return new Promise(async (resolve, reject) => {
      this.client.on('ready', async () => {
        this.isConnected = true;
        this.initShell();
        this.initSFTP();
        this.startStatPolling();

        let os = null;
        try {
          const osRaw = await this.exec("grep '^ID=' /etc/os-release 2>/dev/null | cut -d= -f2 | tr -d '\"'");
          if (osRaw) os = osRaw.trim().toLowerCase();
        } catch(e) {
          console.error('OS detection failed:', e);
        }

        resolve({ success: true, os });
      }).on('error', (err) => {
        reject({ success: false, error: err.message });
      });

      try {
        const connectOpts = {
          host: config.host,
          port: config.port || 22,
          username: config.username,
          password: config.password,
          privateKey: config.privateKey,
          readyTimeout: 10000
        };

        if (config.zerotier) {
          const zt = require('libzt');
          const { app } = require('electron');
          const path = require('path');
          
          // Store zt node data in user data folder
          const ztPath = path.join(app.getPath('userData'), 'zt_node');
          
          console.log(`Starting ZeroTier node and joining network ${config.zerotier}...`);
          if (this.mainWindow) {
            this.mainWindow.webContents.send('ssh-status', `Joining ZeroTier ${config.zerotier}...`);
          }
          
          try {
            await zt.node.start({ path: ztPath });
          } catch (e) {
            const msg = (e && e.message) ? e.message : String(e);
            if (!msg.includes('already been started')) {
              throw e;
            }
          }

          let ip = null;
          try {
            ip = await zt.node.getIPv4Address(config.zerotier);
          } catch (e) {}

          if (!ip) {
            await zt.node.joinNetwork(config.zerotier);
            for (let i = 0; i < 30; i++) {
              try {
                ip = await zt.node.getIPv4Address(config.zerotier);
                break;
              } catch (e) {
                await new Promise(r => setTimeout(r, 1000));
              }
            }
            if (!ip) throw new Error("Timed out waiting for ZeroTier IP (did you authorize the node?)");
          }
          
          console.log(`Creating ZeroTier socket to ${config.host}:${config.port}`);
          connectOpts.sock = zt.net.createConnection(connectOpts.port, connectOpts.host);
          
          // ssh2 requires host/port undefined if sock is provided
          delete connectOpts.host;
          delete connectOpts.port;
        }

        this.client.connect(connectOpts);
      } catch (err) {
        reject({ success: false, error: err.message });
      }
    });
  }

  async disconnect() {
    if (this.statInterval) clearInterval(this.statInterval);
    if (this.shellStream) this.shellStream.end();
    if (this.isConnected) this.client.end();
    this.isConnected = false;
    return { success: true };
  }

  initShell() {
    this.client.shell({ term: 'xterm-256color' }, (err, stream) => {
      if (err) { console.error('Shell error:', err); return; }
      this.shellStream = stream;
      stream.on('close', () => {
        this.shellStream = null;
      }).on('data', (data) => {
        if (this.mainWindow) {
          this.mainWindow.webContents.send('ssh-shell-output', data.toString('utf8'));
        }
      });
    });
  }

  initSFTP() {
    this.client.sftp((err, sftp) => {
      if (!err) this.sftp = sftp;
    });
  }

  writeShell(data) {
    if (this.shellStream) this.shellStream.write(data);
  }

  resizeShell(cols, rows) {
    if (this.shellStream) this.shellStream.setWindow(rows, cols, 0, 0);
  }

  async exec(command) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) return reject('Not connected');
      this.client.exec(command, (err, stream) => {
        if (err) return reject(err);
        let output = '';
        stream.on('close', () => resolve(output))
          .on('data', (data) => { output += data; })
          .stderr.on('data', (data) => { output += data; });
      });
    });
  }

  async readDir(path) {
    return new Promise((resolve, reject) => {
      if (!this.sftp) return reject('SFTP not initialized');
      this.sftp.readdir(path, (err, list) => {
        if (err) { reject(err); return; }
        const serializedList = list.map(item => ({
          filename: item.filename,
          isDirectory: item.attrs.isDirectory(),
          size: item.attrs.size,
          modifyTime: item.attrs.mtime
        }));
        resolve(serializedList);
      });
    });
  }

  startStatPolling() {
    if (this.statInterval) clearInterval(this.statInterval);
    const INTERVAL_MS = 3000;

    // State carried between polls
    let prevNetBytes  = {};
    let prevCpuStats  = {}; // { cpu0: { user,nice,sys,idle,iow,irq,sirq } }
    let lastPollTime  = Date.now();

    this.statInterval = setInterval(async () => {
      if (!this.isConnected) return;
      try {
        const now     = Date.now();
        const elapsed = Math.max(1, (now - lastPollTime) / 1000);
        lastPollTime  = now;

        // ── Batch all commands into a single SSH exec to avoid MaxSessions limit ────────────────────────────────────────────────
        const bashCmd = `
          top -b -n 1 | head -n 8
          echo "===GLYPH_DELIMITER==="
          free -m
          echo "===GLYPH_DELIMITER==="
          df -h --output=source,size,used,avail,pcent,target 2>/dev/null || df -h
          echo "===GLYPH_DELIMITER==="
          uptime -p
          echo "===GLYPH_DELIMITER==="
          who | awk '{print $1}' | sort -u | wc -l
          echo "===GLYPH_DELIMITER==="
          awk 'NR>2{print $1,$2,$10}' /proc/net/dev 2>/dev/null
          echo "===GLYPH_DELIMITER==="
          grep '^cpu' /proc/stat 2>/dev/null
          echo "===GLYPH_DELIMITER==="
          sensors 2>/dev/null
          echo "===GLYPH_DELIMITER==="
          paste <(ls /sys/class/thermal/thermal_zone*/type 2>/dev/null) <(cat /sys/class/thermal/thermal_zone*/temp 2>/dev/null) 2>/dev/null | awk '{type=$1; val=$2; printf "%s %dC\\n", type, val/1000}' | head -8
        `;
        const rawOutput = await this.exec(bashCmd);
        const parts = rawOutput.split('===GLYPH_DELIMITER===').map(s => s.trim());
        
        const topOutput    = parts[0] || '';
        const freeOutput   = parts[1] || '';
        const dfOutput     = parts[2] || '';
        const uptimeOutput = parts[3] || '';
        const usersOutput  = parts[4] || '';
        const rawNetLines  = parts[5] || '';
        const statRaw      = parts[6] || '';
        const sensorsRaw   = parts[7] || '';
        const tzTemps      = parts[8] || '';

        // ── Network speed (delta bytes / elapsed seconds) ────────────────────
        const currentBytes = {};
        const speedLines   = [];
        if (rawNetLines) {
          rawNetLines.split('\n').forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 3) {
              const iface  = parts[0].replace(':', '');
              const rx     = parseInt(parts[1], 10) || 0;
              const tx     = parseInt(parts[2], 10) || 0;
              currentBytes[iface] = { rx, tx };
              const rxSpeed = prevNetBytes[iface] ? Math.max(0, (rx - prevNetBytes[iface].rx) / elapsed) : 0;
              const txSpeed = prevNetBytes[iface] ? Math.max(0, (tx - prevNetBytes[iface].tx) / elapsed) : 0;
              speedLines.push(`${iface} RX:${rx} TX:${tx} RXS:${rxSpeed.toFixed(0)} TXS:${txSpeed.toFixed(0)}`);
            }
          });
        }
        prevNetBytes = currentBytes;

        // ── Per-core CPU usage (delta from /proc/stat) ───────────────────────
        const coreLines   = [];
        const currentCpu  = {};
        if (statRaw) {
          statRaw.split('\n').forEach(line => {
            const p    = line.trim().split(/\s+/);
            const name = p[0];
            if (!/^cpu\d+$/.test(name)) return;

            const user = parseInt(p[1],10)||0, nice = parseInt(p[2],10)||0,
                  sys  = parseInt(p[3],10)||0, idle = parseInt(p[4],10)||0,
                  iow  = parseInt(p[5],10)||0, irq  = parseInt(p[6],10)||0,
                  sirq = parseInt(p[7],10)||0;
            currentCpu[name] = { user, nice, sys, idle, iow, irq, sirq };

            if (prevCpuStats[name]) {
              const prev   = prevCpuStats[name];
              const dIdle  = (idle + iow) - (prev.idle + prev.iow);
              const dTotal = (user + nice + sys + idle + iow + irq + sirq)
                           - (prev.user + prev.nice + prev.sys + prev.idle + prev.iow + prev.irq + prev.sirq);
              const pct    = dTotal > 0 ? Math.max(0, Math.min(100, ((dTotal - dIdle) / dTotal) * 100)) : 0;
              coreLines.push(`${name} ${pct.toFixed(1)}`);
            } else {
              coreLines.push(`${name} 0.0`);
            }
          });
          prevCpuStats = currentCpu;
        }

        // ── Temperature ──────────────────────────────────────────────────────
        let tempOutput = '';
        if (sensorsRaw) {
          const filtered = sensorsRaw.split('\n').filter(l => /[+\-]?\d+\.\d+.{0,2}C/.test(l));
          tempOutput = filtered.join('\n');
        }

        if (!tempOutput.trim() && tzTemps) {
          tempOutput = tzTemps;
        }

        if (this.mainWindow) {
          this.mainWindow.webContents.send('ssh-stats', {
            top:    topOutput,
            free:   freeOutput,
            df:     dfOutput,
            uptime: uptimeOutput,
            users:  usersOutput,
            net:    speedLines.join('\n'),
            cores:  coreLines.join('\n'),
            temp:   tempOutput
          });
        }
      } catch (err) {
        // silent fail — polling must never crash
      }
    }, INTERVAL_MS);
  }
}
