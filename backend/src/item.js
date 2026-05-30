class Item {
  constructor(type) {
    this.type = type;
  }

  static random() {
    return new Item(Math.random() < 0.5 ? 'heal' : 'power');
  }
}

export { Item };
