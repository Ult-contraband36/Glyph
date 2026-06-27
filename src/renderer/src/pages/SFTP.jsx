import React, { useState, useCallback } from 'react';
import { Folder, File, ArrowUp, FolderOpen, RefreshCw } from 'lucide-react';

export default function SFTP() {
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadDirectory = useCallback(async (path) => {
    setLoading(true);
    setError(null);
    try {
      const list = await window.api.sshSftpReaddir(path);
      list.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.filename.localeCompare(b.filename);
      });
      setFiles(list);
      setCurrentPath(path);
      setHasLoaded(true);
    } catch (err) {
      setError('SFTP is still initializing. Please wait a moment and try again.');
      console.warn('SFTP readdir error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const goUp = () => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    loadDirectory('/' + parts.join('/') || '/');
  };

  const handleNavigate = (file) => {
    if (file.isDirectory) {
      const newPath = currentPath === '/'
        ? `/${file.filename}`
        : `${currentPath}/${file.filename}`;
      loadDirectory(newPath);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  // Landing state — user hasn't opened any folder yet
  if (!hasLoaded) {
    return (
      <div className="p-8 h-full flex flex-col">
        <header className="mb-6">
          <h2 className="text-3xl font-bold text-gray-100">File Explorer</h2>
          <p className="text-gray-400 mt-1">Browse and manage files on the remote server</p>
        </header>
        <div className="flex-1 glass-panel flex flex-col items-center justify-center gap-4">
          <FolderOpen size={64} className="text-dark-600" />
          <h3 className="text-xl font-semibold text-gray-300">Click to open root directory</h3>
          <p className="text-gray-500 text-sm">SFTP session initializes on first use</p>
          <button
            onClick={() => loadDirectory('/')}
            disabled={loading}
            className="mt-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-400 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            <FolderOpen size={18} />
            {loading ? 'Connecting...' : 'Browse /'}
          </button>
          {error && <p className="text-red-400 text-sm mt-2 max-w-sm text-center">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 h-full flex flex-col">
      <header className="mb-6">
        <h2 className="text-3xl font-bold text-gray-100">File Explorer</h2>
        <div className="flex items-center gap-3 mt-4">
          <button onClick={goUp} disabled={currentPath === '/'} className="p-2 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors disabled:opacity-40">
            <ArrowUp size={20} />
          </button>
          <div className="glass-panel px-4 py-2 flex-1 text-brand-400 font-mono text-sm">
            {currentPath}
          </div>
          <button onClick={() => loadDirectory(currentPath)} disabled={loading} className="p-2 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <div className="flex-1 glass-panel overflow-hidden flex flex-col">
        {error && (
          <div className="m-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 gap-2">
            <RefreshCw size={20} className="animate-spin" /> Loading...
          </div>
        ) : (
          <div className="overflow-y-auto p-4 flex flex-col gap-0.5">
            {/* Column headers */}
            <div className="flex items-center gap-3 px-3 pb-2 border-b border-dark-700 text-xs text-gray-500 uppercase tracking-wider">
              <span className="flex-1">Name</span>
              <span className="w-20 text-right">Size</span>
            </div>
            {files.map((file, idx) => (
              <div
                key={idx}
                onClick={() => handleNavigate(file)}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${file.isDirectory ? 'cursor-pointer hover:bg-dark-700/70' : 'cursor-default hover:bg-dark-700/30'}`}
              >
                {file.isDirectory
                  ? <Folder className="text-brand-400 shrink-0" size={20} />
                  : <File className="text-gray-500 shrink-0" size={20} />
                }
                <span className={`flex-1 truncate ${file.isDirectory ? 'text-gray-100 font-medium' : 'text-gray-300'}`}>
                  {file.filename}
                </span>
                <span className="text-gray-500 text-sm font-mono w-20 text-right">
                  {file.isDirectory ? '—' : formatSize(file.size)}
                </span>
              </div>
            ))}
            {files.length === 0 && (
              <div className="text-center text-gray-500 mt-10">Directory is empty</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
