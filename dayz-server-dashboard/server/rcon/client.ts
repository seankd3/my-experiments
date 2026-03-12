// BattlEye RCON client (simulated) for DayZ server communication

import { EventEmitter } from 'events';
import { RCONConfig, OnlinePlayer, InventoryItem, ServerStatus, MapEntityType } from '../types';

// ── Realistic DayZ Data ─────────────────────────────────────────────

const PLAYER_NAMES = [
  'SurvivorJoe', 'DayZKiller99', 'BeanBandit', 'ChernoBoy', 'CoastRunner',
  'FreshSpawnKing', 'GhillieMaster', 'HeliPilot', 'IzurvivPro', 'KamyshKid',
  'LootGoblin', 'MilBaseRaider', 'NightStalker', 'OverwatchSniper', 'PvPChad',
  'QuietWalker', 'RoofCamper', 'StaryTrader', 'TisyRunner', 'UmpLover',
  'VeteranBear', 'WolfHunter', 'XM8Enjoyer', 'YellowArmband', 'ZombieSlayer',
  'BambiProtector', 'CannibalChef', 'DuctTapeLord', 'ElectroSniper', 'Freshie42',
];

const STEAM_IDS = PLAYER_NAMES.map((_, i) => `7656119800000${(1000 + i).toString()}`);

const VEHICLE_NAMES = [
  'Olga 24', 'Gunter 2', 'Ada 4x4', 'Sarka 120', 'M3S',
  'Offroad Hatchback', 'Sedan', 'Truck Civilian', 'PBX Boat', 'Helicopter UH-1H',
];

const WEAPON_NAMES = [
  'M4A1', 'KA-M', 'AKM', 'KA-101', 'LAR', 'VSD', 'SVD', 'Mosin 91/30',
  'CR-527', 'Tundra', 'Pioneer', 'Blaze', 'BK-18', 'BK-43', 'Vaiga',
  'SG5-K', 'USG-45', 'KAS-74U', 'M16-A2', 'FAMAS', 'AUR A1', 'AUR AX',
  'Le Mas', 'SSG 82', 'SK 59/66',
];

const INVENTORY_ITEMS: InventoryItem[] = [
  { name: 'M4A1', slot: 'Shoulder', quantity: 1, condition: 'Worn' },
  { name: 'Plate Carrier', slot: 'Vest', quantity: 1, condition: 'Pristine' },
  { name: 'Assault Helmet', slot: 'Head', quantity: 1, condition: 'Damaged' },
  { name: 'Military Boots', slot: 'Feet', quantity: 1, condition: 'Worn' },
  { name: 'Gorka Military Pants', slot: 'Legs', quantity: 1, condition: 'Pristine' },
  { name: 'M65 Field Jacket', slot: 'Top', quantity: 1, condition: 'Worn' },
  { name: 'Mountain Backpack', slot: 'Back', quantity: 1, condition: 'Badly Damaged' },
  { name: 'STANAG 30rd Mag', slot: 'Inventory', quantity: 3, condition: 'Pristine' },
  { name: '5.56x45mm Ammo', slot: 'Inventory', quantity: 120, condition: 'Pristine' },
  { name: 'Bandage', slot: 'Inventory', quantity: 4, condition: 'Pristine' },
  { name: 'Morphine Auto-Injector', slot: 'Inventory', quantity: 2, condition: 'Pristine' },
  { name: 'Saline Bag IV', slot: 'Inventory', quantity: 1, condition: 'Pristine' },
  { name: 'Canned Peaches', slot: 'Inventory', quantity: 2, condition: 'Pristine' },
  { name: 'Water Bottle', slot: 'Inventory', quantity: 1, condition: 'Worn' },
  { name: 'Combat Knife', slot: 'Inventory', quantity: 1, condition: 'Pristine' },
  { name: 'NV Goggles', slot: 'Inventory', quantity: 1, condition: 'Worn' },
  { name: 'Compass', slot: 'Inventory', quantity: 1, condition: 'Pristine' },
  { name: 'Duct Tape', slot: 'Inventory', quantity: 1, condition: 'Damaged' },
  { name: 'Epoxy Putty', slot: 'Inventory', quantity: 1, condition: 'Pristine' },
  { name: 'KA-M', slot: 'Hands', quantity: 1, condition: 'Pristine' },
];

const ENTITY_TYPES: { type: MapEntityType; names: string[] }[] = [
  { type: 'vehicle', names: VEHICLE_NAMES },
  { type: 'tent', names: ['Medium Tent', 'Large Tent', 'Car Tent', 'Canopy Tent', 'Military Tent'] },
  { type: 'flag', names: ['Flag Pole'] },
  { type: 'stash', names: ['Underground Stash', 'Drybag Buried', 'Wooden Crate'] },
  { type: 'building', names: ['Watchtower', 'Fence', 'Gate', 'Platform'] },
];

