import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const API = 'https://nominatim.openstreetmap.org';

const createDefaultIcon = () => new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const MapClickHandler = ({ onPick }) => {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });
  return null;
};

const LocationPicker = ({ value, onChange, placeholder = 'Search location...' }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [markerPosition, setMarkerPosition] = useState(null);

  const position = useMemo(() => {
    if (value?.lat && value?.lng) return [value.lat, value.lng];
    return [20.5937, 78.9629];
  }, [value]);

  useEffect(() => {
    if (value?.lat && value?.lng) setMarkerPosition([value.lat, value.lng]);
  }, [value]);

  const searchLocation = async (q) => {
    if (!q || q.length < 3) { setSuggestions([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/search?format=json&q=${encodeURIComponent(q)}&limit=5`);
      const data = await res.json();
      setSuggestions(data || []);
    } catch (e) {
      console.warn('Location search failed', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePick = (item) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    const next = { lat, lng: lon, placeName: item.display_name };
    setMarkerPosition([lat, lon]);
    setQuery(item.display_name);
    setSuggestions([]);
    onChange && onChange(next);
  };

  const handleMapPick = (coord) => {
    const next = { ...(value || {}), lat: coord.lat, lng: coord.lng };
    setMarkerPosition([coord.lat, coord.lng]);
    onChange && onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); searchLocation(e.target.value); }}
          placeholder={placeholder}
          className="w-full pl-3 pr-3 py-2 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-emerald-500/20 outline-none placeholder:text-slate-500"
        />
        {loading && <span className="absolute right-3 top-2 text-[10px] text-slate-500">Searching...</span>}
        {suggestions.length > 0 && (
          <div className="absolute z-50 mt-1 w-full bg-[#0B141A] border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto no-scrollbar">
            {suggestions.map((s, idx) => (
              <div key={idx} onClick={() => handlePick(s)} className="px-3 py-2 text-[11px] text-slate-200 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0">
                {s.display_name}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="h-56 rounded-xl overflow-hidden border border-white/5">
        <MapContainer center={position} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapClickHandler onPick={handleMapPick} />
          {markerPosition && <Marker position={markerPosition} icon={createDefaultIcon()} />}
        </MapContainer>
      </div>
    </div>
  );
};

export default LocationPicker;
