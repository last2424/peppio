module.exports = {
    // Keys and other mathematical constants
    KEY_ESC: 27,
    KEY_ENTER: 13,
    KEY_CHAT: 13,
    KEY_FIREFOOD: 16,
    KEY_SPLIT: 32,
    KEY_LEFT: 65,
    KEY_UP: 87,
    KEY_RIGHT: 68,
    KEY_DOWN: 83,
    borderDraw: false,
    spin: -Math.PI,
    enemySpin: -Math.PI,
    mobile: false,
    foodSides: 10,
    virusSides: 20,

    // Canvas
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    gameWidth: 0,
    gameHeight: 0,
    xoffset: -0,
    yoffset: -0,
    gameStart: false,
    disconnected: false,
    died: false,
    kicked: false,
    continuity: false,
    startPingTime: 0,
    toggleMassState: 0,
    backgroundColor: '#181818',
    lineColor: '#ffffff',
	moveToDir: 0,
	sizeCell: 40,
};