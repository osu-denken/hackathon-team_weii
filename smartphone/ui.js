export const elements = {
    wsUrlInput: document.getElementById('ws-url'),
    btnJoin: document.getElementById('btn-join'),
    btnShoot: document.getElementById('btn-shoot'),
    btnResetPosition: document.getElementById('btn-reset-position'),
    btnFullscreen: document.getElementById('btn-fullscreen'),
    iconFullscreenEnter: document.getElementById('icon-fullscreen-enter'),
    iconFullscreenExit: document.getElementById('icon-fullscreen-exit'),
    btnUseItem: document.getElementById('btn-use-item'),
    itemIcon: document.getElementById('item-icon'),
    itemSection: document.getElementById('item-section'),
    playerInfoContainer: document.getElementById('player-info'),
    pcbMeter: document.getElementById('pcb-meter'),
    pcbIcon: document.getElementById('pcb-icon'),
    pcbName: document.getElementById('pcb-name'),
    pcbStatus: document.getElementById('pcb-status'),
    pcbRespawn: document.getElementById('pcb-respawn'),
    respawnSecSpan: document.getElementById('respawn-sec'),
    pcbHpBlocks: document.getElementById('pcb-hp-blocks'),
    customizationPanel: document.getElementById('customization-panel'),
    playerNameInput: document.getElementById('player-name-input'),
    difficultyControls: document.getElementById('difficulty-controls'),
    difficultyNormalBtn: document.getElementById('difficulty-normal'),
    difficultyHardBtn: document.getElementById('difficulty-hard'),
    charPreview: document.getElementById('char-preview'),
    charLabel: document.getElementById('char-label'),
    charPrevBtn: document.getElementById('char-prev'),
    charNextBtn: document.getElementById('char-next')
};

const itemSpritePaths = {
    health_potion: `./asset/images/health_potion.png`,
    health_increase: `./asset/images/heart_increase.png`,
    score_up: `./asset/images/score_up.png`,
    shield: `./asset/images/shield.png`,
    triple_shot: `./asset/images/triple_shot.png`,
    empty: `./asset/images/empty.png`
};

export let localState = {
    currentHeldItem: null,
    localPlayerNumber: null
};

export const updateUI = (isConnected) => {
    if (elements.btnJoin) {
        elements.btnJoin.textContent = isConnected ? 'LEAVE' : 'JOIN';
        elements.btnJoin.classList.toggle('leave-state', isConnected);
        elements.btnJoin.classList.toggle('join-state', !isConnected);
    }
    if (elements.btnShoot) elements.btnShoot.disabled = !isConnected;
};

export const showDifficultyControls = (visible) => {
    if (elements.difficultyControls) {
        elements.difficultyControls.style.display = visible ? 'flex' : 'none';
    }
};

export const setDifficultyUI = (difficulty) => {
    if (elements.difficultyNormalBtn) elements.difficultyNormalBtn.classList.toggle('active', difficulty === 'normal');
    if (elements.difficultyHardBtn) elements.difficultyHardBtn.classList.toggle('active', difficulty === 'hard');
};

export const updateGameInfo = (game) => {
    const waiting = game && game.waitingForStart;
    const is1p = localState.localPlayerNumber === 1;
    showDifficultyControls(Boolean(waiting && is1p));
    if (game && typeof game.difficulty === 'string') {
        setDifficultyUI(game.difficulty);
    }
};

export const updateCharPreview = (charNum, maxCharCount) => {
    const base = `./asset/images/`;
    if (elements.charPreview) {
        if (charNum === 0) {
            elements.charPreview.style.display = 'none';
            if (elements.charLabel) elements.charLabel.textContent = '自動選択';
        } else {
            elements.charPreview.style.display = 'block';
            elements.charPreview.src = `${base}character-${charNum}.png`;
            elements.charPreview.alt = `キャラ ${charNum}`;
            if (elements.charLabel) elements.charLabel.textContent = `${charNum} / ${maxCharCount}`;
        }
    }
};

