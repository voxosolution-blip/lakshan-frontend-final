// Shop Map View Component with Leaflet
import { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Clock, Store, MapPin } from 'lucide-react';

// Fix for default marker icons in Leaflet with webpack/vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icons with rotation support
const createCustomIcon = (color: string, isUser: boolean = false, heading?: number) => {
  const size = isUser ? 40 : 32;
  const rotation = heading ? `transform: rotate(${heading}deg);` : '';
  const svg = isUser 
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="${size}" height="${size}" style="${rotation}">
        <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
        <path d="M12 5 L15 12 L12 14 L9 12 Z" fill="white"/>
      </svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="${size}" height="${size}">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" stroke="white" stroke-width="1"/>
      </svg>`;
  
  return L.divIcon({
    html: svg,
    className: 'custom-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
};

// Note: User icon is created dynamically in render to support heading changes

interface RouteOption {
  coords: [number, number][];
  distanceKm: number;
  durationMin: number;
  isMainRoute: boolean;
}

interface Shop {
  id: string;
  shopName: string;
  address?: string;
  contact?: string;
  latitude: number | null;
  longitude: number | null;
  paymentStatus?: 'paid' | 'pending' | 'ongoing' | 'cheque';
  distance?: number;
  estimatedTime?: number; // in minutes
  heading?: number; // 0-360 degrees
}

interface ShopMapViewProps {
  shops: Shop[];
  userLocation: { lat: number; lng: number; heading?: number } | null;
  onShopSelect: (shop: Shop) => void;
  onNavigate?: (shop: Shop) => void;
  selectedShopId?: string | null;
  showDirectionsInMap?: boolean;
}

// Fetch real road route from OSRM API with alternatives
const fetchRoute = async (
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
): Promise<RouteOption[]> => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&alternatives=true`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.routes || data.routes.length === 0) return [];

    // Convert all routes to our format, marking first as main
    return data.routes.map((route: any, index: number) => ({
      coords: route.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
      ),
      distanceKm: route.distance / 1000,
      durationMin: Math.round(route.duration / 60),
      isMainRoute: index === 0,
    }));
  } catch (error) {
    console.error('Error fetching route:', error);
    return [];
  }
};

// Component to update map view when location changes with smooth animation
const MapUpdater = ({ center, zoom, fitBounds, routes }: { center: [number, number]; zoom: number; fitBounds?: boolean; routes: RouteOption[] }) => {
  const map = useMap();
  
  useEffect(() => {
    if (fitBounds && routes.length > 0) {
      // Get all coordinates from all routes
      const allCoords = routes.flatMap(route => route.coords);
      
      if (allCoords.length > 0) {
        const bounds = L.latLngBounds(allCoords as any);
        map.fitBounds(bounds, {
          padding: [50, 50],
          animate: true,
          duration: 1.5,
        });
        return;
      }
    }
    
    // Fallback to flyTo
    map.flyTo(center, zoom, {
      animate: true,
      duration: 1.5,
    });
  }, [center, zoom, map, fitBounds, routes]);
  
  return null;
};

// Utility functions
// Linear interpolation for smooth animation (for future use with live location tracking)
// const lerp = (start: number, end: number, t: number): number => {
//   return start + (end - start) * t;
// };

// Calculate distance between two points (Haversine formula) - for display only
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Calculate bearing/heading between two points (for future use with direction-aware features)
// const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
//   const dLon = (lon2 - lon1) * Math.PI / 180;
//   const lat1Rad = lat1 * Math.PI / 180;
//   const lat2Rad = lat2 * Math.PI / 180;
//   
//   const y = Math.sin(dLon) * Math.cos(lat2Rad);
//   const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
//             Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
//   
//   const bearing = Math.atan2(y, x) * 180 / Math.PI;
//   return (bearing + 360) % 360; // Normalize to 0-360
// };

// Get shop icon based on payment status
const getShopIcon = (status?: string, isNext?: boolean, isSelected?: boolean) => {
  if (isSelected) return createCustomIcon('#000000');
  
  let color = '#0284c7'; // default blue
  switch (status) {
    case 'paid': 
      color = '#16a34a'; // green
      break;
    case 'ongoing': 
    case 'cheque': 
      color = '#ea580c'; // orange
      break;
    case 'pending': 
      color = '#dc2626'; // red
      break;
  }
  
  if (isNext) {
    color = '#7c3aed'; // purple for next
  }
  
  return createCustomIcon(color);
};

