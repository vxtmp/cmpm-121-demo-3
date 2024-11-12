import leaflet from "leaflet";
import luck from "./luck.ts";
import { CACHE_SPAWN_PROBABILITY, stringifyCell } from "./main.ts";

export interface Cell {
  readonly i: number;
  readonly j: number;
}

export interface Cache {
  coins: Coin[];
  currentSerial: number;
  readonly location: Cell;
}

export class Coin {
  readonly spawnLoc: Cell;
  readonly serial: number;
  constructor(spawnLoc: Cell, serial: number) {
    this.spawnLoc = spawnLoc;
    this.serial = serial;
  }
}

export class Board {
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;

  // map a coordinate string to a Cell object?
  private readonly knownCells: Map<string, Cell>;
  private readonly knownCacheMomentos: Map<Cell, string>;

  constructor(tileWidth: number, tileVisibilityRadius: number) {
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius;
    this.knownCells = new Map();
    this.knownCacheMomentos = new Map();
  }

  // Takes cell object, returns the cell object in the map.
  // Used to avoid duplicate cell objects.
  private getCanonicalCell(cell: Cell): Cell {
    const { i, j } = cell; // unwrap the cell object.
    const key = `${i}:${j}`;
    if (!this.knownCells.has(key)) { // if we haven't seen this cell before
      this.knownCells.set(key, { i, j });
    }
    return this.knownCells.get(key)!;
  }

  // Takes a leaflet point, returns cell object.
  getCellForPoint(point: leaflet.LatLng): Cell {
    return this.getCanonicalCell({
      i: Math.floor(point.lat / this.tileWidth),
      j: Math.floor(point.lng / this.tileWidth),
    });
  }

  // Takes cell object, returns leaflet bounds object.
  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    const { i, j } = cell; // unwrap the cell object.
    return leaflet.latLngBounds(
      [i * this.tileWidth, j * this.tileWidth],
      [(i + 1) * this.tileWidth, (j + 1) * this.tileWidth],
    );
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const resultCells: Cell[] = [];
    const originCell = this.getCellForPoint(point);
    for (
      let i = -this.tileVisibilityRadius;
      i <= this.tileVisibilityRadius;
      i++
    ) {
      for (
        let j = -this.tileVisibilityRadius;
        j <= this.tileVisibilityRadius;
        j++
      ) {
        resultCells.push(this.getCanonicalCell({
          i: originCell.i + i,
          j: originCell.j + j,
        }));
      }
    }
    return resultCells;
  }

  getCacheForCell(cell: Cell): Cache | null {
    const canonicalCell = this.getCanonicalCell(cell);
    if (this.calculateLuckiness(canonicalCell) < CACHE_SPAWN_PROBABILITY) { // roll 1:10. deterministic. if supposed to have cache,
      if (!this.knownCacheMomentos.has(canonicalCell)) { // if unvisited.
        const numCoins = this.calculateNumCoinsToSpawn(canonicalCell);
        this.initNewCache(canonicalCell, numCoins); // create cache at this cell.
      }
      const momentos = this.knownCacheMomentos.get(canonicalCell)!; // get cacheMomentos.
      return this.momentosToCache(momentos); // return converted cache object.
    }
    return null;
  }

  setCacheForCell(cell: Cell, cache: Cache): void {
    const momentos = this.cacheToMomentos(cache);
    const canonicalCell = this.getCanonicalCell(cell);
    this.knownCacheMomentos.set(canonicalCell, momentos);
  }

  private cacheToMomentos(cache: Cache): string {
    return JSON.stringify(cache);
  }

  private momentosToCache(momentos: string): Cache {
    return JSON.parse(momentos);
  }

  calculateNumCoinsToSpawn(cell: Cell): number {
    const canonicalCell = this.getCanonicalCell(cell);
    const luckiness = this.calculateLuckiness(canonicalCell);
    return Math.floor(luckiness * 100);
  }

  calculateLuckiness(cell: Cell): number {
    const key = stringifyCell(cell);
    return luck(key);
  }

  initNewCache(cell: Cell, numCoins: number): void {
    // make a new cache object
    const newCache: Cache = {
      coins: [],
      currentSerial: 0,
      location: cell,
    };

    const canonicalCell = this.getCanonicalCell(cell);

    // add coins to the new cache
    for (let i = 0; i < numCoins; i++) {
      newCache.coins.push(new Coin(canonicalCell, newCache.currentSerial++));
    }

    // convert the new cache to a string
    const newMomentos = this.cacheToMomentos(newCache);

    // add the new cache to the map.
    this.knownCacheMomentos.set(canonicalCell, newMomentos);
  }

  serialize(): string {
    const serialized = {
      tileWidth: this.tileWidth,
      tileVisibilityRadius: this.tileVisibilityRadius,
      knownCells: Array.from(this.knownCells.entries()),
      cacheMomentos: Array.from(
        this.knownCacheMomentos.entries(),
      ).map(
        ([cell, momento]) => ({
          cell: { i: cell.i, j: cell.j },
          momento,
        }),
      ),
    };
    return JSON.stringify(serialized);
  }

  static deserialize(data: string): Board {
    const obj = JSON.parse(data);
    const board = new Board(obj.tileWidth, obj.tileVisibilityRadius);

    // Deserialize knownCells
    for (const [key, cell] of obj.knownCells) {
      board.knownCells.set(key, cell);
    }

    // Deserialize cacheMomentos
    for (const item of obj.cacheMomentos) {
      const cell = { i: item.cell.i, j: item.cell.j };
      const cache = board.momentosToCache(item.momento);
      board.setCacheForCell(cell, cache);
      console.log(
        "Deserialized cacheMomentos: ",
        item.momento,
        " at cell: ",
        cell,
      );
    }

    return board;
  }
}
