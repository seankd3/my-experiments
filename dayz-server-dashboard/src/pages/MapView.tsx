import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  MapContainer,
  ImageOverlay,
  Marker,
  Polyline,
  Tooltip,
  useMapEvents,
  useMap,
  ZoomControl,
} from 'react-leaflet';
import L from 'leaflet';
import {
  Search,
  Filter,
  Users,
  Car,
  Tent,
  Flag,
  Box,
  Eye,
  EyeOff,
  MapPin,
  Navigation,
  Heart,
  UserX,
  MessageSquare,
  Shield,
  Package,
  X,
  Crosshair,
  Layers,
  Move,
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ContextMenu from '../components/ui/ContextMenu';
import Modal from '../components/ui/Modal';
import { useMapStore } from '../store/mapStore';
import { useServerStore } from '../store/serverStore';
import {
  useMapEntities,
  usePlayerPositions,
  useTeleportPlayer,
  useSpawnItem,
} from '../api/hooks';
import { useToastStore } from '../store/toastStore';
import type { MapEntity, Position } from '../types';

// ============ SVG Marker Icons ============

function createSvgIcon(svg: string, size: [number, number] = [24, 24]): L.DivIcon {
  return L.divIcon({
    html: svg,
    className: 'custom-marker',
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1] / 2],
  });
}

const playerIcon = (color = '#4a6741', direction = 0) =>
  createSvgIcon(
    `<svg width="24" height="24" viewBox="0 0 24 24" style="transform: rotate(${direction}deg)">
      <circle cx="12" cy="12" r="8" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="2"/>
      <circle cx="12" cy="12" r="4" fill="${color}"/>
      <polygon points="12,2 15,8 9,8" fill="${color}" opacity="0.8"/>
    </svg>`
  );

const vehicleIcon = createSvgIcon(
  `<svg width="28" height="28" viewBox="0 0 28 28">
    <rect x="4" y="8" width="20" height="12" rx="3" fill="#3b82f6" fill-opacity="0.3" stroke="#3b82f6" stroke-width="1.5"/>
    <circle cx="9" cy="20" r="2.5" fill="#3b82f6"/>
    <circle cx="19" cy="20" r="2.5" fill="#3b82f6"/>
    <rect x="6" y="10" width="8" height="6" rx="1" fill="#3b82f6" fill-opacity="0.5"/>
  </svg>`,
  [28, 28]
);

const tentIcon = createSvgIcon(
  `<svg width="24" height="24" viewBox="0 0 24 24">
    <polygon points="12,3 22,20 2,20" fill="#a855f7" fill-opacity="0.3" stroke="#a855f7" stroke-width="1.5"/>
    <line x1="12" y1="3" x2="12" y2="20" stroke="#a855f7" stroke-width="1" opacity="0.5"/>
    <rect x="10" y="15" width="4" height="5" fill="#a855f7" fill-opacity="0.4"/>
  </svg>`
);

const flagIcon = createSvgIcon(
  `<svg width="24" height="24" viewBox="0 0 24 24">
    <line x1="6" y1="4" x2="6" y2="22" stroke="#f59e0b" stroke-width="2"/>
    <polygon points="6,4 20,8 6,12" fill="#f59e0b" fill-opacity="0.5" stroke="#f59e0b" stroke-width="1"/>
  </svg>`
);

const stashIcon = createSvgIcon(
  `<svg width="20" height="20" viewBox="0 0 20 20">
    <rect x="3" y="6" width="14" height="10" rx="2" fill="#ef4444" fill-opacity="0.3" stroke="#ef4444" stroke-width="1.5"/>
    <line x1="3" y1="10" x2="17" y2="10" stroke="#ef4444" stroke-width="1" opacity="0.5"/>
    <rect x="8" y="8" width="4" height="2" rx="0.5" fill="#ef4444"/>
  </svg>`,
  [20, 20]
);

const entityIcons: Record<string, L.DivIcon> = {
  vehicle: vehicleIcon,
  tent: tentIcon,
  flag: flagIcon,
  stash: stashIcon,
};

// ============ Map Config ============

const MAP_SIZE = 15360;
const MAP_BOUNDS: L.LatLngBoundsExpression = [
  [0, 0],
  [MAP_SIZE, MAP_SIZE],
];