export const updateFullscreenIcons = () => {
    if (!elements.iconFullscreenEnter || !elements.iconFullscreenExit) return;
    if (document.fullscreenElement) {
        elements.iconFullscreenEnter.style.display = 'none';
        elements.iconFullscreenExit.style.display = 'block';
    } else {
        elements.iconFullscreenEnter.style.display = 'block';
        elements.iconFullscreenExit.style.display = 'none';
    }
};

export const updatePlayerInfo = (player, isConnected) => {
    if (!player) {
        if (elements.playerInfoContainer) elements.playerInfoContainer.style.visibility = 'hidden';
        localState.currentHeldItem = null;
        if (elements.btnUseItem) elements.btnUseItem.disabled = true;
        if (elements.itemIcon) {
            elements.itemIcon.src = itemSpritePaths.empty;
            elements.itemIcon.style.opacity = '0.3';
        }
        localState.localPlayerNumber = null;
        showDifficultyControls(false);
        return;
    }

    if (elements.playerInfoContainer) elements.playerInfoContainer.style.visibility = 'visible';
    const num = player.number || player.id || '';
    const charNum = player.characterNumber || player.number || 1;
    const displayName = player.name || `P${num}`;
    const color = player.color || '#888';
    localState.currentHeldItem = player.heldItem || null;
    localState.localPlayerNumber = player.number || null;

    const isDead = Boolean(player.dead);
    const respawnMs = player.respawnRemainingMs || 0;
    const respawnSec = Math.ceil(respawnMs / 1000);
    const hp = Math.floor(player.hp ?? 0);
    const maxHp = Math.floor(player.maxHp ?? 1);
    const score = Math.floor(player.score ?? 0);

    // Update Card UI
    if (elements.playerInfoContainer && elements.playerInfoContainer.dataset.isDead !== String(isDead)) {
        elements.playerInfoContainer.dataset.isDead = String(isDead);
        if (isDead) {
            elements.playerInfoContainer.style.background = 'rgba(239,68,68,0.15)';
            elements.playerInfoContainer.style.borderColor = 'rgba(239,68,68,0.4)';
        } else {
            elements.playerInfoContainer.style.background = '';
            elements.playerInfoContainer.style.borderColor = '';
        }
    }

    if (elements.pcbIcon) {
        const iconHash = `${charNum}:${isDead}`;
        if (elements.pcbIcon.dataset.hash !== iconHash) {
            elements.pcbIcon.dataset.hash = iconHash;

            let validCharNum = charNum;
            if (typeof validCharNum !== 'number' || validCharNum < 1 || validCharNum > 8) {
                validCharNum = 1;
            }
            const spriteUrl = `./asset/images/character-${validCharNum}.png`;

            elements.pcbIcon.style.backgroundImage = `url('${spriteUrl}')`;
            elements.pcbIcon.style.backgroundColor = isDead ? 'rgba(239,68,68,0.5)' : color;
            elements.pcbIcon.style.filter = isDead ? 'grayscale(1)' : '';
        }
    }

    if (elements.pcbName) {
        if (elements.pcbName.dataset.pNum !== String(num) || elements.pcbName.dataset.isDead !== String(isDead)) {
            elements.pcbName.dataset.pNum = String(num);
            elements.pcbName.dataset.isDead = String(isDead);
            elements.pcbName.style.color = isDead ? '#fca5a5' : '';
            elements.pcbName.textContent = displayName;
        }
    }

    if (elements.pcbStatus) {
        const statusHash = `${isDead}:${respawnSec}:${hp}:${maxHp}:${score}`;
        if (elements.pcbStatus.dataset.hash !== statusHash) {
            elements.pcbStatus.dataset.hash = statusHash;
            if (isDead) {
                elements.pcbStatus.textContent = `復活まで: ${respawnSec}秒`;
                elements.pcbStatus.style.color = '#fca5a5';
            } else {
                elements.pcbStatus.textContent = `${score}pt`;
                elements.pcbStatus.style.color = '#cfeffd';
            }
        }
    }

    if (elements.pcbRespawn && elements.pcbHpBlocks) {
        if (isDead) {
            elements.pcbRespawn.style.display = 'none';
            elements.pcbHpBlocks.style.display = 'none';
        } else {
            elements.pcbRespawn.style.display = 'none';
            elements.pcbHpBlocks.style.display = 'flex';

            const hpHash = `${hp}:${maxHp}:${color}`;
            if (elements.pcbHpBlocks.dataset.hash !== hpHash) {
                elements.pcbHpBlocks.dataset.hash = hpHash;
                elements.pcbHpBlocks.innerHTML = '';
                for (let i = 0; i < maxHp; i++) {
                    const b = document.createElement('div');
                    b.className = 'hp-block';
                    b.style.transition = 'all 0.2s';
                    const isFilled = i < hp;
                    b.style.background = isFilled ? color : 'transparent';
                    b.style.boxShadow = isFilled ? `0 0 6px ${color}` : 'none';
                    if (!isFilled) {
                        b.classList.add('empty');
                    }
                    elements.pcbHpBlocks.appendChild(b);
                }
            }
        }
    }

    if (elements.pcbMeter) {
        let remaining = 0;
        let maxDuration = 1;
        let meterColor = 'transparent';
        const shieldRem = player.shieldRemainingMs || 0;
        const tripleRem = player.tripleShotRemainingMs || 0;
        const scoreRem = player.scoreDoubleRemainingMs || 0;

        if (shieldRem > 0) {
            remaining = shieldRem;
            maxDuration = 5000;
            meterColor = '#60a5fa';
        } else if (tripleRem > 0) {
            remaining = tripleRem;
            maxDuration = 5000;
            meterColor = '#f87171';
        } else if (scoreRem > 0) {
            remaining = scoreRem;
            maxDuration = 8000;
            meterColor = '#fbbf24';
        }

        if (remaining > 0) {
            const percentage = Math.max(0, Math.min(100, (remaining / maxDuration) * 100));
            const roundedPercentage = percentage.toFixed(1);
            const meterHash = `${meterColor}:${roundedPercentage}`;
            if (elements.pcbMeter.dataset.hash !== meterHash) {
                elements.pcbMeter.dataset.hash = meterHash;
                elements.pcbMeter.style.background = `conic-gradient(${meterColor} 0% ${roundedPercentage}%, rgba(255,255,255,0.2) ${roundedPercentage}% 100%)`;
            }
            if (elements.pcbStatus) {
                elements.pcbStatus.textContent = `${score}pt`;
                elements.pcbStatus.style.color = meterColor;
            }
        } else {
            if (elements.pcbMeter.dataset.hash !== 'empty') {
                elements.pcbMeter.dataset.hash = 'empty';
                elements.pcbMeter.style.background = 'rgba(255,255,255,0.2)';
            }
            if (elements.pcbStatus && !isDead) {
                elements.pcbStatus.style.color = '#cfeffd';
            }
        }
    }

    if (elements.btnUseItem) elements.btnUseItem.disabled = !localState.currentHeldItem || isDead;
    if (elements.btnResetPosition) elements.btnResetPosition.disabled = isDead || !isConnected;
    if (elements.itemIcon) {
        const iconSrc = localState.currentHeldItem ? itemSpritePaths[localState.currentHeldItem.type] : itemSpritePaths.empty;
        elements.itemIcon.src = iconSrc || itemSpritePaths.empty;
        elements.itemIcon.style.opacity = localState.currentHeldItem ? '1' : '0.3';
    }
    if (elements.btnShoot) elements.btnShoot.disabled = isDead || !isConnected;
};
