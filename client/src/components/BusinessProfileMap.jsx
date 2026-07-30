import React from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export const createDefaultIcon = () => new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const toLatLng = (loc) => {
  if (!loc) return null;
  if (loc.lat !== undefined && loc.lng !== undefined) return { lat: loc.lat, lng: loc.lng };
  if (Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) return { lng: loc.coordinates[0], lat: loc.coordinates[1] };
  return null;
};

const BusinessProfileMap = ({ location, placeName }) => {
  const ll = toLatLng(location);
  if (!ll) return null;
  const position = [ll.lat, ll.lng];
  return (
    <div className="rounded-xl overflow-hidden border border-white/5 h-56">
      <MapContainer center={position} zoom={15} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={position} icon={createDefaultIcon()} />
      </MapContainer>
      {placeName && (
        <div className="px-3 py-2 text-[11px] text-slate-300 bg-[#0B141A] border-t border-white/5 truncate">{placeName}</div>
      )}
    </div>
  );
};

export default BusinessProfileMap;
