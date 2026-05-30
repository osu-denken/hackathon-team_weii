class Item {
  constructor(type) {
    this.type = type;
  }

  static random() {
    const types = ['health_potion', 'score_up', 'shield', 'triple_shot'];
    const index = Math.floor(Math.random() * types.length);
    return new Item(types[index]);
  }
}

export { Item };
