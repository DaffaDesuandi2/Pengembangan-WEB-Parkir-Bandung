import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Search, Sliders, Layers, Users, MapPin, Trash2, X, Lock, User, Eye, EyeOff, Plus, Edit2, Check, AlertCircle, Loader2, Car, Bike, Clock } from 'lucide-react';

import 'leaflet/dist/leaflet.css';

// Helper function format Rupiah
const formatRupiah = (number) => {
  if (!number) return 'Rp 0';
  return 'Rp ' + parseInt(number).toLocaleString('id-ID');
};

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

// Custom location marker for "add new" mode
const addMarkerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
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

// Component untuk handle map click
function MapClickHandler({ enabled, onMapClick }) {
  const map = useMap();

  useEffect(() => {
    if (!enabled) return;

    const handleClick = (e) => {
      onMapClick(e);
    };

    map.on('click', handleClick);

    return () => {
      map.off('click', handleClick);
    };
  }, [enabled, map, onMapClick]);

  return null;
}

// Component untuk marker sementara saat mode tambah
function PendingMarker({ position }) {
  if (!position) return null;
  return (
    <Marker position={position} icon={addMarkerIcon}>
      <Popup>
        <div className="p-2 text-center">
          <span className="font-semibold text-amber-700">Posisi yang dipilih</span>
        </div>
      </Popup>
    </Marker>
  );
}

