// ==========================================================
// ENGINE 2 - ZONE 2 (The Hallway & Intersection)
// ==========================================================

window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

// The fragment shader that projects your flat 4x3 texture into a 3D hallway
GLSL.modules['zone2_hallway'] = `
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_camZ;
uniform float u_blink;
uniform float u_shake;

uniform sampler2D u_skybox;     // The 4x3 cross hallway map
uniform sampler2D u_roomLeft;   // Bathroom / Mirror
uniform sampler2D u_roomRight;  // Bedroom
uniform sampler2D u_void;       // Cosmic Void

mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

// Ray-to-Box Intersection and Cubemap UV Mapping
vec2 getCubemapUV(vec3 ro, vec3 rd) {
    // Math to find where the ray hits the inside of a 2x2x2 box
    vec3 m = 1.0 / rd;
    vec3 n = m * ro;
    vec3 k = abs(m);
    
    vec3 t1 = -n - k;
    vec3 t2 = -n + k;
    float tN = max(max(t1.x, t1.y), t1.z);
    
    vec3 pos = ro + rd * tN; 
    vec3 absPos = abs(pos);
    
    vec2 mapUV = vec2(0.0);
    
    // Map the 3D hit point to the 4x3 texture atlas
    if (absPos.x > absPos.y && absPos.x > absPos.z) {
        if (pos.x > 0.0) { 
            // Right Wall
            mapUV = vec2(0.50 + (-pos.z * 0.5 + 0.5) * 0.25, 0.3333 + (pos.y * 0.5 + 0.5) * 0.3333);
        } else { 
            // Left Wall
            mapUV = vec2(0.00 + (pos.z * 0.5 + 0.5) * 0.25, 0.3333 + (pos.y * 0.5 + 0.5) * 0.3333);
        }
    } else if (absPos.y > absPos.x && absPos.y > absPos.z) {
        if (pos.y > 0.0) { 
            // Ceiling
            mapUV = vec2(0.25 + (pos.x * 0.5 + 0.5) * 0.25, 0.6666 + (-pos.z * 0.5 + 0.5) * 0.3333);
        } else { 
            // Floor
            mapUV = vec2(0.25 + (pos.x * 0.5 + 0.5) * 0.25, 0.0000 + (pos.z * 0.5 + 0.5) * 0.3333);
        }
    } else {
        if (pos.z > 0.0) { 
            // Forward (Void)
            mapUV = vec2(0.25 + (pos.x * 0.5 + 0.5) * 0.25, 0.3333 + (pos.y * 0.5 + 0.5) * 0.3333);
        } else { 
            // Back
            mapUV = vec2(0.75 + (-pos.x * 0.5 + 0.5) * 0.25, 0.3333 + (pos.y * 0.5 + 0.5) * 0.3333);
        }
    }
    return mapUV;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    
    // Setup Camera
    vec3 ro = vec3(0.0, 0.0, u_camZ); 
    vec3 rd = normalize(vec3(uv, 1.0));
    
    // Apply mouse look
    rd.yz *= rot(u_mouse.y);
    rd.xz *= rot(u_mouse.x);
    
    // Apply shake/intensity from audio if needed
    if (u_shake > 0.0) {
        rd.xy *= rot(sin(u_time * 20.0) * u_shake * 0.05);
    }
    
    // Sample the Hallway
    vec2 hallUV = getCubemapUV(ro, rd);
    vec4 hallTex = texture2D(u_skybox, hallUV);
    
    vec3 finalCol = hallTex.rgb;
    
    // Masking: Check if pixel is black or transparent
    float darkness = hallTex.r + hallTex.g + hallTex.b;
    bool isHole = (darkness < 0.05 || hallTex.a < 0.1);
    
    if (isHole) {
        // We hit an empty doorway or the end of the hall
        // Calculate a simple fake perspective for the rooms behind the mask
        vec2 roomUV = uv * 0.5 + 0.5;
        roomUV += rd.xy * 0.1; // Parallax effect
        
        if (rd.x < -0.3) {
            // Looking Left -> Zone2-B (Bathroom FBO will go here)
            finalCol = texture2D(u_roomLeft, clamp(roomUV, 0.0, 1.0)).rgb;
        } else if (rd.x > 0.3) {
            // Looking Right -> Zone2-A (Bedroom)
            finalCol = texture2D(u_roomRight, clamp(roomUV, 0.0, 1.0)).rgb;
        } else {
            // Looking Forward -> Zone2-C (Cosmic Void)
            finalCol = texture2D(u_void, clamp(roomUV, 0.0, 1.0)).rgb;
        }
    }
    
    // Apply the standard global blink fade
    gl_FragColor = vec4(finalCol * (1.0 - u_blink), 1.0);
}
`;

