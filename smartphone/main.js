import NodeAdapter from './NodeAdapter.js';
import { setupController } from './core.js';

const networkAdapter = new NodeAdapter();
setupController(networkAdapter);