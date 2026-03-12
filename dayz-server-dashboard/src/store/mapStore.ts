import { create } from 'zustand';
import type { MapEntity, MapFilters, Position } from '../types';

interface MapState {
  entities: MapEntity[];
  playerPositions: Map<string, Position[]>;
  selectedEntity: MapEntity | null;
  mapCenter: Position;
  zoom: number;
  filters: MapFilters;
  draggedPlayer: MapEntity | null;
  cursorPosition: Position | null;
  searchQuery: string;
  contextMenuPosition: { x: number; y: number; mapPos: Position } | null;

  setEntities: (entities: MapEntity[]) => void;
  updatePlayerPosition: (playerId: string, position: Position) => void;
  setSelectedEntity: (entity: MapEntity | null) => void;
  setMapCenter: (center: Position) => void;
  setZoom: (zoom: number) => void;
  setFilter: <K extends keyof MapFilters>(key: K, value: MapFilters[K]) => void;
  toggleFilter: (key: keyof MapFilters) => void;
  setDraggedPlayer: (entity: MapEntity | null) => void;
  setCursorPosition: (pos: Position | null) => void;
  setSearchQuery: (query: string) => void;
  setContextMenuPosition: (
    pos: { x: number; y: number; mapPos: Position } | null
  ) => void;
  getFilteredEntities: () => MapEntity[];
}

export const useMapStore = create<MapState>((set, get) => ({
  entities: [],
  playerPositions: new Map(),
  selectedEntity: null,
  mapCenter: { x: 7680, y: 7680 },
  zoom: 2,
  filters: {
    showPlayers: true,
    showVehicles: true,
    showTents: true,
    showFlags: true,
    showStashes: true,
    showTrails: true,
    showLabels: true,
  },
  draggedPlayer: null,
  cursorPosition: null,
  searchQuery: '',
  contextMenuPosition: null,

  setEntities: (entities) => {
    // Update position trails for players
    const { playerPositions } = get();
    const newPositions = new Map(playerPositions);
    entities
      .filter((e) => e.type === 'player')
      .forEach((entity) => {
        const trail = newPositions.get(entity.id) || [];
        const lastPos = trail[trail.length - 1];
        if (
          !lastPos ||
          lastPos.x !== entity.position.x ||
          lastPos.y !== entity.position.y
        ) {
          newPositions.set(entity.id, [...trail.slice(-20), entity.position]);
        }
      });
    set({ entities, playerPositions: newPositions });
  },

  updatePlayerPosition: (playerId, position) => {
    set((state) => {
      const trail = state.playerPositions.get(playerId) || [];
      const newPositions = new Map(state.playerPositions);
      newPositions.set(playerId, [...trail.slice(-20), position]);
      return {
        playerPositions: newPositions,
        entities: state.entities.map((e) =>
          e.id === playerId ? { ...e, position } : e
        ),
      };
    });
  },

  setSelectedEntity: (entity) => set({ selectedEntity: entity }),
  setMapCenter: (center) => set({ mapCenter: center }),
  setZoom: (zoom) => set({ zoom }),
  setFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),
  toggleFilter: (key) =>
    set((state) => ({
      filters: { ...state.filters, [key]: !state.filters[key] },
    })),
  setDraggedPlayer: (entity) => set({ draggedPlayer: entity }),
  setCursorPosition: (pos) => set({ cursorPosition: pos }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setContextMenuPosition: (pos) => set({ contextMenuPosition: pos }),

  getFilteredEntities: () => {
    const { entities, filters, searchQuery } = get();
    let filtered = entities.filter((entity) => {
      switch (entity.type) {
        case 'player':
          return filters.showPlayers;
        case 'vehicle':
          return filters.showVehicles;
        case 'tent':
          return filters.showTents;
        case 'flag':
          return filters.showFlags;
        case 'stash':
          return filters.showStashes;
        default:
          return true;
      }
    });
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((e) => e.name.toLowerCase().includes(q));
    }
    return filtered;
  },
}));
