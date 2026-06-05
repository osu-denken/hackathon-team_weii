export class MessageHandler {
  constructor(stage, options = {}) {
    this.stage = stage;
    this.socketToPlayerId = new Map();
    // Options allow injecting custom network send functions
    // so both P2P and Node can use this handler.
    this.send = options.send || (() => {});
    this.sendError = options.sendError || (() => {});
  }

  handleJoin(wsOrPeerId, msg) {
    if (!msg.id) {
      this.sendError(wsOrPeerId, 'missing id');
      return null;
    }

    const name = typeof msg.name === 'string' ? msg.name.trim().slice(0, 12) : '';
    const characterNumber = (Number.isInteger(msg.characterNumber) && msg.characterNumber >= 1 && msg.characterNumber <= 8)
      ? msg.characterNumber : null;
    
    // Check if player already exists
    let player = this.stage.getPlayer(msg.id);
    if (!player) {
      player = this.stage.addPlayer(msg.id, Date.now(), { name, characterNumber, color: msg.color });
    }
    
    this.socketToPlayerId.set(wsOrPeerId, player.id);

    this.send(wsOrPeerId, {
      type: 'joinAck', // Used by Node.js client
      player: {
        id: player.id,
        number: player.number,
        color: player.color,
        name: player.name,
        characterNumber: player.characterNumber,
      },
    });
    
    return player.id;
  }

  handleLeave(wsOrPeerId) {
    const id = this.socketToPlayerId.get(wsOrPeerId);
    if (id) this.stage.removePlayer(id);

    this.socketToPlayerId.delete(wsOrPeerId);
    return id;
  }

  handleMove(wsOrPeerId, msg, now) {
    const id = this.socketToPlayerId.get(wsOrPeerId);
    if (id) this.stage.movePlayer(id, msg.delta, now);
  }

  handleShoot(wsOrPeerId, now) {
    const id = this.socketToPlayerId.get(wsOrPeerId);
    if (id) this.stage.shootPlayer(id, now);
  }

  handleUseItem(wsOrPeerId, now) {
    const id = this.socketToPlayerId.get(wsOrPeerId);
    if (id) this.stage.useHeldItem(id, now);
  }

  handleResetPosition(wsOrPeerId, now) {
    const id = this.socketToPlayerId.get(wsOrPeerId);
    if (id) this.stage.resetPlayerPosition(id, now);
  }

  getPlayerId(wsOrPeerId) {
    return this.socketToPlayerId.get(wsOrPeerId);
  }

  clear() {
    this.socketToPlayerId.clear();
  }
}
