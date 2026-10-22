// src/components/PlatformSelector.jsx
import React from 'react';
import "../css/PlatformSelector.css";

const platformsList = [
  { name: 'Instagram', key: 'instagram' },
  { name: 'TikTok', key: 'tiktok' },
  { name: 'X', key: 'twitter', disabled: true },
  { name: 'YouTube', key: 'youtube', disabled: true },
];

const PlatformSelector = ({ platforms, setPlatforms }) => {
  const toggle = (platform) => {
    if (platform.disabled) return;
    if (platforms.includes(platform.key)) {
      setPlatforms(platforms.filter((p) => p !== platform.key));
    } else {
      setPlatforms([...platforms, platform.key]);
    }
  };

  return (
    <div className="platform-selector">
      {platformsList.map((platform) => (
        <div
          key={platform.key}
          className={`platform-option ${platform.disabled ? 'disabled' : ''}`}
          onClick={() => toggle(platform)}
        >
          <div
            className={`platform-circle ${platforms.includes(platform.key) ? 'selected' : ''}`}
          />
          <span className="platform-name">{platform.name}</span>
          {platform.disabled && (
            <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 6 }}>Coming soon</span>
          )}
        </div>
      ))}
    </div>
  );
};

export default PlatformSelector;