body {
  margin: 0;
  overflow: hidden;
  background: #000;
  font-family: monospace;
}

/* INTRO */

#splash-screen {
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #000;
  z-index: 1000;
}

#background-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

#enter-button {
  position: relative;
  z-index: 1001;
  cursor: pointer;
}

/* VOID CANVAS */

#canvas {
  position: fixed;
  inset: 0;
  z-index: 1;
}

/* WEBSITE WALL */

#website-wall {
  position: fixed;
  inset: 0;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.5s ease;
  z-index: 600;
}

#website-wall.on {
  opacity: 1;
  pointer-events: auto;
}

/* SIDEBAR */

#conky-sidebar {
  position: fixed;
  top: 100px;
  left: 80px;
  width: 260px;
  color: #00ff00;
  font-size: 0.8rem;
}

.conky-line { margin: 2px 0; }

.conky-link {
  color: #00ff00;
  text-decoration: none;
}

.conky-link:hover {
  opacity: 0.7;
}

.separator {
  font-family: monospace;
  white-space: nowrap;
}

/* VIDEOS */

#video-stack-container {
  position: absolute;
  right: 60px;
  top: 5vh;
  width: 18%;
  height: 90vh;
}

#hands-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.draggable-video {
  position: absolute;
  width: 100%;
  height: 22.5vh;
  object-fit: cover;
}

.pos-1 { top: 0; }
.pos-2 { top: 25%; }
.pos-3 { top: 50%; }
.pos-4 { top: 75%; }