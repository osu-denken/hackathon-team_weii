class AbstractItem {
  constructor(type) {
    this.type = type;
  }

  /**
   * 
   * @returns 
   */
  isInstant() {
    return false;
  }

  applyInstant(player, stage, now) {
    // Override in subclasses
  }

  applyUse(player, stage, now) {
    // Override in subclasses
  }
}

export { AbstractItem };
