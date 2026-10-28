/* Controller map for SpaceTube: step the claw around the rim, fire, zap. Read by js/pad.js. */
window.PAD_CFG = {
  id: 'spacetube', title: 'SpaceTube',
  hint: '<b>Stick / D-pad</b> left / right step around the rim &nbsp; <b>A / RT</b> fire &nbsp; <b>B / X / RB</b> zapper &nbsp; <b>Start</b> pause',
  move: { keys: { l: 'ArrowLeft', r: 'ArrowRight' }, mode: 'h' },
  actions: [
    { id: 'fire', label: 'Fire', btn: ['A', 'RT'], key: 'Space' },
    { id: 'zap', label: 'Zapper', btn: ['B', 'X', 'RB'], key: 'KeyX' },
  ],
};