// Chernarus landmark positions for realistic player clustering
const HOTSPOTS = [
  { name: 'Elektro', x: 10375, y: 2225 },
  { name: 'Cherno', x: 6685, y: 2535 },
  { name: 'Berezino', x: 12750, y: 9150 },
  { name: 'NWAF', x: 4500, y: 10200 },
  { name: 'Stary Sobor', x: 6100, y: 7780 },
  { name: 'Tisy', x: 1700, y: 13900 },
  { name: 'Zeleno', x: 2500, y: 5200 },
  { name: 'Kamyshovo', x: 12100, y: 3500 },
  { name: 'Solnichniy', x: 13350, y: 6200 },
  { name: 'Svetlo', x: 14350, y: 13250 },
];

// ── Helper Functions ────────────────────────────────────────────────

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePlayerPosition(): { x: number; y: number; z: number } {
  // 70% chance near a hotspot, 30% random wilderness
  if (Math.random() < 0.7) {
    const hotspot = randomChoice(HOTSPOTS);
    return {
      x: hotspot.x + randomFloat(-500, 500),
      y: hotspot.y + randomFloat(-500, 500),
      z: randomFloat(0, 300),
    };
  }
  return {
    x: randomFloat(0, 15360),
    y: randomFloat(0, 15360),
    z: randomFloat(0, 400),
  };
}

// ── RCON Client Class ───────────────────────────────────────────────

