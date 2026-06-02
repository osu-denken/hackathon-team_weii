class Item {
  constructor(type) {
    this.type = type;
  }

  static random() {
    if (Math.random() < 0.08) {
      return new Item('health_increase');
    }
    const types = ['health_potion', 'score_up', 'shield', 'triple_shot'];
    const index = Math.floor(Math.random() * types.length);
    return new Item(types[index]);
  }
}

export { Item };