export const ShopMapView = ({ 
  shops, 
  userLocation, 
  onShopSelect, 
  selectedShopId,
}: ShopMapViewProps) => {
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
  const [selectedRouteShop, setSelectedRouteShop] = useState<Shop | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const routeCacheRef = useRef<Map<string, RouteOption[]>>(new Map());
  // Store accurate distances and times from OSRM for each shop
  const osrmDataRef = useRef<Map<string, { distance: number; time: number }>>(new Map());

  // Calculate distances and sort shops by proximity, use OSRM data for accurate time
  const shopsWithDistance = useMemo(() => {
    if (!userLocation) return shops;
    
    return shops
      .filter(shop => shop.latitude && shop.longitude)
      .map(shop => {
        // Check if we have OSRM data for this shop
        const osrmKey = `${userLocation.lat.toFixed(4)},${userLocation.lng.toFixed(4)}-${shop.id}`;
        const osrmData = osrmDataRef.current.get(osrmKey);
        
        if (osrmData) {
          // Use accurate OSRM data
          return {
            ...shop,
            distance: osrmData.distance,
            estimatedTime: osrmData.time
          };
        }
        
        // Fallback to Haversine estimation while waiting for OSRM data
        const haversineDistance = calculateDistance(
          userLocation.lat, 
          userLocation.lng, 
          shop.latitude!, 
          shop.longitude!
        );
        
        return {
          ...shop,
          distance: haversineDistance,
          // Estimate time: assuming 30 km/h average speed in urban areas
          estimatedTime: Math.round((haversineDistance / 30) * 60)
        };
      })
      .sort((a, b) => (a.distance || 0) - (b.distance || 0));
  }, [shops, userLocation]);

  // Get the next recommended shop (nearest unvisited/unpaid shop)
  const nextRecommendedShop = useMemo(() => {
    return shopsWithDistance.find(shop => 
      shop.paymentStatus !== 'paid'
    ) || shopsWithDistance[0];
  }, [shopsWithDistance]);

  // Update route with real road directions from OSRM with caching
  useEffect(() => {
    const loadRoute = async () => {
      const targetShop = selectedRouteShop || nextRecommendedShop;

      if (
        !userLocation ||
        !targetShop?.latitude ||
        !targetShop?.longitude
      ) {
        setRouteOptions([]);
        return;
      }

      // Check cache first
      const cacheKey = `${userLocation.lat},${userLocation.lng}-${targetShop.id}`;
      const cachedRoute = routeCacheRef.current.get(cacheKey);
      
      if (cachedRoute) {
        setRouteOptions(cachedRoute);
        return;
      }

      setIsLoadingRoute(true);
      setRouteError(null);

      try {
        const routes = await fetchRoute(
          { lat: userLocation.lat, lng: userLocation.lng },
          { lat: targetShop.latitude, lng: targetShop.longitude }
        );

        if (routes.length === 0) {
          setRouteError('Unable to calculate route. Please try again.');
        } else {
          setRouteOptions(routes);
          routeCacheRef.current.set(cacheKey, routes);
          
          // Store the accurate OSRM data for this shop
          const mainRoute = routes[0];
          osrmDataRef.current.set(cacheKey, {
            distance: mainRoute.distanceKm,
            time: mainRoute.durationMin
          });
        }
      } catch (err) {
        setRouteError('Error calculating route. Check your connection.');
        console.error(err);
      } finally {
        setIsLoadingRoute(false);
      }
    };

    loadRoute();
  }, [userLocation, selectedRouteShop, nextRecommendedShop, shopsWithDistance]);

  // Handle showing directions for a shop
  const handleShowDirections = (shop: Shop) => {
    setSelectedRouteShop(shop);
  };

  // Default center (Sri Lanka)
  const defaultCenter: [number, number] = [7.8731, 80.7718];
  const mapCenter: [number, number] = userLocation 
    ? [userLocation.lat, userLocation.lng] 
    : defaultCenter;

  return (
    <div className="flex flex-col h-full relative">
      {/* Map Container */}
      <div className="relative flex-1 min-h-[300px] overflow-hidden">
        <MapContainer
          center={mapCenter}
          zoom={14}
          style={{ height: '100%', width: '100%', zIndex: 1 }}
          zoomControl={false}
          preferCanvas={true}
          inertia={true}
          fadeAnimation={true}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapUpdater 
            center={mapCenter} 
            zoom={14} 
            fitBounds={routeOptions.length > 0}
            routes={routeOptions}
          />

          {/* User Location Marker with Direction */}
          {userLocation && (
            <Marker 
              position={[userLocation.lat, userLocation.lng]} 
              icon={createCustomIcon('#0284c7', true, userLocation.heading)}
            >
              <Popup>
                <div className="text-center p-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <MapPin className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="font-bold text-gray-900 mb-1">Your Location</div>
                  <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                  </div>
                  {userLocation.heading !== undefined && (
                    <div className="text-xs text-primary-600 mt-2 font-medium">
                      Heading: {userLocation.heading.toFixed(0)}°
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Route Lines - Multiple alternatives */}
          {routeOptions.map((route, index) => (
            <Polyline
              key={`route-${index}`}
              positions={route.coords}
              color={route.isMainRoute ? '#7c3aed' : '#9ca3af'}
              weight={route.isMainRoute ? 5 : 3}
              opacity={route.isMainRoute ? 0.8 : 0.5}
              dashArray={route.isMainRoute ? undefined : '12, 8'}
            />
          ))}

          {/* Shop Markers */}
          {shopsWithDistance.map((shop) => {
            if (!shop.latitude || !shop.longitude) return null;
            const isNext = shop.id === nextRecommendedShop?.id;
            const isSelected = shop.id === selectedShopId;
            
            return (
              <Marker
                key={shop.id}
                position={[shop.latitude, shop.longitude]}
                icon={getShopIcon(shop.paymentStatus, isNext, isSelected)}
                eventHandlers={{
                  click: () => onShopSelect(shop),
                }}
              >
                <Popup>
                  <div className="p-3 min-w-[220px]">
                    {/* Shop Header */}
                    <div className="flex items-center gap-3 mb-3 pb-2 border-b border-gray-100">
                      <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Store className="w-5 h-5 text-primary-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 truncate">{shop.shopName}</h4>
                        {shop.address && (
                          <p className="text-xs text-gray-500 truncate">{shop.address}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Distance & Time */}
                    <div className="flex items-center gap-3 mb-3">
                      {shop.distance !== undefined && (
                        <div className="flex items-center gap-1.5 bg-primary-50 text-primary-700 px-2.5 py-1.5 rounded-lg">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="text-xs font-semibold">{shop.distance.toFixed(1)} km</span>
                        </div>
                      )}
                      {shop.estimatedTime !== undefined && (
                        <div className="flex items-center gap-1.5 bg-orange-50 text-orange-700 px-2.5 py-1.5 rounded-lg">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-xs font-semibold">~{shop.estimatedTime} min</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Status Badges */}
                    {isNext && (
                      <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs px-3 py-2 rounded-lg mb-3 text-center font-semibold shadow-sm">
                        ⭐ Recommended Next Stop
                      </div>
                    )}
                    {selectedRouteShop?.id === shop.id && (
                      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white text-xs px-3 py-2 rounded-lg mb-3 text-center font-semibold shadow-sm">
                        📍 Route Active
                      </div>
                    )}
                    
                    {/* Action Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShowDirections(shop);
                      }}
                      className={`w-full text-white text-sm py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-semibold transition-all active:scale-95 ${
                        selectedRouteShop?.id === shop.id 
                          ? 'bg-green-600 hover:bg-green-700 shadow-green-200' 
                          : 'bg-primary-600 hover:bg-primary-700 shadow-primary-200'
                      } shadow-lg`}
                    >
                      <Navigation className="w-4 h-4" />
                      {selectedRouteShop?.id === shop.id ? 'Route Active' : 'Show Route'}
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Map Legend - Compact */}
        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md rounded-xl shadow-lg p-3 z-[400] border border-gray-100">
          <div className="text-xs font-bold text-gray-800 mb-2 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
            Legend
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-primary-500 ring-2 ring-primary-200"></div>
              <span className="text-gray-600">You</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500 ring-2 ring-purple-200"></div>
              <span className="text-gray-600">Next</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-green-200"></div>
              <span className="text-gray-600">Paid</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-orange-500 ring-2 ring-orange-200"></div>
              <span className="text-gray-600">Pending</span>
            </div>
            <div className="flex items-center gap-1.5 col-span-2 mt-1 pt-1.5 border-t border-gray-200">
              <div className="h-0.5 w-3 bg-purple-500"></div>
              <span className="text-gray-600">Main Route</span>
            </div>
            <div className="flex items-center gap-1.5 col-span-2">
              <div className="h-0.5 w-3 bg-gray-300" style={{backgroundImage: 'repeating-linear-gradient(90deg, #9ca3af 0px, #9ca3af 2px, transparent 2px, transparent 4px)'}}></div>
              <span className="text-gray-600">Alternative</span>
            </div>
          </div>
        </div>

        {/* Route Info Card with Loading & Error States */}
        {routeError && (
          <div className="absolute bottom-3 left-3 right-3 bg-red-50 border border-red-200 rounded-2xl shadow-lg p-4 z-[400]">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-lg">⚠️</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-red-900 text-sm">{routeError}</p>
                <p className="text-xs text-red-700 mt-1">Check your internet connection</p>
              </div>
            </div>
          </div>
        )}

        {isLoadingRoute && (
          <div className="absolute bottom-3 left-3 right-3 bg-blue-50 border border-blue-200 rounded-2xl shadow-lg p-4 z-[400]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0 animate-spin">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-blue-600 rounded-full"></div>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-blue-900 text-sm">Calculating best route…</p>
                <p className="text-xs text-blue-700 mt-1">Fetching directions from OSRM</p>
              </div>
            </div>
          </div>
        )}

        {!routeError && !isLoadingRoute && (selectedRouteShop || nextRecommendedShop) && userLocation && (
          <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-4 z-[400] border border-gray-100">
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                selectedRouteShop 
                  ? 'bg-gradient-to-br from-primary-500 to-primary-600' 
                  : 'bg-gradient-to-br from-purple-500 to-purple-600'
              } shadow-lg`}>
                <Navigation className="w-6 h-6 text-white" />
              </div>
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold uppercase tracking-wide ${
                  selectedRouteShop ? 'text-primary-600' : 'text-purple-600'
                }`}>
                  {selectedRouteShop ? 'Navigate to' : '⭐ Next Stop'}
                </p>
                <p className="font-bold text-gray-900 text-lg truncate">
                  {(selectedRouteShop || nextRecommendedShop)?.shopName}
                </p>
                <div className="flex items-center gap-4 mt-1 flex-wrap">
                  {/* Show OSRM data if available */}
                  {routeOptions.length > 0 && routeOptions[0] && (
                    <>
                      <span className="flex items-center gap-1.5 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 text-primary-500" />
                        <span className="font-semibold">{routeOptions[0].distanceKm.toFixed(1)} km</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Clock className="w-4 h-4 text-orange-500" />
                        <span className="font-semibold">~{routeOptions[0].durationMin} min</span>
                      </span>
                    </>
                  )}
                  {/* Fallback to estimated data */}
                  {routeOptions.length === 0 && (selectedRouteShop || nextRecommendedShop) && (
                    <>
                      <span className="flex items-center gap-1.5 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 text-primary-500" />
                        <span className="font-semibold">{(selectedRouteShop || nextRecommendedShop)?.distance?.toFixed(1)} km</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Clock className="w-4 h-4 text-orange-500" />
                        <span className="font-semibold">~{(selectedRouteShop || nextRecommendedShop)?.estimatedTime} min</span>
                      </span>
                    </>
                  )}
                </div>

                {/* Show alternative routes info */}
                {routeOptions.length > 1 && (
                  <p className="text-xs text-gray-500 mt-2 font-medium">
                    {routeOptions.length} route options available
                  </p>
                )}
              </div>
              
              {/* Clear Button */}
              {selectedRouteShop && (
                <button
                  onClick={() => setSelectedRouteShop(null)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default ShopMapView;

