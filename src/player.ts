import leaflet from "leaflet";
import { Coin } from "./board.ts";

export class Player {
  private readonly coins: Coin[];
  private location: leaflet.LatLng;
  private playerMarker: leaflet.Marker;
  private observers: (() => void)[] = [];

  private movementHistory: leaflet.LatLng[] = [];

  private MOVE_INCREMENT = 0.00001;

  constructor(location: leaflet.LatLng, map: leaflet.Map) {
    this.coins = [];
    this.location = location;
    this.playerMarker = leaflet.marker(location);
    this.playerMarker.bindTooltip("This is you!");
    this.playerMarker.addTo(map);
  }

  private addMovementHistory(location: leaflet.LatLng): void {
    if (!this.sameAsLastLocation(location)) {
      this.movementHistory.push(location);
    }
  }

  public getPlayerMarker(): leaflet.Marker {
    return this.playerMarker;
  }
  private sameAsLastLocation(location: leaflet.LatLng): boolean {
    if (this.movementHistory.length === 0) {
      return true;
    }
    const lastLocation = this.movementHistory[this.movementHistory.length - 1];
    return lastLocation.equals(location);
  }

  public getMovementHistory(): leaflet.LatLng[] {
    return this.movementHistory;
  }

  public getLocation(): leaflet.LatLng {
    return this.location;
  }

  public setLocation(location: leaflet.LatLng): void {
    this.location = location;
    this.playerMarker.setLatLng(this.location);
    this.notifyObservers();
    // this.addMovementHistory(location);
  }

  private moveBy(latOffset: number, lngOffset: number): void {
    const newLat = this.location.lat + latOffset;
    const newLng = this.location.lng + lngOffset;
    const newLocation = leaflet.latLng(newLat, newLng);
    this.setLocation(newLocation);
  }
  public addCoin(coin: Coin): void {
    this.coins.push(coin);
  }

  public getCoin(): Coin | undefined {
    return this.coins.pop();
  }

  public getCoinCount(): number {
    return this.coins.length;
  }

  public moveUp(): void {
    this.moveBy(this.MOVE_INCREMENT, 0);
  }

  public moveDown(): void {
    this.moveBy(-this.MOVE_INCREMENT, 0);
  }

  public moveLeft(): void {
    this.moveBy(0, -this.MOVE_INCREMENT);
  }

  public moveRight(): void {
    this.moveBy(0, this.MOVE_INCREMENT);
  }

  public addObserver(observer: () => void): void {
    this.observers.push(observer);
  }

  public notifyObservers(): void {
    for (const observer of this.observers) {
      observer();
    }
  }

  public resetCoins(): void {
    this.coins.length = 0;
  }

  serialize(): string {
    return JSON.stringify({
      location: this.location,
      coins: this.coins.map((coin) => ({
        spawnLoc: coin.spawnLoc,
        serial: coin.serial,
      })),
      // movementHistory: this.movementHistory.map((loc) => ({
      //   lat: loc.lat,
      //   lng: loc.lng,
      // }))
    });
  }

  // takes localStorage.getItem("player") as input
  static deserialize(data: string, map: leaflet.Map): Player {
    console.log("Attempting to deserialize player");
    const obj = JSON.parse(data); // parse gives some object.
    console.log("obj returned by JSON parse: ", obj);
    const player = new Player(
      leaflet.latLng(obj.location.lat, obj.location.lng),
      map,
    );
    obj.coins.forEach((coin: Coin) => {
      player.addCoin(new Coin(coin.spawnLoc, coin.serial));
    });

    // obj.movementHistory.forEach((loc: { lat: number, lng: number }) => {
    //   player.movementHistory.push(leaflet.latLng(loc.lat, loc.lng));
    // });
    return player;
  }
}
