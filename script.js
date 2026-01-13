const RSS_SOURCES = ["https://isc.sans.edu/rssfeed_full.xml", "https://feeds.feedburner.com/TheHackersNews?format=xml", "https://0dayfans.com/feed.rss"];
const imageDetails = {
    grid1: "UNIX666-18<br>Escalationist<br>CD-R<br>Limited edition",
    grid2: "INTERDEPRAVITY<br>Self-Released<br>CD-R<br>2025 Sampler",
    grid3: "BPP-6004<br>Breathing Problem Productions<br>12in vinyl<br>Split with Scant",
    grid4: "UNIX666-17<br>Escalationist<br>2025 DJ mix<br>Limited edition",
    grid5: "UNIX666-16<br>Escalationist<br>CD-R<br>Bootleg remixes",
    grid6: "UNIX666-14<br>Escalationist<br>CD-R",
    grid7: "UNIX666-13<br>Escalationist<br>50xMP3 CD-R<br>",
    grid8: "UNIX666-12<br>Escalationist<br>2x biz card CD-R<br>Single + multitrack stems",
    grid9: "RECYCLED MUSIC<br>RRRecords<br>Recycled Music series<br>Cassette",
};
const IPINFO_TOKEN = '4b45867ce7c229';

// TETRIS GALLERY STATE
const TetrisGallery = {
    isSpawning: false,
    availableIndices: [],
    map: [],
    isLandscape: true,
    TRAVEL_TIME_MS: 3500
};

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
                linkDiv.innerHTML = `<a href="https://www.google.com/maps/dir/?api=1&destination=${store.geometry.location.lat()},${store.geometry.location.lng()}" target="_blank" class="conky-link">>> NAVIGATE</a>`;
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
    document.getElementById('rss-top').innerText = tickerText;
    document.getElementById('rss-bottom').innerText = tickerText;
    const duration = (headlines.length * 4) + "s";
    document.getElementById('rss-top').style.animationDuration = duration;
    document.getElementById('rss-bottom').style.animationDuration = duration;
}

function handleEnterClick() {
    document.getElementById('splash-screen').style.display = 'none';
    document.getElementById('container').style.visibility = 'visible';
    document.getElementById('conky-sidebar').style.display = 'block';
    document.querySelectorAll('.speedsick-marquee').forEach(el => el.style.display = 'block');
    updateSystemParams();
    updateIntelligence();
    if (typeof audioTracks !== 'undefined') {
        const audio = document.getElementById('audioPlayer');
        audio.src = audioTracks[Math.floor(Math.random() * audioTracks.length)];
        audio.play().then(() => initVisualizer()).catch(e => console.log("Audio blocked"));
    }
}

function toggleAbout() {
    const overlay = document.getElementById('aboutOverlay');
    overlay.style.display = 'flex';
    const closeHandler = () => {
        overlay.style.display = 'none';
        window.removeEventListener('click', closeHandler);
    };
    setTimeout(() => { window.addEventListener('click', closeHandler); }, 50);
}

// REPLACED WITH TETRIS LOGIC
function openGallery() {
    const overlay = document.getElementById('artGalleryOverlay');
    const container = document.getElementById('artGalleryContent');
    overlay.style.display = 'block';
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
}

async function spawnSequence() {
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
    await new Promise(r => img.onload = r);
    const ratio = img.naturalHeight / img.naturalWidth;

    const baseWidth = screenWidth * (Math.random() * 0.03 + 0.12);
    let width = baseWidth;
    let height = width * ratio;
    const maxHeight = TetrisGallery.isLandscape ? screenHeight * 0.35 : screenHeight * 0.28;
    if (height > maxHeight) {
        height = maxHeight;
        width = height / ratio;
    }

    let bestX, bestY, bestTargetPos = -Infinity;
    const threshold = TetrisGallery.isLandscape ? screenWidth * 0.05 : screenHeight * 0.05;

    if (TetrisGallery.isLandscape) {
        for (let i = 0; i < 70; i++) {
            const testY = Math.floor(Math.random() * (screenHeight - height));
            let currentWall = screenWidth;
            for (let j = testY; j < Math.min(testY + Math.floor(height), screenHeight); j++) {
                if (TetrisGallery.map[j] < currentWall) currentWall = TetrisGallery.map[j];
            }
            const testTargetX = currentWall - width;
            if (testTargetX > bestTargetPos) {
                bestTargetPos = testTargetX;
                bestY = testY;
            }
        }
        bestX = -width - 150;
    } else {
        for (let i = 0; i < 70; i++) {
            const testX = Math.floor(Math.random() * (screenWidth - width));
            let currentFloor = screenHeight;
            for (let j = testX; j < Math.min(testX + Math.floor(width), screenWidth); j++) {
                if (TetrisGallery.map[j] < currentFloor) currentFloor = TetrisGallery.map[j];
            }
            const testTargetY = currentFloor - height;
            if (testTargetY > bestTargetPos) {
                bestTargetPos = testTargetY;
                bestX = testX;
            }
        }
        bestY = -height - 150;
    }

    if (bestTargetPos < threshold) {
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
    block.style.left = `${bestX}px`;
    block.style.top = `${bestY}px`;
    block.style.backgroundImage = `url('${url}')`;
    STAGE.appendChild(block);

    void block.offsetWidth;
    block.classList.add('moving');
    if (TetrisGallery.isLandscape) {
        block.style.transform = `translateX(${bestTargetPos + width + 150}px)`;
    } else {
        block.style.transform = `translateY(${bestTargetPos + height + 150}px)`;
    }

    await new Promise(r => setTimeout(r, TetrisGallery.TRAVEL_TIME_MS));
    if (TetrisGallery.isLandscape) {
        for (let k = bestY; k < Math.min(bestY + Math.floor(height), screenHeight); k++) TetrisGallery.map[k] = bestTargetPos;
    } else {
        for (let k = bestX; k < Math.min(bestX + Math.floor(width), screenWidth); k++) TetrisGallery.map[k] = bestTargetPos;
    }

    await new Promise(r => setTimeout(r, 150));
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

const cursor = document.getElementById('custom-cursor');
document.querySelectorAll('.grid-item').forEach(img => {
    img.onmouseenter = () => {
        cursor.innerHTML = imageDetails[img.id];
        cursor.style.display = 'block';
    };
    img.onmouseleave = () => cursor.style.display = 'none';
    img.onmousemove = (e) => {
        cursor.style.left = (e.clientX + 15) + 'px';
        cursor.style.top = e.clientY + 'px';
    };
});