const RSS_SOURCES = ["https://thegrayzone.com/feed/", "https://www.ufosightingsdaily.com/feeds/posts/default", "https://www.theblackvault.com/documentarchive/feed/"];
/*"https://0dayfans.com/feed.rss"*/

const imageDetails = {
    grid1: "SPEEDSICK INDUSTRIES 002<br>The First Five Years<br>Speedsick Industries<br>4x CD-R boxset",
    grid2: "KEY008<br>Spectator Death<br>The Key Records<br>Cassette",
    grid3: "UNIX666-20<br>Compliance OST<br>Escalationist<br>CD-R",
    grid4: "UNIX666-18<br>Selbstentfremdungsbewusstsein<br>Escalationist<br>CD-R<br>",
    grid5: "INTERDEPRAVITY 2025 Sampler<br>Self-Released<br>CD-R",
    grid6: "BPP-6004<br>Split with Scant<br>Breathing Problem Productions<br>12in vinyl",
    grid7: "UNIX666-17<br>djss250417-dj.sbd<br>Escalationist<br>CD-R",
    grid8: "UNIX666-16<br>Nothing Is Original (Bootleg Remixes And Edits 2017-2025)<br>Escalationist<br>CD-R<br>",
    grid9: "UNIX666-14<br>Non-Diagetic Instrumentals Vol. I<br>Escalationist<br>CD-R",
};

const IPINFO_TOKEN = '4b45867ce7c229';

const TetrisGallery = {
    isSpawning: false,
    availableIndices: [],
    map: [],
    isLandscape: true,
    TRAVEL_TIME_MS: 2500
};

// --- SYSTEM FUNCTIONS ---

async function updateSystemParams() {
    const hostEl = document.getElementById('host-val');
    const ipEl = document.getElementById('system-ip');
    const cigDisplay = document.getElementById('cig-display');
    try {
        const response = await fetch(`https://ipinfo.io/json?token=${IPINFO_TOKEN}`);
        const data = await response.json();
        if (hostEl) hostEl.innerText = data.loc || "0.000, 0.000";
        if (ipEl) ipEl.innerText = data.ip || "UNKNOWN_IP";
        if (data.loc && cigDisplay) {
            const [lat, lng] = data.loc.split(',').map(Number);
            getNearestSmokes(lat, lng);
        }
    } catch (error) {
        if (hostEl) hostEl.innerText = "SENSOR_FAIL";
        if (ipEl) ipEl.innerText = "NETWORK_ERROR";
        if (cigDisplay) cigDisplay.innerText = "SENSOR_OFFLINE";
    }
}

function getNearestSmokes(lat, lng) {
    const display = document.getElementById('cig-display');
    const linkDiv = document.getElementById('cig-link');
    if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
        if (display) display.innerText = "API_LOAD_FAIL";
        return;
    }
    try {
        const service = new google.maps.places.PlacesService(document.createElement('div'));
        const request = {
            location: new google.maps.LatLng(lat, lng),
            radius: 5000,
            keyword: 'cigarettes tobacco convenience'
        };
        const failSafe = setTimeout(() => {
            if (display.innerText === "SCANNING...") display.innerText = "TIMEOUT";
        }, 8000);
        service.nearbySearch(request, (results, status) => {
            clearTimeout(failSafe);
            if (status === google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
                const store = results[0];
                display.innerText = store.name.toUpperCase();
                linkDiv.innerHTML = `<a href="http://googleusercontent.com/maps.google.com/?q=${store.geometry.location.lat()},${store.geometry.location.lng()}" target="_blank" class="conky-link">>> NAVIGATE</a>`;
            } else {
                display.innerText = "NONE_FOUND";
            }
        });
    } catch (e) {
        if (display) display.innerText = "SCAN_ERROR";
    }
}

