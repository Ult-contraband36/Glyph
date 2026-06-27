import React from 'react';

const OS_ICON_MAP = {
  ubuntu: 'ubuntu', debian: 'debian', centos: 'centos',
  fedora: 'fedora', arch: 'archlinux', alpine: 'linux',
  rhel: 'redhat', opensuse: 'opensuse', suse: 'opensuse',
  amazon: 'amazonwebservices', raspbian: 'raspberrypi',
  kali: 'debian', linuxmint: 'linux', manjaro: 'linux',
};

export default function OsLogo({ server, className = "w-8 h-8" }) {
  if (server.os) {
    const os = server.os.toLowerCase();
    const icon = OS_ICON_MAP[os] || os;
    return (
      <img
        src={`https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${icon}/${icon}-original.svg`}
        alt={server.os}
        onError={(e) => {
          const plain = `https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${icon}/${icon}-plain.svg`;
          const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(server.name)}&background=262a40&color=818cf8&size=48`;
          e.target.onerror = () => { e.target.onerror = null; e.target.src = fallback; };
          e.target.src = plain;
        }}
        className={`${className} object-contain`}
      />
    );
  }
  const isIP = /^(\d{1,3}\.){3}\d{1,3}$/.test(server.host);
  const avatarSrc = `https://ui-avatars.com/api/?name=${encodeURIComponent(server.name)}&background=262a40&color=818cf8&size=48`;
  return (
    <img
      src={avatarSrc}
      alt={server.name}
      className={`${className} rounded-full object-cover`}
    />
  );
}
