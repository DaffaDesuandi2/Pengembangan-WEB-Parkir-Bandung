import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Search, Sliders, Layers, Users, MapPin } from 'lucide-react';

import 'leaflet/dist/leaflet.css';

// Fix Icon Leaflet Default
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Red Marker
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

export default function App() {
  const [kecamatanData, setKecamatanData] = useState(null);
  const [parkingLocations, setParkingLocations] = useState([]);
  const [mapCenter, setMapCenter] = useState([-6.9175, 107.6191]); 
  const [mapZoom, setMapZoom] = useState(13);
  const [searchQuery, setSearchQuery] = useState('');
  const [radius, setRadius] = useState(1000); 
  const [filterType, setFilterType] = useState('Semua'); 
  const [userLocation, setUserLocation] = useState([-6.9175, 107.6191]);
  const [role, setRole] = useState('user'); // Default sebagai user biasa
  const [newSpot, setNewSpot] = useState({ name: '', address: '', capacity: '', lat: '', lon: '' });

  const API_URL = "http://localhost:8000/api";

  // Ambil Semua Data Parkir (Endpoint 2)
  const fetchAllParking = () => {
    fetch(`${API_URL}/parkir`)
      .then(res => res.json())
      .then(data => {
        if (data && data.features) {
          const mappedSpots = data.features.map(feat => {
            const lon = feat.geometry?.coordinates?.[0] || 107.6191;
            const lat = feat.geometry?.coordinates?.[1] || -6.9175;
            return {
              id: feat.properties?.id || "0",
              name: feat.properties?.name || "Lahan Parkir",
              address: feat.properties?.address || "Bandung",
              capacity: feat.properties?.capacity || "Tersedia",
              category: feat.properties?.category || "Umum",
              coords: [lat, lon],
              tarif_per_jam: feat.properties?.tarif_per_jam || 3000
            };
          });
          setParkingLocations(mappedSpots);
        }
      })
      .catch(err => console.error("Gagal memuat semua titik parkir:", err));
  };

  // Ambil Data Parkir Terdekat Spasial (Endpoint 3)
  const fetchNearestParking = (lon, lat, rad) => {
    fetch(`${API_URL}/parkir/terdekat?lon=${lon}&lat=${lat}&radius_meter=${rad}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.features) {
          const mappedSpots = data.features.map(feat => {
            const lon = feat.geometry?.coordinates?.[0] || 107.6191;
            const lat = feat.geometry?.coordinates?.[1] || -6.9175;
            return {
              id: feat.properties?.id || "0",
              name: feat.properties?.name || "Lahan Parkir",
              address: feat.properties?.address || "Bandung",
              capacity: feat.properties?.capacity || "Tersedia",
              category: "Terdekat",
              coords: [lat, lon],
              tarif_per_jam: feat.properties?.tarif_per_jam || 3000,
              jarak: feat.properties?.jarak_meter || null
            };
          });
          setParkingLocations(mappedSpots);
        }
      })
      .catch(err => console.error("Gagal memuat analisis spasial:", err));
  };

  useEffect(() => {
    fetch(`${API_URL}/kecamatan`)
      .then(res => res.json())
      .then(data => {
        if (data && data.features) setKecamatanData(data);
      })
      .catch(err => console.error("Gagal memuat batas kecamatan:", err));

    fetchAllParking();
  }, []);

  useEffect(() => {
    if (filterType === 'Terdekat') {
      fetchNearestParking(userLocation[1], userLocation[0], radius);
    } else {
      fetchAllParking();
    }
  }, [filterType, radius]);

  const filteredParking = parkingLocations.filter(spot => {
    const title = spot.name ? spot.name.toLowerCase() : '';
    const addr = spot.address ? spot.address.toLowerCase() : '';
    const query = searchQuery.toLowerCase();
    return title.includes(query) || addr.includes(query);
  });

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-50 text-slate-800 font-sans antialiased overflow-hidden">
      
      {/* NAVBAR */}
      <header className="flex items-center justify-between px-8 py-4 bg-white border-b border-slate-200 shadow-sm z-[2000]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-md shadow-indigo-200">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-slate-900 block">GIS Parkir Publik Kota Bandung</span>
          </div>
        </div>
        <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
          <a href="#" className="text-indigo-600 font-semibold border-b-2 border-indigo-600 pb-1">Peta Lokasi</a>
          <a href="#" className="hover:text-slate-900 transition-colors">Metadata</a>
          <div className="w-[1px] h-4 bg-slate-300"></div>
          <button 
            onClick={() => setRole(role === 'user' ? 'admin' : 'user')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-semibold ${
              role === 'admin' 
                ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-md' 
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
            }`}
          >
            <Users className="w-4 h-4" /> 
            {role === 'admin' ? 'Keluar Mode Admin' : 'Mode Admin'}
          </button>
        </nav>
      </header>

      {/* BODY KONTEN */}
      <div className="flex flex-1 relative overflow-hidden">
        
        {/* SIDEBAR PANEL KIRI */}
        <aside className="w-[380px] bg-white border-r border-slate-200 shadow-xl flex flex-col z-[1000] h-full">
          <div className="p-5 border-b border-slate-100 space-y-4 bg-slate-50/50">
            
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input 
                type="text" 
                placeholder="Cari nama atau alamat lokasi..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-bold tracking-wider text-slate-400 uppercase">
                <span className="flex items-center gap-1"><Sliders className="w-3 h-3" /> Jangkauan Radius</span>
                <span className="text-indigo-600 text-sm normal-case font-extrabold">{radius} meter</span>
              </div>
              <input 
                type="range" min="200" max="11000" step="100" value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />

              {/* FORM KHUSUS ADMIN UNTUK TAMBAH TITIK */}
              {role === 'admin' && (
                <div className="p-4 mx-5 mb-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3 shadow-sm">
                  <div className="text-xs font-bold text-amber-800 uppercase tracking-wider">🛠️ Panel Admin: Tambah Lokasi</div>
                  <input 
                    type="text" placeholder="Nama Tempat" value={newSpot.name}
                    onChange={(e) => setNewSpot({...newSpot, name: e.target.value})}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none"
                  />
                  <input 
                    type="text" placeholder="Alamat" value={newSpot.address}
                    onChange={(e) => setNewSpot({...newSpot, address: e.target.value})}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input 
                      type="text" placeholder="Kapasitas" value={newSpot.capacity}
                      onChange={(e) => setNewSpot({...newSpot, capacity: e.target.value})}
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none"
                    />
                    <input 
                      type="number" step="any" placeholder="Latitude" value={newSpot.lat}
                      onChange={(e) => setNewSpot({...newSpot, lat: e.target.value})}
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none"
                    />
                    <input 
                      type="number" step="any" placeholder="Longitude" value={newSpot.lon}
                      onChange={(e) => setNewSpot({...newSpot, lon: e.target.value})}
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none"
                    />
                  </div>
                  <button 
                    onClick={() => {
                      if(!newSpot.name || !newSpot.lat || !newSpot.lon) return alert("Nama, Lat, dan Lon wajib diisi!");
                      
                      // Kirim data ke Backend
                      fetch(`${API_URL}/parkir`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newSpot)
                      })
                      .then(res => res.json())
                      .then(() => {
                        alert("Lokasi parkir baru berhasil ditambahkan ke PostGIS!");
                        setNewSpot({ name: '', address: '', capacity: '', lat: '', lon: '' });
                        fetchAllParking(); // Refresh peta otomatis
                      })
                      .catch(err => console.error(err));
                    }}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors shadow"
                  >
                    Simpan ke Database
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200/60 rounded-xl text-xs font-semibold">
              <button 
                onClick={() => setFilterType('Semua')}
                className={`py-2 text-center rounded-lg transition-all ${filterType === 'Semua' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Semua Data
              </button>
              <button 
                onClick={() => setFilterType('Terdekat')}
                className={`py-2 text-center rounded-lg transition-all ${filterType === 'Terdekat' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Analisis Spasial
              </button>
            </div>
          </div>

          {/* LIST CARD DATA */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-white">
            <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2">
              Titik Database Ditemukan ({filteredParking.length})
            </div>

            {filteredParking.map((spot, index) => (
              <div 
                key={index} 
                onClick={() => { if(spot.coords) setMapCenter(spot.coords); }}
                className="group p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-500 hover:shadow-lg shadow-sm cursor-pointer transition-all duration-300 relative"
              >
                <div className="absolute top-4 right-4 text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                  #{spot.id || index + 1}
                </div>
                
                <h3 className="font-bold text-sm text-slate-800 group-hover:text-indigo-600 transition-colors pr-10">{spot.name}</h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" /> {spot.address}
                </p>
                
                <div className="mt-4 flex justify-between items-center pt-2 border-t border-slate-50">
                  <div className="flex gap-1.5">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-semibold">
                      {spot.category}
                    </span>
                    {spot.jarak !== null && spot.jarak !== undefined && (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-bold">
                        {spot.jarak < 1000 ? `${Math.round(spot.jarak)} m` : `${(spot.jarak/1000).toFixed(2)} km`}
                      </span>
                    )}
                  </div>
                  
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50/50 px-2.5 py-1 rounded-lg">
                    Kapasitas: {spot.capacity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* AREA RENDERING PETA */}
        <div className="flex-1 h-full w-full relative">
          <MapContainer center={mapCenter} zoom={mapZoom} className="h-full w-full z-10" zoomControl={false}>
            <ChangeView center={mapCenter} zoom={mapZoom} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Layer Poligon Wilayah Kecamatan */}
            {kecamatanData && kecamatanData.features && (
              <GeoJSON 
                key={JSON.stringify(kecamatanData)}
                data={kecamatanData} 
                style={{
                  color: "#4f46e5",
                  weight: 1.2,
                  fillColor: "#6366f1",
                  fillOpacity: 0.05
                }}
                onEachFeature={(feature, layer) => {
                  if (feature.properties && feature.properties.nama_kecamatan) {
                    layer.bindTooltip(feature.properties.nama_kecamatan, { 
                      sticky: true, 
                      className: 'text-xs font-semibold px-2 py-1 rounded shadow-md bg-white border border-slate-100' 
                    });
                  }
                }}
              />
            )}

            {/* Circle Buffer Spasial */}
            {filterType === 'Terdekat' && (
              <Circle 
                center={userLocation} 
                radius={radius} 
                pathOptions={{ fillColor: '#4f46e5', fillOpacity: 0.08, color: '#4f46e5', weight: 1.5, dashArray: '6, 6' }} 
              />
            )}

            {/* Marker Pin Lahan Parkir */}
            {filteredParking.map((spot, index) => {
              if (!spot.coords || !spot.coords[0] || !spot.coords[1]) return null;
              return (
                <Marker key={index} position={spot.coords} icon={redIcon}>
                  <Popup>
                    <div className="p-1 font-sans text-slate-900 min-w-[160px]">
                      <h4 className="font-bold text-sm mb-0.5 text-slate-800">{spot.name}</h4>
                      <p className="text-[11px] text-slate-500 my-0">{spot.address}</p>
                      <div className="mt-2 text-center bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs py-1.5 rounded-lg font-bold">
                        Rp {spot.tarif_per_jam ? spot.tarif_per_jam.toLocaleString('id-ID') : '3.000'} / Jam
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Widget Koordinat */}
          <div className="absolute bottom-6 left-6 bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-lg z-[500] text-left">
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">Koordinat Fokus</span>
            <span className="text-xs font-mono font-bold text-slate-700">
              {mapCenter[0]?.toFixed(5)}, {mapCenter[1]?.toFixed(5)}
            </span>
          </div>

          {/* Tombol Zoom */}
          <div className="absolute bottom-6 right-6 flex flex-col gap-1.5 z-[500]">
            <button onClick={() => setMapZoom(prev => prev + 1)} className="w-10 h-10 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-md text-lg font-bold text-slate-700 flex items-center justify-center transition-all">+</button>
            <button onClick={() => setMapZoom(prev => prev - 1)} className="w-10 h-10 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-md text-lg font-bold text-slate-700 flex items-center justify-center transition-all">-</button>
          </div>
        </div>

      </div>
    </div>
  );
}