// ==========================================================
// SPACEBAR INPUT LOGIC
// ==========================================================
let spaceHeld = false;

window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
        e.preventDefault(); 
        spaceHeld = true;
    }
});

window.addEventListener("keyup", (e) => {
    if (e.code === "Space") {
        e.preventDefault();
        spaceHeld = false;
    }
});

// ==========================================================
// ZONE 2 ENGINE CLASS
// ==========================================================
class Zone2Engine {
    constructor() {
        this.prog = buildProgram('zone2_hallway'); // Assumes buildProgram is global from engine.js
        gl.useProgram(this.prog);
        
        // Setup Uniforms
        this.U = {
            res: gl.getUniformLocation(this.prog, "u_resolution"),
            time: gl.getUniformLocation(this.prog, "u_time"),
            mouse: gl.getUniformLocation(this.prog, "u_mouse"),
            camZ: gl.getUniformLocation(this.prog, "u_camZ"),
            blink: gl.getUniformLocation(this.prog, "u_blink"),
            shake: gl.getUniformLocation(this.prog, "u_shake")
        };
        
        // Texture Bindings
        gl.uniform1i(gl.getUniformLocation(this.prog, "u_skybox"), 0);
        gl.uniform1i(gl.getUniformLocation(this.prog, "u_roomLeft"), 1);
        gl.uniform1i(gl.getUniformLocation(this.prog, "u_roomRight"), 2);
        gl.uniform1i(gl.getUniformLocation(this.prog, "u_void"), 3);

        // Load Textures (Replace these paths with your actual Zone 2 assets)
        this.texSkybox = loadStaticTex("files/img/rooms/SKYBOX_HALLWAY.png"); // USE A PNG HERE
        this.texBedroom = loadStaticTex("files/img/rooms/bedroom.jpg");       // Placeholder
        this.texBathroom = loadStaticTex("files/img/rooms/bathroom.jpg");     // Placeholder FBO target
        this.texVoid = loadStaticTex("files/mov/bh2.webm");           // Placeholder
        
        // Movement State
        this.camZ = -0.9;               // Start at the back of the theoretical box
        this.INTERSECTION_Z = 0.0;      // The middle of the box where the doors are
        this.intersectionReached = false;
        this.startTime = performance.now();
    }

    render(now, mx, my, audioIntensity, blink, flash, shake) {
        // 1. Handle Forward Movement
        if (!this.intersectionReached && spaceHeld) {
            this.camZ += 0.005; // Walking speed
            
            if (this.camZ >= this.INTERSECTION_Z) {
                this.camZ = this.INTERSECTION_Z;
                this.intersectionReached = true;
                console.log("ZONE 2: Intersection reached. Mouse control unlocked.");
            }
        }

        // 2. Handle Look Constraints
        // Lock looking until the intersection is reached
        let currentLookX = this.intersectionReached ? mx : 0.0;
        let currentLookY = this.intersectionReached ? my : 0.0;

        // 3. Render
        gl.useProgram(this.prog);
        
        // Bind Textures
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.texSkybox);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.texBathroom);
        gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.texBedroom);
        gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, this.texVoid);
        
        // Pass Uniforms
        gl.uniform2f(this.U.res, canvas.width, canvas.height);
        gl.uniform1f(this.U.time, now * 0.001);
        gl.uniform2f(this.U.mouse, currentLookX, currentLookY);
        gl.uniform1f(this.U.camZ, this.camZ);
        gl.uniform1f(this.U.blink, blink);
        gl.uniform1f(this.U.shake, shake);
        
        // Draw the quad
        const loc = gl.getAttribLocation(this.prog, "p");
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    destroy() {
        gl.deleteTexture(this.texSkybox);
        gl.deleteTexture(this.texBedroom);
        gl.deleteTexture(this.texBathroom);
        gl.deleteTexture(this.texVoid);
    }
}