async function updateIntelligence() {
    let headlines = [];
    for (let url of RSS_SOURCES) {
        try {
            const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`);
            const data = await res.json();
            if (data.items) data.items.forEach(item => headlines.push(item.title.toUpperCase()));
        } catch (err) {}
    }
    const tickerText = " +++ " + headlines.join(" +++ ") + " +++ ";
    
    ['rss-top', 'rss-bottom', 'rss-left', 'rss-right'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerText = tickerText;
            const baseTime = id.includes('left') || id.includes('right') ? 6 : 4;
            el.style.animationDuration = (headlines.length * baseTime) + "s";
        }
    });
}

function handleEnterClick() {
    document.getElementById('splash-screen').style.display = 'none';
    document.getElementById('container').style.visibility = 'visible';
    document.getElementById('conky-sidebar').style.display = 'block';
    
    // FIX: Use 'block' to respect marquee logic
    document.querySelectorAll('.speedsick-marquee').forEach(el => el.style.display = 'block');
    
    updateSystemParams();
    updateIntelligence();
    
    if (typeof audioTracks !== 'undefined') {
        const audio = document.getElementById('audioPlayer');
        audio.src = audioTracks[Math.floor(Math.random() * audioTracks.length)];
        audio.play().then(() => initVisualizer()).catch(e => console.log("Audio blocked"));
    }
    
    // Init loop
    initContainerLoop();
}

function initContainerLoop() {
    const container = document.getElementById('container');
    const originalSection = container.querySelector('.loop-section');
    
    const images = originalSection.querySelectorAll('img');
    let loadedCount = 0;
    const totalImages = images.length;

    const startLoop = () => {
        const clone = originalSection.cloneNode(true);
        container.appendChild(clone);
        
        let sectionHeight = originalSection.offsetHeight;
        // Start exactly at the beginning of the second set
        container.scrollTop = sectionHeight;

        container.addEventListener('scroll', () => {
            sectionHeight = originalSection.offsetHeight;
            const scrollPos = container.scrollTop;
            const viewHeight = container.clientHeight;
            
            // Loop Logic:
            // 1. If we scroll UP into the first set (top < 10px), jump to start of second set.
            if (scrollPos <= 5) {
                container.scrollTop = sectionHeight + 5;
            } 
            // 2. If we scroll DOWN past the second set (bottom of view hits bottom of content), jump to end of first set.
            else if (scrollPos >= (sectionHeight * 2) - viewHeight - 5) {
                container.scrollTop = sectionHeight - viewHeight - 5;
            }
        });
    };

    if (totalImages === 0) {
        startLoop();
    } else {
        images.forEach(img => {
            if (img.complete) {
                loadedCount++;
                if (loadedCount === totalImages) startLoop();
            } else {
                img.onload = () => {
                    loadedCount++;
                    if (loadedCount === totalImages) startLoop();
                };
            }
        });
    }
}

// Delegate hover for grid items (original + clone)
document.addEventListener('mouseover', (e) => {
    const item = e.target.closest('.grid-item');
    if (item) {
        const cursor = document.getElementById('custom-cursor');
        cursor.innerHTML = imageDetails[item.id];
        cursor.style.display = 'block';
    }
});

document.addEventListener('mouseout', (e) => {
    if (e.target.closest('.grid-item')) {
        document.getElementById('custom-cursor').style.display = 'none';
    }
});

document.addEventListener('mousemove', (e) => {
    const cursor = document.getElementById('custom-cursor');
    if (cursor.style.display === 'block') {
        cursor.style.left = (e.clientX + 15) + 'px';
        cursor.style.top = e.clientY + 'px';
    }
});

function toggleAbout() {
    const overlay = document.getElementById('aboutOverlay');
    overlay.style.display = 'flex';
    const closeHandler = () => {
        overlay.style.display = 'none';
        window.removeEventListener('click', closeHandler);
    };
    setTimeout(() => { window.addEventListener('click', closeHandler); }, 50);
}

function openGallery() {
    const overlay = document.getElementById('artGalleryOverlay');
    const container = document.getElementById('artGalleryContent');
    overlay.style.display = 'block';
    overlay.style.backgroundColor = 'transparent';
    container.innerHTML = '';
    TetrisGallery.isSpawning = true;
    TetrisGallery.isLandscape = window.innerWidth >= window.innerHeight;
    TetrisGallery.map = TetrisGallery.isLandscape ? 
        new Array(window.innerHeight).fill(window.innerWidth) : 
        new Array(window.innerWidth).fill(window.innerHeight);
    TetrisGallery.availableIndices = [...Array(galleryImages.length).keys()];
    spawnSequence();
    const closeHandler = () => {
        overlay.style.display = 'none';
        TetrisGallery.isSpawning = false;
        container.innerHTML = '';
        window.removeEventListener('click', closeHandler);
    };
    setTimeout(() => { window.addEventListener('click', closeHandler); }, 50);
}async function spawnSequence() {
    if (!TetrisGallery.isSpawning) return;
    const STAGE = document.getElementById('artGalleryContent');
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    if (TetrisGallery.availableIndices.length === 0) {
        TetrisGallery.availableIndices = [...Array(galleryImages.length).keys()];
    }
    const randomIndex = Math.floor(Math.random() * TetrisGallery.availableIndices.length);
    const imageIndex = TetrisGallery.availableIndices.splice(randomIndex, 1)[0];
    const url = galleryImages[imageIndex];
    
    const img = new Image();
    img.src = url;
    
    await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
    });

    if (!img.complete || img.naturalWidth === 0) {
        spawnSequence();
        return;
    }

    const ratio = img.naturalHeight / img.naturalWidth;

    // --- REFINED "TETRIS" SIZING ---
    // Width: 18% to 22% of screen width (Tighter, more consistent blocks)
    // Raised min (was 0.15), Lowered max (was 0.25)
    const baseWidth = screenWidth * (Math.random() * 0.04 + 0.18); 
    let width = baseWidth;
    let height = width * ratio;
    
    // Max Height: 45% (Critical for stacking logic)
    const maxHeight = screenHeight * 0.45;
    
    if (height > maxHeight) {
        height = maxHeight;
        width = height / ratio;
    }
    // -------------------------------

    let bestX, bestY, bestImpactX = -Infinity;
    const buffer = 15;
    for (let i = 0; i < 400; i++) {
        if (TetrisGallery.isLandscape) {
            const testY = Math.floor(Math.random() * (screenHeight - height - buffer));
            let currentLimit = screenWidth;
            for (let j = testY; j < testY + Math.floor(height); j++) {
                if (TetrisGallery.map[j] < currentLimit) currentLimit = TetrisGallery.map[j];
            }
            if (currentLimit > bestImpactX) {
                bestImpactX = currentLimit;
                bestY = testY;
            }
        } else {
            const testX = Math.floor(Math.random() * (screenWidth - width - buffer));
            let currentLimit = screenHeight;
            for (let j = testX; j < testX + Math.floor(width); j++) {
                if (TetrisGallery.map[j] < currentLimit) currentLimit = TetrisGallery.map[j];
            }
            if (currentLimit > bestImpactX) {
                bestImpactX = currentLimit;
                bestX = testX;
            }
        }
    }
    const finalX = TetrisGallery.isLandscape ? (bestImpactX - width - buffer) : bestX;
    const finalY = TetrisGallery.isLandscape ? bestY : (bestImpactX - height - buffer);
    
    if (bestImpactX < (TetrisGallery.isLandscape ? width : height) + 40) {
        STAGE.innerHTML = '';
        TetrisGallery.map = TetrisGallery.isLandscape ? 
            new Array(screenHeight).fill(screenWidth) : 
            new Array(screenWidth).fill(screenHeight);
        spawnSequence();
        return;
    }

    const block = document.createElement('div');
    block.className = 'art-block';
    block.style.width = `${width}px`;
    block.style.height = `${height}px`;
    const startX = TetrisGallery.isLandscape ? -width - 200 : finalX;
    const startY = TetrisGallery.isLandscape ? finalY : -height - 200;
    block.style.left = `${startX}px`;
    block.style.top = `${startY}px`;
    block.style.backgroundImage = `url('${url}')`;
    STAGE.appendChild(block);
    void block.offsetWidth;
    block.classList.add('moving');
    const moveX = TetrisGallery.isLandscape ? (finalX - startX) : 0;
    const moveY = TetrisGallery.isLandscape ? 0 : (finalY - startY);
    block.style.transform = `translate(${moveX}px, ${moveY}px)`;
    if (TetrisGallery.isLandscape) {
        for (let k = bestY; k < bestY + Math.floor(height); k++) {
            if (TetrisGallery.map[k] > finalX) TetrisGallery.map[k] = finalX;
        }
    } else {
        for (let k = bestX; k < bestX + Math.floor(width); k++) {
            if (TetrisGallery.map[k] > finalY) TetrisGallery.map[k] = finalY;
        }
    }
    await new Promise(r => setTimeout(r, TetrisGallery.TRAVEL_TIME_MS + 100));
    spawnSequence();
}
function initVisualizer() {
    const ctx = new(window.AudioContext || window.webkitAudioContext)();
    const can = document.getElementById('canvas');
    if (!can) return;
    can.width = window.innerWidth;
    can.height = window.innerHeight;
    const viz = butterchurn.createVisualizer(ctx, can, { width: can.width, height: can.height });
    const presets = butterchurnPresets.getPresets();
    viz.loadPreset(presets[Object.keys(presets)[Math.floor(Math.random() * Object.keys(presets).length)]], 0);
    const render = () => { requestAnimationFrame(render); viz.render(); };
    render();
    const audioPlayer = document.getElementById('audioPlayer');
    const stream = audioPlayer.captureStream ? audioPlayer.captureStream() : audioPlayer.mozCaptureStream();
    viz.connectAudio(ctx.createMediaStreamSource(stream));
}

document.querySelectorAll('.draggable-video').forEach(v => {
    let drag = false, ox, oy;
    v.addEventListener('mousedown', (e) => {
        drag = true;
        ox = e.clientX - v.offsetLeft;
        oy = e.clientY - v.offsetTop;
        document.querySelectorAll('.draggable-video').forEach(vid => vid.style.zIndex = 10);
        v.style.zIndex = 100;
    });
    window.addEventListener('mousemove', (e) => {
        if (drag) {
            v.style.left = (e.clientX - ox) + 'px';
            v.style.top = (e.clientY - oy) + 'px';
        }
    });
    window.addEventListener('mouseup', () => drag = false);
});