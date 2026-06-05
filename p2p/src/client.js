import '../../smartphone/styles.css';
import { setupController } from '../../smartphone/core.js';
import ClientPeerAdapter from './ClientPeerAdapter.js';

const networkAdapter = new ClientPeerAdapter();
setupController(networkAdapter);