// Create a simple grid-based Chernarus map as a canvas data URL
function createMapImage(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Background - terrain
  ctx.fillStyle = '#1a2e1a';
  ctx.fillRect(0, 0, 1024, 1024);

  // Water/coast (right and bottom edges)
  ctx.fillStyle = '#0a1628';
  ctx.beginPath();
  ctx.moveTo(1024, 0);
  ctx.lineTo(1024, 1024);
  ctx.lineTo(0, 1024);
  ctx.lineTo(0, 900);
  ctx.quadraticCurveTo(200, 880, 400, 920);
  ctx.quadraticCurveTo(600, 960, 800, 940);
  ctx.quadraticCurveTo(900, 930, 1024, 950);
  ctx.closePath();
  ctx.fill();

  // Eastern coast
  ctx.beginPath();
  ctx.moveTo(1024, 0);
  ctx.lineTo(1024, 950);
  ctx.lineTo(950, 940);
  ctx.quadraticCurveTo(960, 700, 940, 500);
  ctx.quadraticCurveTo(950, 300, 970, 100);
  ctx.quadraticCurveTo(980, 50, 1024, 0);
  ctx.closePath();
  ctx.fill();

  // Grid lines
  ctx.strokeStyle = 'rgba(74, 103, 65, 0.15)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 15; i++) {
    const pos = (i / 15) * 1024;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, 1024);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(1024, pos);
    ctx.stroke();
  }

  // Grid labels
  ctx.fillStyle = 'rgba(74, 103, 65, 0.4)';
  ctx.font = '10px monospace';
  for (let i = 0; i <= 15; i++) {
    const pos = (i / 15) * 1024;
    ctx.fillText(String(i), pos + 2, 12);
    ctx.fillText(String(15 - i), 2, pos + 12);
  }

  // Forests (darker patches)
  const forests = [
    [200, 100, 150, 120],
    [500, 200, 180, 100],
    [100, 400, 120, 150],
    [600, 400, 200, 180],
    [300, 600, 150, 100],
  ];
  ctx.fillStyle = 'rgba(20, 50, 20, 0.5)';
  forests.forEach(([x, y, w, h]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // Roads
  ctx.strokeStyle = 'rgba(100, 90, 70, 0.4)';
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  // Main coastal road
  ctx.beginPath();
  ctx.moveTo(0, 850);
  ctx.quadraticCurveTo(200, 830, 400, 860);
  ctx.quadraticCurveTo(600, 880, 800, 870);
  ctx.quadraticCurveTo(900, 860, 920, 800);
  ctx.quadraticCurveTo(910, 600, 920, 400);
  ctx.quadraticCurveTo(930, 200, 950, 50);
  ctx.stroke();
  // Inland road
  ctx.beginPath();
  ctx.moveTo(100, 850);
  ctx.quadraticCurveTo(200, 700, 300, 500);
  ctx.quadraticCurveTo(400, 400, 500, 300);
  ctx.quadraticCurveTo(600, 200, 700, 150);
  ctx.stroke();

  // Cities (small squares with labels)
  const cities = [
    { x: 180, y: 830, name: 'Chernogorsk', size: 40 },
    { x: 450, y: 860, name: 'Elektro', size: 35 },
    { x: 700, y: 840, name: 'Berezino', size: 30 },
    { x: 900, y: 200, name: 'Svetlojarsk', size: 25 },
    { x: 150, y: 600, name: 'Zelenogorsk', size: 25 },
    { x: 400, y: 400, name: 'Stary Sobor', size: 20 },
    { x: 500, y: 450, name: 'Novy Sobor', size: 18 },
    { x: 600, y: 150, name: 'Severograd', size: 22 },
    { x: 350, y: 250, name: 'Vybor', size: 20 },
    { x: 200, y: 200, name: 'NW Airfield', size: 30 },
    { x: 850, y: 500, name: 'Solnechny', size: 20 },
    { x: 750, y: 300, name: 'Gorka', size: 18 },
  ];

  cities.forEach((city) => {
    ctx.fillStyle = 'rgba(60, 60, 80, 0.6)';
    ctx.fillRect(
      city.x - city.size / 2,
      city.y - city.size / 2,
      city.size,
      city.size
    );
    ctx.strokeStyle = 'rgba(100, 100, 130, 0.4)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(
      city.x - city.size / 2,
      city.y - city.size / 2,
      city.size,
      city.size
    );
    ctx.fillStyle = 'rgba(180, 180, 200, 0.7)';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(city.name, city.x, city.y - city.size / 2 - 3);
    ctx.textAlign = 'start';
  });

  return canvas.toDataURL();
}