export default function App() {
  const [kecamatanData, setKecamatanData] = useState(null);
  const [parkingLocations, setParkingLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [mapCenter, setMapCenter] = useState([-6.9175, 107.6191]);
  const [mapZoom, setMapZoom] = useState(13);
  const [searchQuery, setSearchQuery] = useState('');
  const [radius, setRadius] = useState(1000);
  const [filterType, setFilterType] = useState('Semua');
  const [userLocation, setUserLocation] = useState([-6.9175, 107.6191]);
  const [role, setRole] = useState('user');
  const [newSpot, setNewSpot] = useState({
    name: '',
    address: '',
    capacity: '',
    price_rate: '',
    status: 'Open',
    category_id: '1',
    lat: '',
    lon: ''
  });

  // Admin Login State
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [adminToken, setAdminToken] = useState(localStorage.getItem('admin_token') || null);
  const [adminData, setAdminData] = useState(JSON.parse(localStorage.getItem('admin_data') || 'null'));
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // CRUD State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSpot, setEditingSpot] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    address: '',
    capacity: '',
    price_rate: '',
    status: 'Open',
    category_id: '1',
    lat: '',
    lon: ''
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Map Edit Mode State
  const [mapEditMode, setMapEditMode] = useState(false);
  const [pendingLocation, setPendingLocation] = useState(null);

  // Notification State
  const [notification, setNotification] = useState(null);

  const API_URL = "http://localhost:8000/api";

  // Show notification helper
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Fetch categories for dropdown
  const fetchCategories = () => {
    fetch(`${API_URL}/categories`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCategories(data);
        }
      })
      .catch(err => console.error("Gagal memuat kategori:", err));
  };

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
              capacity: feat.properties?.capacity || 0,
              price_rate: feat.properties?.price_rate || 3000,
              status: feat.properties?.status || "Open",
              category_id: feat.properties?.category_id || 1,
              category_name: feat.properties?.category_name || "Umum",
              coords: [lat, lon]
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
              capacity: feat.properties?.capacity || 0,
              price_rate: feat.properties?.price_rate || 3000,
              status: feat.properties?.status || "Open",
              category_id: feat.properties?.category_id || 1,
              category_name: feat.properties?.category_name || "Umum",
              coords: [lat, lon],
              jarak: feat.properties?.jarak_meter || null
            };
          });
          setParkingLocations(mappedSpots);
        }
      })
      .catch(err => console.error("Gagal memuat analisis spasial:", err));
  };

  // Auto-set role to admin if token exists
  useEffect(() => {
    if (adminToken) {
      setRole('admin');
    }
  }, [adminToken]);

  useEffect(() => {
    fetch(`${API_URL}/kecamatan`)
      .then(res => res.json())
      .then(data => {
        if (data && data.features) setKecamatanData(data);
      })
      .catch(err => console.error("Gagal memuat batas kecamatan:", err));

    fetchAllParking();
    fetchCategories();
  }, []);

  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Login gagal');
      }

      // Simpan token dan data admin
      localStorage.setItem('admin_token', data.token);
      localStorage.setItem('admin_data', JSON.stringify(data.admin));
      setAdminToken(data.token);
      setAdminData(data.admin);
      setRole('admin');
      setShowLoginModal(false);
      setLoginForm({ username: '', password: '' });
      showNotification('Login berhasil! Selamat datang, ' + data.admin.username);
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_data');
    setAdminToken(null);
    setAdminData(null);
    setRole('user');
    showNotification('Logout berhasil');
  };

  // Open edit modal
  const openEditModal = (spot) => {
    setEditingSpot(spot);
    // Extract lat/lon from coords array
    const lat = spot.coords ? spot.coords[0] : '';
    const lon = spot.coords ? spot.coords[1] : '';
    setEditForm({
      name: spot.name || '',
      address: spot.address || '',
      capacity: spot.capacity?.toString() || '0',
      price_rate: spot.price_rate?.toString() || '3000',
      status: spot.status || 'Open',
      category_id: spot.category_id?.toString() || '1',
      lat: typeof lat === 'number' ? lat.toFixed(6) : lat,
      lon: typeof lon === 'number' ? lon.toFixed(6) : lon
    });
    setEditError('');
    setShowEditModal(true);
  };

  // Handle edit submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');

    try {
      const res = await fetch(`${API_URL}/parkir/${editingSpot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          address: editForm.address || '-',
          capacity: parseInt(editForm.capacity) || 0,
          price_rate: parseInt(editForm.price_rate) || 3000,
          status: editForm.status || 'Open',
          category_id: parseInt(editForm.category_id) || 1,
          lat: parseFloat(editForm.lat),
          lon: parseFloat(editForm.lon)
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Gagal mengupdate data');
      }

      showNotification('Data berhasil diperbarui!');
      setShowEditModal(false);
      setEditingSpot(null);

      // Refresh data
      if (filterType === 'Terdekat') {
        fetchNearestParking(userLocation[1], userLocation[0], radius);
      } else {
        fetchAllParking();
      }
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (spot) => {
    if (!window.confirm(`Apakah kamu yakin ingin menghapus "${spot.name}" dari database PostGIS?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/parkir/${spot.id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Gagal menghapus data');
      }

      showNotification('Data berhasil dihapus!');
      if (filterType === 'Terdekat') {
        fetchNearestParking(userLocation[1], userLocation[0], radius);
      } else {
        fetchAllParking();
      }
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Handle create new parking
  const handleCreateParking = async () => {
    if (!newSpot.name || !newSpot.lat || !newSpot.lon) {
      showNotification('Nama, Latitude, dan Longitude wajib diisi!', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/parkir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSpot.name,
          address: newSpot.address || '-',
          capacity: parseInt(newSpot.capacity) || 0,
          price_rate: parseInt(newSpot.price_rate) || 3000,
          status: newSpot.status || 'Open',
          category_id: parseInt(newSpot.category_id) || 1,
          lat: parseFloat(newSpot.lat),
          lon: parseFloat(newSpot.lon)
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Gagal menyimpan data');
      }

      showNotification('Lokasi parkir baru berhasil ditambahkan!');
      setNewSpot({
        name: '',
        address: '',
        capacity: '',
        price_rate: '',
        status: 'Open',
        category_id: '1',
        lat: '',
        lon: ''
      });
      setMapEditMode(false);
      fetchAllParking();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Handle map click for adding new location
  const handleMapClick = (e) => {
    if (mapEditMode) {
      setNewSpot(prev => ({
        ...prev,
        lat: e.latlng.lat.toFixed(6),
        lon: e.latlng.lng.toFixed(6)
      }));
      setMapEditMode(false);
      showNotification('Posisi ditandai! Lengkapi form dan simpan.');
    }
  };

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
          {adminToken ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-semibold text-amber-800">{adminData?.username || 'Admin'}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all font-semibold"
              >
                <X className="w-4 h-4" />
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-all font-semibold"
            >
              <Users className="w-4 h-4" />
              Mode Admin
            </button>
          )}
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
              {role === 'admin' && adminToken && (
                <div className="p-4 mx-1 mt-2 bg-amber-50 border border-amber-200 rounded-2xl space-y-3 shadow-sm">
                  <div className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Panel Admin: Tambah Lokasi
                  </div>

                  {/* Tombol Aktifkan Mode Klik Peta */}
                  <button
                    onClick={() => setMapEditMode(!mapEditMode)}
                    className={`w-full py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                      mapEditMode
                        ? 'bg-green-500 hover:bg-green-600 text-white'
                        : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                    {mapEditMode ? 'Batal - Klik Peta untuk Tandai' : 'Klik Peta untuk Tandai Posisi'}
                  </button>

                  <input
                    type="text" placeholder="Nama Tempat *" value={newSpot.name}
                    onChange={(e) => setNewSpot({...newSpot, name: e.target.value})}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                  <input
                    type="text" placeholder="Alamat" value={newSpot.address}
                    onChange={(e) => setNewSpot({...newSpot, address: e.target.value})}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />

                  {/* Dropdown Kategori */}
                  <select
                    value={newSpot.category_id}
                    onChange={(e) => setNewSpot({...newSpot, category_id: e.target.value})}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    <option value="">Pilih Kategori</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.type_name}</option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">Rp</span>
                      <input
                        type="number" placeholder="Harga/jam *" value={newSpot.price_rate}
                        onChange={(e) => setNewSpot({...newSpot, price_rate: e.target.value})}
                        className="w-full pl-7 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>
                    <div className="relative">
                      <Car className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                      <input
                        type="number" placeholder="Kapasitas" value={newSpot.capacity}
                        onChange={(e) => setNewSpot({...newSpot, capacity: e.target.value})}
                        className="w-full pl-7 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Dropdown Status */}
                  <select
                    value={newSpot.status}
                    onChange={(e) => setNewSpot({...newSpot, status: e.target.value})}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                    <option value="Full">Full</option>
                  </select>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number" step="any" placeholder="Latitude *" value={newSpot.lat}
                      onChange={(e) => setNewSpot({...newSpot, lat: e.target.value})}
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                    <input
                      type="number" step="any" placeholder="Longitude *" value={newSpot.lon}
                      onChange={(e) => setNewSpot({...newSpot, lon: e.target.value})}
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                  <button
                    onClick={handleCreateParking}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors shadow flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Simpan ke Database
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
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-semibold">
                      {spot.category_name}
                    </span>
                    <span className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded text-[10px] font-semibold">
                      {formatRupiah(spot.price_rate)}
                    </span>
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-semibold">
                      Kap: {spot.capacity}
                    </span>
                    {spot.jarak !== null && spot.jarak !== undefined && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-semibold">
                        {spot.jarak < 1000 ? `${Math.round(spot.jarak)} m` : `${(spot.jarak/1000).toFixed(2)} km`}
                      </span>
                    )}
                  </div>
                  
                  {/* FIX INTERACTIVE: Toggle Tombol Hapus/Edit (Admin) atau Kapasitas (User) */}
                  {role === 'admin' && adminToken ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(spot);
                        }}
                        className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg border border-blue-200 transition-all shadow-sm flex items-center justify-center"
                        title="Edit lokasi ini"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(spot);
                        }}
                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-200 transition-all shadow-sm flex items-center justify-center"
                        title="Hapus lokasi ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50/50 px-2.5 py-1 rounded-lg">
                      Kapasitas: {spot.capacity}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* AREA RENDERING PETA */}
        <div className="flex-1 h-full w-full relative">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            className="h-full w-full z-10"
            zoomControl={false}
          >
            <ChangeView center={mapCenter} zoom={mapZoom} />

            {/* Handler untuk klik peta saat mode tambah */}
            <MapClickHandler
              enabled={mapEditMode}
              onMapClick={(e) => {
                setNewSpot(prev => ({
                  ...prev,
                  lat: e.latlng.lat.toFixed(6),
                  lon: e.latlng.lng.toFixed(6)
                }));
                setMapEditMode(false);
                showNotification('Posisi ditandai! Lengkapi form dan simpan.');
              }}
            />

            {/* Marker sementara untuk posisi yang dipilih */}
            {mapEditMode && newSpot.lat && newSpot.lon && (
              <PendingMarker position={[parseFloat(newSpot.lat), parseFloat(newSpot.lon)]} />
            )}
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
                <Marker
                  key={index}
                  position={spot.coords}
                  icon={redIcon}
                  draggable={role === 'admin' && adminToken}
                  eventHandlers={{
                    click: (e) => {
                      // Jika admin login, set marker yang dipilih untuk diedit
                      if (role === 'admin' && adminToken) {
                        setEditingSpot(spot);
                        setEditForm({
                          name: spot.name || '',
                          address: spot.address || '',
                          lat: e.target.getLatLng().lat.toFixed(6),
                          lon: e.target.getLatLng().lng.toFixed(6)
                        });
                        setEditError('');
                        setShowEditModal(true);
                      }
                    },
                    dragend: (e) => {
                      // Auto-buka modal edit dengan koordinat baru
                      if (role === 'admin' && adminToken) {
                        const newLat = e.target.getLatLng().lat;
                        const newLon = e.target.getLatLng().lng;
                        setEditingSpot(spot);
                        setEditForm({
                          name: spot.name || '',
                          address: spot.address || '',
                          lat: newLat.toFixed(6),
                          lon: newLon.toFixed(6)
                        });
                        setEditError('');
                        setShowEditModal(true);
                      }
                    }
                  }}
                >
                  <Popup>
                    <div className="p-2 font-sans text-slate-900 min-w-[180px]">
                      <h4 className="font-bold text-sm mb-1 text-slate-800">{spot.name}</h4>
                      <p className="text-[11px] text-slate-500 mb-2">{spot.address}</p>
                      <div className="grid grid-cols-2 gap-1 mb-2 text-[10px]">
                        <div className="bg-slate-100 rounded px-2 py-1">
                          <span className="text-slate-500">Kategori:</span>
                          <span className="font-semibold ml-1">{spot.category_name}</span>
                        </div>
                        <div className="bg-green-50 rounded px-2 py-1 text-green-700">
                          <span className="font-semibold">{formatRupiah(spot.price_rate)}</span>
                        </div>
                        <div className="bg-amber-50 rounded px-2 py-1 text-amber-700">
                          <span className="font-semibold">Kapasitas: {spot.capacity}</span>
                        </div>
                        <div className={`rounded px-2 py-1 ${spot.status === 'Open' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          <span className="font-semibold">{spot.status}</span>
                        </div>
                      </div>
                      {role === 'admin' && adminToken && (
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSpot(spot);
                              setEditForm({
                                name: spot.name || '',
                                address: spot.address || '',
                                lat: spot.coords[0].toString(),
                                lon: spot.coords[1].toString()
                              });
                              setEditError('');
                              setShowEditModal(true);
                            }}
                            className="flex-1 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" />
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(spot);
                            }}
                            className="flex-1 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Hapus
                          </button>
                        </div>
                      )}
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

          {/* Mode Edit Indicator & Pin Location Button */}
          {role === 'admin' && adminToken && (
            <div className="absolute top-4 right-4 z-[500] flex flex-col gap-2">
              {/* Indicator Banner */}
              <div className="bg-amber-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-xs font-bold">MODE EDIT AKTIF</span>
              </div>
              {/* Tombol Pin Lokasi Baru */}
              {mapEditMode ? (
                <div className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
                  <MapPin className="w-4 h-4" />
                  <span className="text-xs font-semibold">Klik peta untuk tandai posisi</span>
                </div>
              ) : (
                <button
                  onClick={() => setMapEditMode(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-colors"
                >
                  <MapPin className="w-4 h-4" />
                  <span className="text-xs font-semibold">Tambah Titik Baru</span>
                </button>
              )}
            </div>
          )}

          {/* Crosshair saat mode edit */}
          {mapEditMode && (
            <div className="absolute inset-0 pointer-events-none z-[100] flex items-center justify-center">
              <div className="relative">
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-amber-500"></div>
                <div className="w-6 h-6 border-2 border-amber-500 rounded-full"></div>
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-amber-500"></div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* LOGIN MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Login Admin</h2>
                  <p className="text-xs text-indigo-200">Masuk ke panel administrator</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  setLoginError('');
                  setLoginForm({ username: '', password: '' });
                }}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="p-6 space-y-5">
              {loginError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {loginError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Masukkan username"
                    value={loginForm.username}
                    onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Masukkan password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="w-full pl-10 pr-12 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-slate-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-indigo-200"
              >
                {loginLoading ? 'Memproses...' : 'Masuk'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* NOTIFICATION TOAST */}
      {notification && (
        <div className={`fixed top-4 right-4 z-[99999] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 transition-all duration-300 ${
          notification.type === 'error'
            ? 'bg-red-500 text-white'
            : 'bg-green-500 text-white'
        }`}>
          {notification.type === 'error' ? (
            <AlertCircle className="w-5 h-5" />
          ) : (
            <Check className="w-5 h-5" />
          )}
          <span className="font-medium">{notification.message}</span>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && editingSpot && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Edit2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Edit Lokasi Parkir</h2>
                  <p className="text-xs text-blue-200">ID: #{editingSpot.id}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingSpot(null);
                  setEditError('');
                }}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {editError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Nama Tempat *
                </label>
                <input
                  type="text"
                  placeholder="Nama lokasi parkir"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Alamat
                </label>
                <input
                  type="text"
                  placeholder="Alamat lengkap"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Dropdown Kategori */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Kategori
                  </label>
                  <select
                    value={editForm.category_id}
                    onChange={(e) => setEditForm({ ...editForm, category_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.type_name}</option>
                    ))}
                  </select>
                </div>

                {/* Dropdown Status */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                    <option value="Full">Full</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Harga/Jam (Rp)
                  </label>
                  <input
                    type="number"
                    placeholder="3000"
                    value={editForm.price_rate}
                    onChange={(e) => setEditForm({ ...editForm, price_rate: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Kapasitas
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={editForm.capacity}
                    onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Latitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="-6.xxx"
                    value={editForm.lat}
                    onChange={(e) => setEditForm({ ...editForm, lat: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Longitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="107.xxx"
                    value={editForm.lon}
                    onChange={(e) => setEditForm({ ...editForm, lon: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingSpot(null);
                    setEditError('');
                  }}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                >
                  {editLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Simpan
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}