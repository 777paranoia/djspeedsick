const RSS_SOURCES = ["https://isc.sans.edu/rssfeed_full.xml", "https://feeds.feedburner.com/TheHackersNews?format=xml", "https://0dayfans.com/feed.rss"];
const imageDetails = {
    grid1: "UNIX666-18<br>Escalationist<br>CD-R",
    grid2: "INTERDEPRAVITY<br>Sampler",
    grid3: "BPP-6004<br>12in vinyl",
    grid4: "UNIX666-17<br>DJ mix",
    grid5: "UNIX666-16<br>Bootleg",
    grid6: "UNIX666-14<br>CD-R",
    grid7: "UNIX666-13<br>MP3 CD-R",
    grid8: "UNIX666-12<br>Stems",
    grid9: "RECYCLED MUSIC<br>Cassette"
};

const IPINFO_TOKEN = '4b45867ce7c229';

async function updateSystemParams() {
    const hostEl = document.getElementById('host-val');
    const ipEl = document.getElementById('system-ip');
    const cigDisplay = document.getElementById('cig-display');

    if (hostEl) hostEl.innerText = (window.location.hostname || "LOCALHOST").toUpperCase();
    
    try {
        const response = await fetch(`https://ipinfo.io/json?token=${IPINFO_TOKEN}`);
        const data = await response.json();
        
        if (ipEl) ipEl.innerText = data.ip || "IP_NOT_FOUND";
        
        if (data.loc && cigDisplay) {
            const [lat, lng] = data.loc.split(',').map(Number);
            // Give Google Maps a split second to initialize if needed
            setTimeout(() => getNearestSmokes(lat, lng), 100);
        }
    } catch (error) {
        if (ipEl) ipEl.innerText = "NETWORK_ERROR";
        if (cigDisplay) cigDisplay.innerText = "SENSOR_OFFLINE";
    }
}

function getNearestSmokes(lat, lng) {
    const display = document.getElementById('cig-display');
    const linkDiv = document.getElementById('cig-link');
    
    // Safety check: is Google Maps loaded?
    if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
        if (display) display.innerText = "API_INITIALIZATION_ERROR";
        return;
    }

    try {
        const service = new google.maps.places.PlacesService(document.createElement('div'));
        const request = {
            location: new google.maps.LatLng(lat, lng),
            radius: 5000,
            type: ['convenience_store'],
            keyword: 'cigarettes'
        };

        service.nearbySearch(request, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
                const store = results[0];
                display.innerText = store.name.toUpperCase();
                linkDiv.innerHTML = `<a href="https://www.google.com/maps/dir/?api=1&destination=${store.geometry.location.lat()},${store.geometry.location.lng()}" target="_blank" class="conky-link">>> NAVIGATE</a>`;
            } else {
                display.innerText = "NONE FOUND IN RANGE";
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
        audio.play().then(() => initVisualizer()).catch(e => console.log("Audio play blocked by browser"));
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

function openGallery() {
    const container = document.getElementById('artGalleryContent');
    const overlay = document.getElementById('artGalleryOverlay');
    container.innerHTML = ''; 
    if (typeof galleryImages !== 'undefined') {
        let shuffled = [...galleryImages]; 
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        container.innerHTML = shuffled.map(src => `<img src="${src}" class="responsive-image">`).join('');
    }
    overlay.style.display = 'block';
    const closeHandler = () => {
        overlay.style.display = 'none';
        window.removeEventListener('click', closeHandler);
    };
    setTimeout(() => { window.addEventListener('click', closeHandler); }, 50);
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

// Draggable Video logic
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

// Custom Cursor logic
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