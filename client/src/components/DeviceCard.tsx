import React from "react";
import {
  Box,
  Camera,
  Headphones,
  Monitor,
  Smartphone,
  Tablet,
} from "lucide-react";
import type { Device } from "@shared/profile";
import {
  deviceCategoryLabels,
  deviceCategoryOf,
  hasComputingSpecs,
} from "@shared/devices";

const icons = {
  computer: Monitor,
  smartphone: Smartphone,
  tablet: Tablet,
  audio: Headphones,
  camera: Camera,
  other: Box,
};

export function DeviceCard({
  device,
  index,
}: {
  device: Device;
  index: number;
}) {
  const category = deviceCategoryOf(device.category);
  const Icon = icons[category];
  const computing = hasComputingSpecs(category);
  const specs = computing
    ? [
        ["OS", device.os],
        ["CPU", device.cpu],
        ["MEMORY", device.memory],
        ["STORAGE", device.storage],
      ].filter(([, value]) => value)
    : [];
  return (
    <article className="device-panel">
      <div className="device-visual">
        {device.imageUrl ? (
          <img loading="lazy" src={device.imageUrl} alt={device.name} />
        ) : (
          <Icon size={64} strokeWidth={1} aria-hidden="true" />
        )}
      </div>
      <div className="device-copy">
        <p className="device-status">
          {deviceCategoryLabels[category]} /{" "}
          {String(index + 1).padStart(2, "0")}
        </p>
        <h3>{device.name}</h3>
        {specs.length > 0 && (
          <dl>
            {specs.map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}
        {computing && device.software && (
          <p className="device-software">{device.software}</p>
        )}
        {device.specifications && (
          <div className="device-extra-specs">
            <h4>仕様・組み合わせ</h4>
            <p>{device.specifications}</p>
          </div>
        )}
        {device.note && <p className="device-note">{device.note}</p>}
      </div>
    </article>
  );
}
