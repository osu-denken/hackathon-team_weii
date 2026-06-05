import '../../smartphone/styles.css';
import { setupController } from '../../smartphone/core.js';
import PeerAdapter from './PeerAdapter.js';

const networkAdapter = new PeerAdapter();
setupController(networkAdapter);
