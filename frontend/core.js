import { state, serverInfo, MAX_PLAYERS } from './state.js';
import { loadSprites } from './assets.js';
import { elements, setDifficultyUI, updateGameUI, showStageTransition, setConnected } from './ui.js';
import { draw, resize } from './render.js';

export const initViewer = (networkAdapter) => {
    window.addEventListener('resize', resize);
    resize();
    loadSprites();
    draw(); // Start render loop

    const selectDifficulty = (difficulty) => {
        if (state.game.difficulty === difficulty) return;
        state.game.difficulty = difficulty;
        setDifficultyUI(difficulty);
        if (networkAdapter && networkAdapter.sendDifficulty) {
            networkAdapter.sendDifficulty(difficulty);
        }
    };

    if (elements.titleDifficultyNormal) {
        elements.titleDifficultyNormal.addEventListener('click', () => selectDifficulty('normal'));
    }
    if (elements.titleDifficultyHard) {
        elements.titleDifficultyHard.addEventListener('click', () => selectDifficulty('hard'));
    }

    // Simulate clicks from parent window
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'simulateClick') {
            const { x, y } = event.data;
            const target = document.elementFromPoint(x, y);
            if (target && typeof target.click === 'function') {
                target.click();
            }
        }
    });
};

export const processViewerPayload = (payload) => {
    if (payload.type === 'update') {
        const prevStage = state.game.stage;
        
        if (payload.isDelta) {
            if (payload.players !== undefined) state.players = payload.players;
            if (payload.enemies !== undefined) state.enemies = payload.enemies;
            if (payload.bullets !== undefined) state.bullets = payload.bullets;
            if (payload.items !== undefined) state.items = payload.items;
            if (payload.game !== undefined) {
                for (const key in payload.game) {
                    state.game[key] = payload.game[key];
                }
                if (payload.game.serverNow) {
                    serverInfo.serverTimeOffset = Date.now() - payload.game.serverNow;
                }
            }
        } else {
            state.players = Array.isArray(payload.players)
                ? payload.players.slice(0, MAX_PLAYERS)
                : [];
            state.enemies = Array.isArray(payload.enemies) ? payload.enemies : [];
            state.bullets = Array.isArray(payload.bullets) ? payload.bullets : [];
            state.items = Array.isArray(payload.items) ? payload.items : [];
            if (payload.game) {
                state.game = { ...state.game, ...payload.game };
                if (payload.game.serverNow) {
                    serverInfo.serverTimeOffset = Date.now() - payload.game.serverNow;
                }
            }
        }

        if (payload.game && typeof payload.game.stage === 'number' && payload.game.stage > prevStage) {
            showStageTransition(payload.game.stage, payload.game.stageLabel);
        }

        updateGameUI();
    }
};

export const setViewerConnected = (isConnected) => {
    setConnected(isConnected);
};
