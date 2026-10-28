/* SpaceMarble keeps its own analog controller steering (stick / D-pad roll the marble, X recentres tilt, Y restarts, Start pauses); the shared kit only adds menu navigation. Read by js/pad.js. */
window.PAD_CFG = {
  id: 'spacemarble', title: 'SpaceMarble', menuOnly: true,
  hint: '<b>Stick / D-pad</b> roll the marble &nbsp; <b>Y</b> restart &nbsp; <b>X</b> recentre &nbsp; <b>Start</b> pause',
  actions: [],
};