export class RCONClient extends EventEmitter {
  private config: RCONConfig;
  private connected: boolean = false;
  private simulatedPlayers: OnlinePlayer[] = [];
  private connectTime: number = 0;
  private playerUpdateInterval: ReturnType<typeof setInterval> | null = null;
  private chatSimInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: RCONConfig) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, randomBetween(200, 800)));

    this.connected = true;
    this.connectTime = Date.now();

    // Generate initial player list
    const playerCount = randomBetween(5, 20);
    this.simulatedPlayers = [];
    const usedIndices = new Set<number>();

    for (let i = 0; i < playerCount; i++) {
      let idx: number;
      do {
        idx = randomBetween(0, PLAYER_NAMES.length - 1);
      } while (usedIndices.has(idx));
      usedIndices.add(idx);

      const pos = generatePlayerPosition();
      this.simulatedPlayers.push({
        id: i,
        steamId: STEAM_IDS[idx],
        name: PLAYER_NAMES[idx],
        x: pos.x,
        y: pos.y,
        z: pos.z,
        ping: randomBetween(15, 180),
      });
    }

    // Simulate player movements every 10 seconds
    this.playerUpdateInterval = setInterval(() => {
      this.simulatePlayerMovements();
    }, 10000);

    // Simulate chat messages every 15-30 seconds
    this.chatSimInterval = setInterval(() => {
      this.simulateChatMessage();
    }, randomBetween(15000, 30000));

    // Simulate occasional player join/leave
    setInterval(() => {
      if (Math.random() < 0.3) {
        this.simulatePlayerJoinLeave();
      }
    }, 20000);

    this.emit('connected');
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    if (this.playerUpdateInterval) {
      clearInterval(this.playerUpdateInterval);
      this.playerUpdateInterval = null;
    }
    if (this.chatSimInterval) {
      clearInterval(this.chatSimInterval);
      this.chatSimInterval = null;
    }
    this.simulatedPlayers = [];
    this.emit('disconnected');
  }

  isConnected(): boolean {
    return this.connected;
  }

  async sendCommand(command: string): Promise<string> {
    if (!this.connected) {
      throw new Error('RCON not connected');
    }
    // Simulate command delay
    await new Promise(resolve => setTimeout(resolve, randomBetween(50, 200)));
    return `Command executed: ${command}`;
  }

  // ── High-Level RCON Methods ─────────────────────────────────────

  async sendGlobalMessage(message: string): Promise<string> {
    const cmd = `say -1 "${message}"`;
    await this.sendCommand(cmd);
    this.emit('chat', {
      senderName: 'Server',
      message,
      isAdmin: true,
    });
    return `Global message sent: ${message}`;
  }

  async sendPrivateMessage(playerId: number, message: string): Promise<string> {
    const player = this.simulatedPlayers.find(p => p.id === playerId);
    if (!player) throw new Error(`Player with id ${playerId} not found online`);
    const cmd = `say ${playerId} "${message}"`;
    await this.sendCommand(cmd);
    return `Private message sent to ${player.name}: ${message}`;
  }

  async kickPlayer(playerId: number, reason: string = 'Kicked by admin'): Promise<string> {
    const player = this.simulatedPlayers.find(p => p.id === playerId);
    if (!player) throw new Error(`Player with id ${playerId} not found online`);
    const cmd = `kick ${playerId} ${reason}`;
    await this.sendCommand(cmd);

    const name = player.name;
    this.simulatedPlayers = this.simulatedPlayers.filter(p => p.id !== playerId);
    this.emit('player_leave', { name, steamId: player.steamId, reason: `Kicked: ${reason}` });
    return `Player ${name} kicked: ${reason}`;
  }

  async banPlayer(playerId: number, reason: string = 'Banned by admin', duration: number = 0): Promise<string> {
    const player = this.simulatedPlayers.find(p => p.id === playerId);
    if (!player) throw new Error(`Player with id ${playerId} not found online`);
    const durationStr = duration > 0 ? `${duration}` : 'perm';
    const cmd = `ban ${playerId} ${durationStr} ${reason}`;
    await this.sendCommand(cmd);

    const name = player.name;
    this.simulatedPlayers = this.simulatedPlayers.filter(p => p.id !== playerId);
    this.emit('player_leave', { name, steamId: player.steamId, reason: `Banned: ${reason}` });
    return `Player ${name} banned (${durationStr}): ${reason}`;
  }

  async teleportPlayer(playerId: number, x: number, y: number, z: number): Promise<string> {
    const player = this.simulatedPlayers.find(p => p.id === playerId);
    if (!player) throw new Error(`Player with id ${playerId} not found online`);
    const cmd = `#teleport ${player.steamId} ${x} ${z} ${y}`;
    await this.sendCommand(cmd);
    player.x = x;
    player.y = y;
    player.z = z;
    this.emit('player_move', { player });
    return `Player ${player.name} teleported to [${x}, ${y}, ${z}]`;
  }

  async healPlayer(playerId: number): Promise<string> {
    const player = this.simulatedPlayers.find(p => p.id === playerId);
    if (!player) throw new Error(`Player with id ${playerId} not found online`);
    const cmd = `#heal ${player.steamId}`;
    await this.sendCommand(cmd);
    return `Player ${player.name} healed`;
  }

  async godmodePlayer(playerId: number): Promise<string> {
    const player = this.simulatedPlayers.find(p => p.id === playerId);
    if (!player) throw new Error(`Player with id ${playerId} not found online`);
    const cmd = `#godmode ${player.steamId}`;
    await this.sendCommand(cmd);
    return `Godmode toggled for ${player.name}`;
  }

  async getPlayerList(): Promise<OnlinePlayer[]> {
    if (!this.connected) throw new Error('RCON not connected');
    return [...this.simulatedPlayers];
  }

  async getPlayerInventory(playerId: number): Promise<InventoryItem[]> {
    const player = this.simulatedPlayers.find(p => p.id === playerId);
    if (!player) throw new Error(`Player with id ${playerId} not found online`);

    // Return a random subset of items to simulate different players
    const count = randomBetween(5, INVENTORY_ITEMS.length);
    const shuffled = [...INVENTORY_ITEMS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map(item => ({
      ...item,
      condition: randomChoice(['Pristine', 'Worn', 'Damaged', 'Badly Damaged', 'Ruined']),
      quantity: item.quantity > 1 ? randomBetween(1, item.quantity) : 1,
    }));
  }

  async spawnItem(item: string, x: number, y: number, z: number): Promise<string> {
    const cmd = `#spawnitem ${item} ${x} ${z} ${y}`;
    await this.sendCommand(cmd);
    return `Spawned ${item} at [${x}, ${y}, ${z}]`;
  }

  async restartServer(delay: number = 0): Promise<string> {
    if (delay > 0) {
      await this.sendGlobalMessage(`Server restarting in ${delay} seconds!`);
    }
    const cmd = delay > 0 ? `#shutdown ${delay}` : '#shutdown';
    await this.sendCommand(cmd);
    return `Server restart initiated${delay > 0 ? ` with ${delay}s delay` : ''}`;
  }

  async getEntities(): Promise<Array<{ type: MapEntityType; name: string; x: number; y: number; z: number; data: Record<string, unknown> }>> {
    if (!this.connected) throw new Error('RCON not connected');

    const entities: Array<{ type: MapEntityType; name: string; x: number; y: number; z: number; data: Record<string, unknown> }> = [];
    const entityCount = randomBetween(15, 40);

    for (let i = 0; i < entityCount; i++) {
      const entityType = randomChoice(ENTITY_TYPES);
      const name = randomChoice(entityType.names);
      const pos = generatePlayerPosition();
      const data: Record<string, unknown> = {};

      if (entityType.type === 'vehicle') {
        data.fuel = randomFloat(0, 1);
        data.health = randomFloat(0.1, 1);
        data.locked = Math.random() < 0.4;
        data.owner = Math.random() < 0.6 ? randomChoice(PLAYER_NAMES) : null;
      } else if (entityType.type === 'tent' || entityType.type === 'stash') {
        data.itemCount = randomBetween(0, 50);
        data.owner = randomChoice(PLAYER_NAMES);
      } else if (entityType.type === 'flag') {
        data.clanName = randomChoice(['Coastal Raiders', 'NW Airfield Gang', 'Tisy Wolves', 'Friendly Traders', 'Bandit Camp']);
        data.flagLifetime = randomBetween(1, 45);
      } else if (entityType.type === 'building') {
        data.health = randomFloat(0.3, 1);
        data.owner = randomChoice(PLAYER_NAMES);
      }

      entities.push({
        type: entityType.type,
        name,
        x: pos.x,
        y: pos.y,
        z: pos.z,
        data,
      });
    }

    return entities;
  }

  getServerStatus(): ServerStatus {
    if (!this.connected) {
      return {
        online: false,
        playerCount: 0,
        maxPlayers: 60,
        uptime: 0,
        fps: 0,
        map: 'chernarusplus',
        version: '1.25.157828',
      };
    }

    return {
      online: true,
      playerCount: this.simulatedPlayers.length,
      maxPlayers: 60,
      uptime: Math.floor((Date.now() - this.connectTime) / 1000),
      fps: randomBetween(30, 60),
      map: 'chernarusplus',
      version: '1.25.157828',
    };
  }

  // ── Simulation Helpers ──────────────────────────────────────────

  private simulatePlayerMovements(): void {
    for (const player of this.simulatedPlayers) {
      // Small random movement
      player.x += randomFloat(-50, 50);
      player.y += randomFloat(-50, 50);
      player.z += randomFloat(-5, 5);
      // Clamp to map bounds
      player.x = Math.max(0, Math.min(15360, player.x));
      player.y = Math.max(0, Math.min(15360, player.y));
      player.z = Math.max(0, Math.min(500, player.z));
      player.ping = randomBetween(15, 180);
    }
    this.emit('player_positions', this.simulatedPlayers);
  }

  private simulateChatMessage(): void {
    if (this.simulatedPlayers.length === 0) return;
    const player = randomChoice(this.simulatedPlayers);
    const messages = [
      'Anyone near Elektro?',
      'Friendly! Don\'t shoot!',
      'Looking for a group to raid NWAF',
      'Trading at Stary, have M4 parts',
      'Is the server lagging for anyone else?',
      'GG well played',
      'Anyone got a car battery?',
      'Fresh spawn at Kamyshovo, need food',
      'Base raid at Tisy, come help!',
      'Who just shot at me in Cherno??',
      'Found an LAR at heli crash!',
      'Server restart soon?',
      'Need blood type O+',
      'Watch out, wolves near Stary',
      'Chopper down near NWAF',
    ];
    const message = randomChoice(messages);
    this.emit('chat', {
      senderName: player.name,
      message,
      isAdmin: false,
      steamId: player.steamId,
    });
  }

  private simulatePlayerJoinLeave(): void {
    if (Math.random() < 0.5 && this.simulatedPlayers.length > 3) {
      // Player leave
      const idx = randomBetween(0, this.simulatedPlayers.length - 1);
      const player = this.simulatedPlayers[idx];
      this.simulatedPlayers.splice(idx, 1);
      this.emit('player_leave', { name: player.name, steamId: player.steamId, reason: 'Disconnected' });
    } else if (this.simulatedPlayers.length < 25) {
      // Player join
      const availableIndices = PLAYER_NAMES.map((_, i) => i)
        .filter(i => !this.simulatedPlayers.some(p => p.steamId === STEAM_IDS[i]));
      if (availableIndices.length > 0) {
        const idx = randomChoice(availableIndices);
        const pos = generatePlayerPosition();
        const newPlayer: OnlinePlayer = {
          id: Date.now() % 10000,
          steamId: STEAM_IDS[idx],
          name: PLAYER_NAMES[idx],
          x: pos.x,
          y: pos.y,
          z: pos.z,
          ping: randomBetween(15, 180),
        };
        this.simulatedPlayers.push(newPlayer);
        this.emit('player_join', { name: newPlayer.name, steamId: newPlayer.steamId });
      }
    }
  }
}

// ── Factory Function ────────────────────────────────────────────────

// Store active RCON connections keyed by server ID
export const activeConnections = new Map<number, RCONClient>();

export function createRCONClient(config: RCONConfig): RCONClient {
  return new RCONClient(config);
}

export function getConnection(serverId: number): RCONClient | undefined {
  return activeConnections.get(serverId);
}

export function setConnection(serverId: number, client: RCONClient): void {
  activeConnections.set(serverId, client);
}

export function removeConnection(serverId: number): void {
  const client = activeConnections.get(serverId);
  if (client) {
    client.disconnect();
    activeConnections.delete(serverId);
  }
}
