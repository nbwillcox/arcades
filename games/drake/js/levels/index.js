// Level registry: id -> def. Hubs, levels, flight levels and bosses.
import m_hub from './m_hub.js';
import m1_brookside from './m1_brookside.js';
import m2_stones from './m2_stones.js';
import m3_mill from './m3_mill.js';
import m4_quarry from './m4_quarry.js';
import m5_skylark from './m5_skylark.js';
import m6_golem from './m6_golem.js';
import { buildWorlds } from './worlds.js';

export const LEVELS = { m_hub, m1_brookside, m2_stones, m3_mill, m4_quarry, m5_skylark, m6_golem, ...buildWorlds() };
export const START_LEVEL = 'm_hub';
// world id -> hub level id
export const HUBS = { mossgate: 'm_hub', brightforge: 'b_hub', mistral: 'c_hub', glimmerdeep: 'd_hub', duskmarket: 'e_hub', keep: 'f_hub' };