// ============ Map Event Handlers ============

function MapEventHandler({
  onContextMenu,
  onMouseMove,
}: {
  onContextMenu: (e: L.LeafletMouseEvent) => void;
  onMouseMove: (pos: Position) => void;
}) {
  useMapEvents({
    contextmenu: (e) => {
      e.originalEvent.preventDefault();
      onContextMenu(e);
    },
    mousemove: (e) => {
      onMouseMove({ x: Math.round(e.latlng.lng), y: Math.round(e.latlng.lat) });
    },
  });
  return null;
}

function FlyToEntity({ position }: { position: Position | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo([position.y, position.x], 6, { duration: 0.5 });
    }
  }, [position, map]);
  return null;
}

// ============ Main Component ============

export default function MapView() {
  const { activeServer, rconConnected } = useServerStore();
  const {
    entities,
    setEntities,
    filters,
    toggleFilter,
    cursorPosition,
    setCursorPosition,
    contextMenuPosition,
    setContextMenuPosition,
    selectedEntity,
    setSelectedEntity,
    searchQuery,
    setSearchQuery,
    getFilteredEntities,
    playerPositions,
    draggedPlayer,
    setDraggedPlayer,
  } = useMapStore();
  const { addToast } = useToastStore();

  const { data: mapEntities } = useMapEntities(activeServer?.id);
  const { data: playerPositionsData } = usePlayerPositions(activeServer?.id);
  const teleportPlayer = useTeleportPlayer(activeServer?.id);
  const spawnItem = useSpawnItem(activeServer?.id);

  const [showFilters, setShowFilters] = useState(true);
  const [showTeleportConfirm, setShowTeleportConfirm] = useState(false);
  const [teleportTarget, setTeleportTarget] = useState<{
    entity: MapEntity;
    position: Position;
  } | null>(null);
  const [showSpawnModal, setShowSpawnModal] = useState(false);
  const [spawnPosition, setSpawnPosition] = useState<Position | null>(null);
  const [spawnItemName, setSpawnItemName] = useState('');
  const [flyToPos, setFlyToPos] = useState<Position | null>(null);

  const [mapImage] = useState(createMapImage);

  // Update entities from API
  useEffect(() => {
    if (mapEntities) setEntities(mapEntities);
  }, [mapEntities, setEntities]);

  const filteredEntities = getFilteredEntities();

  const entityCounts = useMemo(() => {
    const counts = { player: 0, vehicle: 0, tent: 0, flag: 0, stash: 0 };
    entities.forEach((e) => {
      if (e.type in counts) counts[e.type as keyof typeof counts]++;
    });
    return counts;
  }, [entities]);

  // Context menu for right-click on map
  const handleContextMenu = useCallback(
    (e: L.LeafletMouseEvent) => {
      const pos = {
        x: e.originalEvent.clientX,
        y: e.originalEvent.clientY,
        mapPos: { x: Math.round(e.latlng.lng), y: Math.round(e.latlng.lat) },
      };
      setContextMenuPosition(pos);
      setSelectedEntity(null);
    },
    [setContextMenuPosition, setSelectedEntity]
  );

  // Context menu for player click
  const handleEntityClick = (entity: MapEntity) => {
    setSelectedEntity(entity);
    setContextMenuPosition(null);
  };

  const handleTeleportConfirm = () => {
    if (teleportTarget) {
      teleportPlayer.mutate(
        {
          playerId: teleportTarget.entity.id,
          position: teleportTarget.position,
        },
        {
          onSuccess: () => {
            addToast('success', `Teleported ${teleportTarget.entity.name}`);
            setShowTeleportConfirm(false);
            setTeleportTarget(null);
          },
          onError: () => {
            addToast('error', 'Teleport failed');
          },
        }
      );
    }
  };

  const handleSpawnConfirm = () => {
    if (spawnPosition && spawnItemName) {
      spawnItem.mutate(
        { item: spawnItemName, position: spawnPosition },
        {
          onSuccess: () => {
            addToast('success', `Spawned ${spawnItemName}`);
            setShowSpawnModal(false);
            setSpawnItemName('');
          },
          onError: () => addToast('error', 'Spawn failed'),
        }
      );
    }
  };

  const handleSearchSelect = (entity: MapEntity) => {
    setFlyToPos(entity.position);
    setSearchQuery('');
  };

  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    return entities
      .filter((e) => e.name.toLowerCase().includes(q))
      .slice(0, 10);
  }, [searchQuery, entities]);

  // Player context menu items
  const getPlayerContextItems = (entity: MapEntity) => [
    {
      label: 'Teleport To',
      icon: <Navigation className="w-4 h-4" />,
      onClick: () => {
        setTeleportTarget({ entity, position: entity.position });
        setShowTeleportConfirm(true);
      },
    },
    {
      label: 'Heal',
      icon: <Heart className="w-4 h-4" />,
      onClick: () => addToast('info', `Healing ${entity.name}`),
    },
    {
      label: 'Godmode',
      icon: <Shield className="w-4 h-4" />,
      onClick: () => addToast('info', `Godmode for ${entity.name}`),
    },
    {
      label: 'Message',
      icon: <MessageSquare className="w-4 h-4" />,
      onClick: () => addToast('info', `Message ${entity.name}`),
    },
    { label: '', onClick: () => {}, divider: true },
    {
      label: 'Kick',
      icon: <UserX className="w-4 h-4" />,
      onClick: () => addToast('warning', `Kick ${entity.name}`),
      danger: true,
    },
  ];

  // Map empty space context menu
  const getMapContextItems = (pos: Position) => [
    {
      label: `Spawn Item Here (${pos.x}, ${pos.y})`,
      icon: <Package className="w-4 h-4" />,
      onClick: () => {
        setSpawnPosition(pos);
        setShowSpawnModal(true);
      },
    },
  ];

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4 animate-fade-in">
      {/* Map */}
      <div className="flex-1 relative rounded-lg overflow-hidden border border-surface-700/50">
        <MapContainer
          center={[MAP_SIZE / 2, MAP_SIZE / 2]}
          zoom={2}
          minZoom={1}
          maxZoom={8}
          crs={L.CRS.Simple}
          maxBounds={[
            [-1000, -1000],
            [MAP_SIZE + 1000, MAP_SIZE + 1000],
          ]}
          style={{ height: '100%', width: '100%', background: '#0d0d1a' }}
          zoomControl={false}
          attributionControl={false}
        >
          <ZoomControl position="bottomright" />
          <ImageOverlay url={mapImage} bounds={MAP_BOUNDS} />
          <FlyToEntity position={flyToPos} />
          <MapEventHandler
            onContextMenu={handleContextMenu}
            onMouseMove={setCursorPosition}
          />

          {/* Render entities */}
          {filteredEntities.map((entity) => {
            const isPlayer = entity.type === 'player';
            const icon = isPlayer
              ? playerIcon('#4a6741', entity.direction || 0)
              : entityIcons[entity.type] || stashIcon;

            return (
              <React.Fragment key={entity.id}>
                {/* Position trail */}
                {isPlayer && filters.showTrails && (
                  (() => {
                    const trail = playerPositions.get(entity.id);
                    if (trail && trail.length > 1) {
                      return (
                        <Polyline
                          positions={trail.map((p) => [p.y, p.x] as [number, number])}
                          color="#4a6741"
                          weight={1.5}
                          opacity={0.4}
                          dashArray="4 4"
                        />
                      );
                    }
                    return null;
                  })()
                )}

                <Marker
                  position={[entity.position.y, entity.position.x]}
                  icon={icon}
                  draggable={isPlayer && rconConnected}
                  eventHandlers={{
                    click: () => handleEntityClick(entity),
                    dragstart: () => {
                      if (isPlayer) setDraggedPlayer(entity);
                    },
                    dragend: (e) => {
                      if (isPlayer && draggedPlayer) {
                        const pos = e.target.getLatLng();
                        setTeleportTarget({
                          entity: draggedPlayer,
                          position: { x: Math.round(pos.lng), y: Math.round(pos.lat) },
                        });
                        setShowTeleportConfirm(true);
                        setDraggedPlayer(null);
                      }
                    },
                  }}
                >
                  {filters.showLabels && (
                    <Tooltip
                      direction="top"
                      offset={[0, -15]}
                      permanent={isPlayer}
                      className={isPlayer ? 'player-label' : 'entity-label'}
                    >
                      {entity.name}
                    </Tooltip>
                  )}
                </Marker>
              </React.Fragment>
            );
          })}
        </MapContainer>

        {/* Search Bar Overlay */}
        <div className="absolute top-4 left-4 z-[1000] w-72">
          <div className="relative">
            <Input
              placeholder="Search players, entities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-4 h-4" />}
              className="bg-surface-800/95 backdrop-blur"
            />
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 w-full mt-1 bg-surface-800 border border-surface-600/50 rounded-lg shadow-2xl max-h-60 overflow-y-auto z-[1001]">
                {searchResults.map((entity) => (
                  <button
                    key={entity.id}
                    onClick={() => handleSearchSelect(entity)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-surface-700/50 transition-colors text-left"
                  >
                    <span className="text-xs text-gray-500 uppercase w-14">
                      {entity.type}
                    </span>
                    <span className="text-sm text-gray-200 truncate">
                      {entity.name}
                    </span>
                    <span className="text-[10px] text-gray-600 font-mono ml-auto">
                      {Math.round(entity.position.x)}, {Math.round(entity.position.y)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Coordinate Display */}
        <div className="absolute bottom-4 left-4 z-[1000] bg-surface-800/90 backdrop-blur border border-surface-700/50 rounded-lg px-3 py-1.5">
          <span className="text-xs text-gray-400 font-mono">
            <MapPin className="w-3 h-3 inline mr-1" />
            {cursorPosition
              ? `X: ${cursorPosition.x} Y: ${cursorPosition.y}`
              : 'Move cursor on map'}
          </span>
        </div>

        {/* Entity Count Legend */}
        <div className="absolute bottom-4 right-16 z-[1000] flex items-center gap-2">
          {[
            { type: 'player', color: 'bg-green-500', count: entityCounts.player, icon: Users },
            { type: 'vehicle', color: 'bg-blue-500', count: entityCounts.vehicle, icon: Car },
            { type: 'tent', color: 'bg-purple-500', count: entityCounts.tent, icon: Tent },
            { type: 'flag', color: 'bg-yellow-500', count: entityCounts.flag, icon: Flag },
            { type: 'stash', color: 'bg-red-500', count: entityCounts.stash, icon: Box },
          ].map(({ type, color, count, icon: Icon }) => (
            <div
              key={type}
              className="flex items-center gap-1.5 bg-surface-800/90 backdrop-blur border border-surface-700/50 rounded px-2 py-1"
            >
              <span className={`w-2 h-2 rounded-full ${color}`} />
              <Icon className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-300 font-mono">{count}</span>
            </div>
          ))}
        </div>

        {/* Context Menu */}
        {contextMenuPosition && !selectedEntity && (
          <ContextMenu
            x={contextMenuPosition.x}
            y={contextMenuPosition.y}
            items={getMapContextItems(contextMenuPosition.mapPos)}
            onClose={() => setContextMenuPosition(null)}
          />
        )}

        {/* Player Context Menu */}
        {selectedEntity && selectedEntity.type === 'player' && (
          <div className="absolute top-4 right-4 z-[1000] w-64 bg-surface-800 border border-surface-600/50 rounded-lg shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700/50">
              <div>
                <p className="text-sm font-semibold text-gray-200">
                  {selectedEntity.name}
                </p>
                <p className="text-[10px] text-gray-500 font-mono">
                  {Math.round(selectedEntity.position.x)},{' '}
                  {Math.round(selectedEntity.position.y)}
                </p>
              </div>
              <button
                onClick={() => setSelectedEntity(null)}
                className="p-1 rounded hover:bg-surface-700 text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2">
              {getPlayerContextItems(selectedEntity).map((item, i) =>
                item.divider ? (
                  <div key={i} className="my-1 border-t border-surface-700/50" />
                ) : (
                  <button
                    key={i}
                    className={`
                      w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm text-left transition-colors
                      ${item.danger ? 'text-danger-400 hover:bg-danger-900/30' : 'text-gray-300 hover:bg-surface-700/50'}
                    `}
                    onClick={() => {
                      item.onClick();
                      setSelectedEntity(null);
                    }}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="w-64 flex-shrink-0 space-y-4">
          <Card>
            <CardHeader>
              <Filter className="w-4 h-4 text-primary-400" />
              <h3 className="text-sm font-semibold text-gray-200">Filters</h3>
            </CardHeader>
            <CardBody className="space-y-2">
              {[
                { key: 'showPlayers' as const, label: 'Players', icon: Users, color: 'text-green-400', count: entityCounts.player },
                { key: 'showVehicles' as const, label: 'Vehicles', icon: Car, color: 'text-blue-400', count: entityCounts.vehicle },
                { key: 'showTents' as const, label: 'Tents', icon: Tent, color: 'text-purple-400', count: entityCounts.tent },
                { key: 'showFlags' as const, label: 'Flags', icon: Flag, color: 'text-yellow-400', count: entityCounts.flag },
                { key: 'showStashes' as const, label: 'Stashes', icon: Box, color: 'text-red-400', count: entityCounts.stash },
              ].map(({ key, label, icon: Icon, color, count }) => (
                <button
                  key={key}
                  onClick={() => toggleFilter(key)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                    ${filters[key] ? 'bg-surface-700/50' : 'bg-surface-900/30 opacity-50'}
                  `}
                >
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className="text-sm text-gray-300 flex-1 text-left">
                    {label}
                  </span>
                  <span className="text-xs text-gray-500 font-mono">{count}</span>
                  {filters[key] ? (
                    <Eye className="w-3.5 h-3.5 text-gray-500" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-gray-600" />
                  )}
                </button>
              ))}

              <div className="pt-2 border-t border-surface-700/50 space-y-2">
                <button
                  onClick={() => toggleFilter('showTrails')}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                    ${filters.showTrails ? 'bg-surface-700/50' : 'bg-surface-900/30 opacity-50'}
                  `}
                >
                  <Move className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-300 flex-1 text-left">
                    Player Trails
                  </span>
                </button>
                <button
                  onClick={() => toggleFilter('showLabels')}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                    ${filters.showLabels ? 'bg-surface-700/50' : 'bg-surface-900/30 opacity-50'}
                  `}
                >
                  <Layers className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-300 flex-1 text-left">
                    Labels
                  </span>
                </button>
              </div>
            </CardBody>
          </Card>

          {/* Entity Info */}
          {selectedEntity && selectedEntity.type !== 'player' && (
            <Card>
              <CardHeader>
                <Crosshair className="w-4 h-4 text-accent-400" />
                <h3 className="text-sm font-semibold text-gray-200">
                  Selected Entity
                </h3>
              </CardHeader>
              <CardBody className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Name</span>
                  <span className="text-sm text-gray-200">{selectedEntity.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Type</span>
                  <Badge variant="primary" size="sm">{selectedEntity.type}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Position</span>
                  <span className="text-xs text-gray-300 font-mono">
                    {Math.round(selectedEntity.position.x)},{' '}
                    {Math.round(selectedEntity.position.y)}
                  </span>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {/* Toggle Filters Button */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="absolute top-20 right-4 z-[1000] p-2 bg-surface-800/90 border border-surface-700/50 rounded-lg text-gray-400 hover:text-gray-200 transition-colors"
        title={showFilters ? 'Hide Filters' : 'Show Filters'}
      >
        <Filter className="w-4 h-4" />
      </button>

      {/* Teleport Confirmation Modal */}
      <Modal
        isOpen={showTeleportConfirm}
        onClose={() => {
          setShowTeleportConfirm(false);
          setTeleportTarget(null);
        }}
        title="Confirm Teleport"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setShowTeleportConfirm(false);
                setTeleportTarget(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleTeleportConfirm}
              loading={teleportPlayer.isPending}
            >
              Teleport
            </Button>
          </>
        }
      >
        {teleportTarget && (
          <div className="space-y-3">
            <p className="text-sm text-gray-300">
              Teleport <span className="font-semibold text-gray-100">{teleportTarget.entity.name}</span> to:
            </p>
            <div className="bg-surface-900/60 rounded-lg p-3 font-mono text-sm text-gray-300">
              X: {teleportTarget.position.x}, Y: {teleportTarget.position.y}
            </div>
          </div>
        )}
      </Modal>

      {/* Spawn Item Modal */}
      <Modal
        isOpen={showSpawnModal}
        onClose={() => {
          setShowSpawnModal(false);
          setSpawnItemName('');
        }}
        title="Spawn Item"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowSpawnModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSpawnConfirm}
              disabled={!spawnItemName.trim()}
              loading={spawnItem.isPending}
            >
              Spawn
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {spawnPosition && (
            <div className="bg-surface-900/60 rounded-lg p-3 font-mono text-xs text-gray-400">
              Location: X: {spawnPosition.x}, Y: {spawnPosition.y}
            </div>
          )}
          <Input
            label="Item Class Name"
            value={spawnItemName}
            onChange={(e) => setSpawnItemName(e.target.value)}
            placeholder="e.g. AKM, M4A1, SodaCan..."
          />
        </div>
      </Modal>
    </div>
  );
}
