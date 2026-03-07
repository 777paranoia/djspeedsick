
/*
 * ZONE 2 — STATE MACHINE & CAMERA CONTROLLER
 *
 * This runs alongside engine.js. When zone2 is activated,
 * it takes over rendering with its own shader and feeds
 * rail camera + sequence uniforms each frame.
 *
 * Integration point: engine.js calls zone2.render(now, ...)
 * instead of currentEngine.render() when zone2 is active.
 */

window.Zone2 = (function () {

  // ---- CONSTANTS ----
  const WALK_SPEED      = 1.8;    // meters per second
  const CAM_Z_START     = 0.5;
  const CAM_Z_BOUNDARY  = 9.5;   // forward movement boundary (intersection)
  const DOOR_Z          = 8.0;
  const YAW_SPEED       = 2.5;
  const YAW_MAX         = Math.PI * 0.85;

  // look angle thresholds for room views
  const YAW_BEDROOM     = Math.PI * 0.38;   // looking right
  const YAW_BATHROOM    = -Math.PI * 0.38;  // looking left

  // gaze durations (ms)
  const MIRROR_GAZE_MS  = 4000;
  const BLINK_CYCLE_MS  = 600;   // full close + open

  // sequence states
  const SEQ = {
    WALK:       0,
    ROOMS:      1,
    MIRROR:     2,
    BLINK1:     3,
    BLINK2:     4,
    TURNAROUND: 5,
    PLANE:      6,
    IMPACT:     7,
    FOG:        8,
    ZONE2_FIN:  9
  };

  // ---- STATE ----
  let camZ       = CAM_Z_START;
  let lookYaw    = 0.0;
  let seqState   = SEQ.WALK;
  let seqTime    = 0;
  let seqStart   = 0;
  let fogDensity = 0.0;
  let mirrorMode = 0;    // 0=reflection, 1=goreville, 2=plane
  let mirrorGazeAccum = 0;
  let blinkCount = 0;

  // input
  let forwardHeld = false;
  let active      = false;

  // GL resources (set during init)
  let prog       = null;
  let uniforms   = {};

  // ---- INPUT ----

  function onKeyDown(e) {
    if (!active) return;
    if (e.code === 'KeyW' || e.code === 'ArrowUp') {
      forwardHeld = true;
      e.preventDefault();
    }
  }

  function onKeyUp(e) {
    if (e.code === 'KeyW' || e.code === 'ArrowUp') {
      forwardHeld = false;
    }
  }

  // touch: hold anywhere on screen to walk forward
  let touchWalking = false;
  function onTouchStart(e) {
    if (!active) return;
    touchWalking = true;
  }
  function onTouchEnd() {
    touchWalking = false;
  }

  function bindInput() {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
  }

  function unbindInput() {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchend', onTouchEnd);
  }


  // ---- SEQUENCE LOGIC ----

  function enterState(state, now) {
    seqState = state;
    seqStart = now;
    seqTime  = 0;

    switch (state) {
      case SEQ.BLINK2:
        mirrorMode = 1;  // goreville in mirror doorway
        break;
      case SEQ.PLANE:
        mirrorMode = 2;  // plane approaching in mirror
        break;
      case SEQ.IMPACT:
        // trigger red flash via engine
        if (window.__zone2Flash) window.__zone2Flash();
        break;
      case SEQ.FOG:
        fogDensity = 0.0; // will ramp up
        break;
    }
  }

  function tickSequence(now, dt, lookingAtMirror, lookingAtBedroom) {
    seqTime = now - seqStart;

    switch (seqState) {

      case SEQ.WALK:
        // transitions to ROOMS when camZ hits boundary
        if (camZ >= CAM_Z_BOUNDARY - 0.1) {
          enterState(SEQ.ROOMS, now);
        }
        break;

      case SEQ.ROOMS:
        // transitions to MIRROR when player looks into bathroom
        if (lookingAtMirror) {
          mirrorGazeAccum += dt;
          if (mirrorGazeAccum > 500) { // half second of sustained gaze
            enterState(SEQ.MIRROR, now);
          }
        } else {
          mirrorGazeAccum = 0;
        }
        break;

      case SEQ.MIRROR:
        // player is staring at mirror — wait for gaze duration, then blink
        if (!lookingAtMirror) {
          // player looked away, reset
          enterState(SEQ.ROOMS, now);
          mirrorGazeAccum = 0;
          break;
        }
        if (seqTime > MIRROR_GAZE_MS) {
          enterState(SEQ.BLINK1, now);
        }
        break;

      case SEQ.BLINK1:
        // engine triggers a blink; when it completes, move to blink2
        if (seqTime > BLINK_CYCLE_MS) {
          enterState(SEQ.BLINK2, now);
        }
        break;

      case SEQ.BLINK2:
        // second blink with goreville in mirror doorway
        if (seqTime > BLINK_CYCLE_MS) {
          enterState(SEQ.TURNAROUND, now);
        }
        break;

      case SEQ.TURNAROUND:
        // player can now turn around
        // if they look at bedroom (turn right), goreville is gone
        // if they look back at mirror...
        if (lookingAtBedroom && seqTime > 1000) {
          // they checked behind them — now let them look back
        }
        if (lookingAtMirror && seqTime > 2000) {
          enterState(SEQ.PLANE, now);
        }
        break;

      case SEQ.PLANE:
        // plane approaching in mirror for ~4.5 seconds
        if (seqTime > 4500) {
          enterState(SEQ.IMPACT, now);
        }
        break;

      case SEQ.IMPACT:
        // red flash, then fade to fog
        if (seqTime > 800) {
          enterState(SEQ.FOG, now);
        }
        break;

      case SEQ.FOG:
        // ramp up fog
        fogDensity = Math.min(1.0, seqTime / 3000);
        if (seqTime > 5000) {
          enterState(SEQ.ZONE2_FIN, now);
        }
        break;

      case SEQ.ZONE2_FIN:
        // hold state — external code handles transition
        break;
    }
  }


  // ---- TICK (called every frame) ----

  function tick(now, dt, mx) {
    if (!active) return;

    const dtSec = dt * 0.001;

    // --- camera movement ---
    if (seqState === SEQ.WALK && (forwardHeld || touchWalking)) {
      camZ = Math.min(camZ + WALK_SPEED * dtSec, CAM_Z_BOUNDARY);
    }

    // --- yaw from drag (mx comes from engine's existing drag system) ---
    // mx is in [-1.35, 1.35], map to yaw
    lookYaw = -mx * YAW_MAX / 1.35;

    // --- determine what player is looking at ---
    const atIntersection = camZ >= CAM_Z_BOUNDARY - 1.0;
    const lookingAtMirror  = atIntersection && lookYaw < YAW_BATHROOM;
    const lookingAtBedroom = atIntersection && lookYaw > YAW_BEDROOM;

    // --- tick sequence ---
    tickSequence(now, dt, lookingAtMirror, lookingAtBedroom);
  }


  // ---- UNIFORM UPLOAD ----

  function uploadUniforms(gl) {
    if (!prog) return;
    gl.useProgram(prog);

    if (uniforms.camZ !== null)       gl.uniform1f(uniforms.camZ,       camZ);
    if (uniforms.lookYaw !== null)    gl.uniform1f(uniforms.lookYaw,    lookYaw);
    if (uniforms.seqState !== null)   gl.uniform1i(uniforms.seqState,   seqState);
    if (uniforms.seqTime !== null)    gl.uniform1f(uniforms.seqTime,    (performance.now() - seqStart) * 0.001);
    if (uniforms.fogDensity !== null) gl.uniform1f(uniforms.fogDensity, fogDensity);
    if (uniforms.mirrorMode !== null) gl.uniform1i(uniforms.mirrorMode, mirrorMode);
  }

  function cacheUniforms(gl, program) {
    prog = program;
    uniforms = {
      camZ:       gl.getUniformLocation(prog, 'u_camZ'),
      lookYaw:    gl.getUniformLocation(prog, 'u_lookYaw'),
      seqState:   gl.getUniformLocation(prog, 'u_seqState'),
      seqTime:    gl.getUniformLocation(prog, 'u_seqTime'),
      fogDensity: gl.getUniformLocation(prog, 'u_fogDensity'),
      mirrorMode: gl.getUniformLocation(prog, 'u_mirrorMode'),
    };
  }


  // ---- PUBLIC API ----

  return {
    SEQ,

    activate(gl, program) {
      active = true;
      camZ = CAM_Z_START;
      lookYaw = 0;
      seqState = SEQ.WALK;
      fogDensity = 0;
      mirrorMode = 0;
      blinkCount = 0;
      mirrorGazeAccum = 0;
      cacheUniforms(gl, program);
      bindInput();
    },

    deactivate() {
      active = false;
      unbindInput();
    },

    tick,
    uploadUniforms,

    // read-only getters for engine integration
    get camZ()       { return camZ; },
    get lookYaw()    { return lookYaw; },
    get seqState()   { return seqState; },
    get fogDensity() { return fogDensity; },
    get mirrorMode() { return mirrorMode; },
    get isActive()   { return active; },
    get isFinished() { return seqState === SEQ.ZONE2_FIN; },
  };

})();
