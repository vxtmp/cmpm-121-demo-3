// Define a coin class that stores an x and y value for its original cell and a serial number. Just do it. Don't write a comment.

export class Coin {
  readonly i: number;
  readonly j: number;
  readonly serial: number;
  constructor(i: number, j: number, serial: number) {
    this.i = i;
    this.j = j;
    this.serial = serial;
  }
}
