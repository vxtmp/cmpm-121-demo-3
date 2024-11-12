import leaflet from "leaflet";
import { Coin } from "./board.ts";

export class Player {
  private readonly coins: Coin[];
  private location: leaflet.LatLng;
  private playerMarker: leaflet.Marker;
  private observers: (() => void)[] = [];

  private MOVE_INCREMENT = 0.00001;

  constructor(location: leaflet.LatLng, map: leaflet.Map) {
    this.coins = [];
    this.location = location;
    this.playerMarker = leaflet.marker(location);
    this.playerMarker.bindTooltip("This is you!");
    this.playerMarker.addTo(map);
  }

  public getLocation(): leaflet.LatLng {
    return this.location;
  }

  public setLocation(location: leaflet.LatLng): void {
    this.location = location;
    this.playerMarker.setLatLng(this.location);
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
    const lat = this.location.lat + this.MOVE_INCREMENT;
    this.move(lat, this.location.lng);
  }

  public moveDown(): void {
    const lat = this.location.lat - this.MOVE_INCREMENT;
    this.move(lat, this.location.lng);
  }

  public moveLeft(): void {
    const lng = this.location.lng - this.MOVE_INCREMENT;
    this.move(this.location.lat, lng);
  }

  public moveRight(): void {
    const lng = this.location.lng + this.MOVE_INCREMENT;
    this.move(this.location.lat, lng);
  }

  private move(lat: number, lng: number): void {
    this.location = leaflet.latLng(lat, lng);
    this.playerMarker.setLatLng(this.location);
    this.notifyObservers();
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
    return player;
  }
}
