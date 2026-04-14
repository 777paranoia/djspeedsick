const IPINFO_TOKEN = "4b45867ce7c229",
        RSS_SOURCES = [
          "https://thegrayzone.com/feed/",
          "https://www.theblackvault.com/documentarchive/feed/",
          "https://www.paranoidcybersecurity.com/rss/all",
          "https://krebsonsecurity.com/feed/",
          "https://warontherocks.com/feed/",
          "https://www.defenseone.com/rss/all/",
          "https://responsiblestatecraft.org/feeds/feed.rss",
          "https://www.eff.org/rss/updates.xml",
          "https://privacyinternational.org/rss.xml",
          "https://vigilantcitizen.com/feed/",
          "https://www.infowars.com/rss.xml",
        ];
      function updateIntelligence() {
        const e = [...RSS_SOURCES].sort(() => Math.random() - 0.5).slice(0, 4);
        ["rss-top", "rss-bottom", "rss-left", "rss-right"].forEach((t, n) => {
          const o = e[n];
          fetch(
            `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(o)}`,
          )
            .then((e) => e.json())
            .then((e) => {
              let n = [];
              if (
                (e.items &&
                  e.items.forEach((e) => n.push(e.title.toUpperCase())),
                0 === n.length)
              )
                return;
              n.sort(() => Math.random() - 0.5);
              const o = document.getElementById(t);
              if (o) {
                const e = " +++ " + n.join(" +++ ") + " +++ ";
                o.innerText = e.repeat(4);
                const i = t.includes("left") || t.includes("right") ? 6 : 4,
                  s = n.length * i * 2;
                ((o.style.animationDuration = s + "s"),
                  (o.style.animationDelay = "-" + Math.random() * s + "s"));
              }
            })
            .catch(() => {});
        });
      }
      function toggleConky() {
        const e = document.getElementById("conky-sidebar"),
          t = document.querySelectorAll(".ticker-wrap");
        (window.currentZone3 &&
          window.currentZone3.isAltRoute &&
          "void" === window.currentZone3.centerPhase &&
          "none" === window.currentZone3.bhEscapePhase &&
          ((window.currentZone3.bhEscapeArmed = !0),
          (window.currentZone3.bhEscapeBlinkCount = 0)),
          "none" === e.style.display || "" === e.style.display
            ? ((e.style.display = "block"),
              t.forEach((e) => (e.style.display = "block")),
              updateSystemParams(),
              updateIntelligence(),
              setTimeout(function () {
                "function" == typeof initBrainMonitor && initBrainMonitor();
              }, 100),
              setTimeout(function () {
                e.style.transformOrigin = "top left";
                var t = 0.9 * window.innerHeight,
                  n = e.scrollHeight;
                e.style.transform =
                  n > t ? "scale(" + (t / n).toFixed(3) + ")" : "";
              }, 150))
            : ((e.style.display = "none"),
              (e.style.transform = ""),
              t.forEach((e) => (e.style.display = "none")),
              "function" == typeof stopBrainMonitor && stopBrainMonitor()));
      }
      function toggleAbout() {
        const e = document.getElementById("aboutOverlay");
        e.style.display = "flex";
        const t = () => {
          ((e.style.display = "none"), window.removeEventListener("click", t));
        };
        setTimeout(() => {
          window.addEventListener("click", t);
        }, 50);
      }
      async function updateSystemParams() {
        const e = document.getElementById("host-val"),
          t = document.getElementById("system-ip"),
          n = document.getElementById("cig-display");
        try {
          const o = await fetch(`https://ipinfo.io/json?token=${IPINFO_TOKEN}`),
            i = await o.json();
          if (
            (e && (e.innerText = i.loc || "0.000, 0.000"),
            t && (t.innerText = i.ip || "UNKNOWN_IP"),
            i.loc && n)
          ) {
            const [e, t] = i.loc.split(",").map(Number);
            getNearestSmokes(e, t);
          }
        } catch (o) {
          (e && (e.innerText = "SENSOR_FAIL"),
            t && (t.innerText = "NETWORK_ERROR"),
            n && (n.innerText = "SENSOR_OFFLINE"));
        }
      }
      function getNearestSmokes(e, t) {
        const n = document.getElementById("cig-display"),
          o = document.getElementById("cig-link");
        let i = !1;
        function s(e, t, s) {
          i ||
            ((i = !0),
            n && (n.innerText = e.toUpperCase()),
            o &&
              (o.innerHTML =
                '<a href="https://www.google.com/maps/dir/?api=1&destination=' +
                t +
                "," +
                s +
                '" target="_blank" class="conky-link">>> NAVIGATE</a>'));
        }
        function a() {
          i ||
            fetch(
              "https://overpass-api.de/api/interpreter?data=" +
                encodeURIComponent(
                  '[out:json][timeout:10];(node["shop"="tobacco"](around:3000,' +
                    e +
                    "," +
                    t +
                    ');node["shop"="convenience"](around:3000,' +
                    e +
                    "," +
                    t +
                    ');node["vending"="cigarettes"](around:3000,' +
                    e +
                    "," +
                    t +
                    "););out body 5;",
                ),
            )
              .then(function (e) {
                return e.json();
              })
              .then(function (o) {
                if (!i) {
                  var a = o.elements || [];
                  if (a.length > 0) {
                    a.sort(function (n, o) {
                      return (
                        (n.lat - e) * (n.lat - e) +
                        (n.lon - t) * (n.lon - t) -
                        ((o.lat - e) * (o.lat - e) + (o.lon - t) * (o.lon - t))
                      );
                    });
                    var r = a[0];
                    s(
                      (r.tags && (r.tags.name || r.tags.brand)) ||
                        "CONVENIENCE STORE",
                      r.lat,
                      r.lon,
                    );
                  } else !i && n && (n.innerText = "NONE_IN_RANGE");
                }
              })
              .catch(function () {
                !i && n && (n.innerText = "SCAN_FAILED");
              });
        }
        if ("undefined" != typeof google && google.maps && google.maps.places)
          try {
            var r = document.getElementById("maps-dummy");
            r ||
              (((r = document.createElement("div")).id = "maps-dummy"),
              (r.style.display = "none"),
              document.body.appendChild(r));
            var d = new google.maps.places.PlacesService(r),
              c = {
                location: new google.maps.LatLng(e, t),
                radius: 5e3,
                keyword: "cigarettes tobacco convenience",
              },
              l = setTimeout(function () {
                a();
              }, 6e3);
            d.nearbySearch(c, function (e, t) {
              if (
                (clearTimeout(l),
                t === google.maps.places.PlacesServiceStatus.OK && e.length > 0)
              ) {
                var n = e[0];
                s(n.name, n.geometry.location.lat(), n.geometry.location.lng());
              } else a();
            });
          } catch (e) {
            a();
          }
        else a();
      }
      window.addEventListener("load", () => {
        const e = document.getElementById("loading-screen");
        e && (e.style.display = "none");
      });
      const bgContainer = document.getElementById("background-container"),
        splashScreen = document.getElementById("splash-screen");
      let sDrag = !1,
        sStartX = 0,
        sStartY = 0,
        sPanX = 0,
        sPanY = 0;
      if (window.innerWidth > 768 && window.innerWidth > window.innerHeight)
        for (
          var splashImgs = bgContainer.querySelectorAll("img"), si = 0;
          si < splashImgs.length;
          si++
        )
          ((splashImgs[si].style.transform = "rotate(-90deg)"),
            (splashImgs[si].style.width = "120vh"),
            (splashImgs[si].style.height = "120vw"),
            (splashImgs[si].style.top = "50%"),
            (splashImgs[si].style.left = "50%"),
            (splashImgs[si].style.marginTop = "-60vw"),
            (splashImgs[si].style.marginLeft = "-60vh"),
            (splashImgs[si].style.objectFit = "cover"));
      const startSplashDrag = (e) => {
          if (
            "enter-button" === e.target.id ||
            e.target.closest("#enter-button")
          )
            return;
          (e.cancelable && e.preventDefault(), (sDrag = !0));
          let t = e.touches ? e.touches[0].clientX : e.clientX,
            n = e.touches ? e.touches[0].clientY : e.clientY;
          ((sStartX = t - sPanX), (sStartY = n - sPanY));
        },
        doSplashDrag = (e) => {
          if (!sDrag) return;
          let t = e.touches ? e.touches[0].clientX : e.clientX,
            n = e.touches ? e.touches[0].clientY : e.clientY;
          ((sPanX = t - sStartX), (sPanY = n - sStartY));
          let o = 0.1 * window.innerWidth,
            i = 0.1 * window.innerHeight;
          ((sPanX = Math.max(-o, Math.min(o, sPanX))),
            (sPanY = Math.max(-i, Math.min(i, sPanY))),
            (bgContainer.style.transform = `translate(${sPanX}px, ${sPanY}px)`));
        },
        endSplashDrag = () => {
          sDrag = !1;
        };
      (splashScreen.addEventListener("mousedown", startSplashDrag),
        window.addEventListener("mousemove", doSplashDrag),
        window.addEventListener("mouseup", endSplashDrag),
        splashScreen.addEventListener("touchstart", startSplashDrag, {
          passive: !1,
        }),
        window.addEventListener("touchmove", doSplashDrag, { passive: !1 }),
        window.addEventListener("touchend", endSplashDrag));
      var __dHeld = !1,
        __debugAllowed = !1;
      ((window.showTransientCenterOverlay = function (e, t, n) {
        ((t = t || 1800), (n = n || 1350));
        let o = document.getElementById("__center_control_hint");
        (o ||
          ((o = document.createElement("img")),
          (o.id = "__center_control_hint"),
          (o.style.cssText = [
            "position:fixed",
            "left:50%",
            "top:50%",
            "transform:translate(-50%,-50%)",
            "max-width:min(72vw,1180px)",
            "max-height:min(34vh,420px)",
            "width:auto",
            "height:auto",
            "opacity:0",
            "display:none",
            "pointer-events:none",
            "z-index:100000",
            "transition:opacity 220ms ease",
            "filter:drop-shadow(0 0 18px rgba(0,0,0,0.32))",
          ].join(";")),
          document.body.appendChild(o)),
          clearTimeout(window.__centerControlHintHold),
          clearTimeout(window.__centerControlHintHide),
          (o.src = e),
          (o.style.display = "block"),
          (o.style.opacity = "0"),
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              o.style.opacity = "0.18";
            });
          }),
          (window.__centerControlHintHold = setTimeout(function () {
            ((o.style.opacity = "0"),
              (window.__centerControlHintHide = setTimeout(function () {
                o.style.display = "none";
              }, n + 40)));
          }, t)));
      }),
        window.addEventListener("keydown", (e) => {
          ("d" !== e.key && "D" !== e.key) || (__dHeld = !0);
        }),
        window.addEventListener("keyup", (e) => {
          ("d" !== e.key && "D" !== e.key) || (__dHeld = !1);
        }));
      let _entered = !1;
      ((window.enterSite = function () {
        if (_entered) return;
        ((_entered = !0),
          __dHeld &&
            ((__debugAllowed = !0),
            "function" == typeof window.makeUI && window.makeUI()),
          (document.getElementById("splash-screen").style.display = "none"));
        const e = document.getElementById("background-container");
        (e && (e.style.display = "none"),
          (window._siteEntered = !0),
          setTimeout(function () {
            "function" == typeof window.showTransientCenterOverlay &&
              window.showTransientCenterOverlay(
                "files/img/splash/ctrls.png",
                1800,
                1350,
              );
          }, 120));
        try {
          (window.__primeVideoPool && window.__primeVideoPool(),
            window.__unlockAllVideos && window.__unlockAllVideos());
        } catch (e) {
          console.error("Video pool error:", e);
        }
        const t = document.getElementById("audioPlayer"),
          n =
            window.audioTracks ||
            ("undefined" != typeof audioTracks ? audioTracks : []);
        try {
          if (t && n.length > 0) {
            if (!window.__audioSetupDone) {
              window.__audioSetupDone = !0;
              const e = new (
                  window.AudioContext || window.webkitAudioContext
                )(),
                n = e.createMediaElementSource(t),
                o = e.createBiquadFilter();
              ((o.type = "lowpass"),
                (o.frequency.value = 520),
                (window.__audioFilter = o));
              e.createChannelMerger(2);
              const i = e.createDelay();
              ((i.delayTime.value = 0), (window.__audioRightDelay = i));
              const s = e.createGain();
              ((s.gain.value = 0.3), (window.__audioDryGain = s));
              const a = e.createGain();
              ((a.gain.value = 0.7), (window.__audioWetGain = a));
              const r = e.createConvolver(),
                d = e.sampleRate,
                c = 2 * d,
                l = e.createBuffer(2, c, d);
              for (let e = 0; e < 2; e++) {
                let t = l.getChannelData(e);
                for (let e = 0; e < c; e++)
                  t[e] =
                    (0.7 * (2 * Math.random() - 1) +
                      0.3 * (2 * Math.random() - 1)) *
                    Math.pow(1 - e / c, 2.5) *
                    (1 + 0.1 * Math.sin(0.005 * e));
              }
              ((r.buffer = l),
                n.connect(o),
                o.connect(s),
                o.connect(r),
                r.connect(a));
              const u = e.createAnalyser();
              ((u.fftSize = 256),
                n.connect(u),
                (window.audioAnalyser = u),
                (window.audioData = new Uint8Array(u.frequencyBinCount)),
                s.connect(e.destination),
                a.connect(e.destination),
                (window.__audioCtx = e));
              const w = document.getElementById("c"),
                h = w ? w.width : window.innerWidth,
                m = w ? w.height : window.innerHeight;
              ((window.bcCanvas = document.createElement("canvas")),
                (window.bcCanvas.width = h),
                (window.bcCanvas.height = m));
              const p =
                  "undefined" != typeof butterchurn && butterchurn.default
                    ? butterchurn.default
                    : "undefined" != typeof butterchurn
                      ? butterchurn
                      : null,
                y =
                  "undefined" != typeof butterchurnPresets &&
                  butterchurnPresets.default
                    ? butterchurnPresets.default
                    : "undefined" != typeof butterchurnPresets
                      ? butterchurnPresets
                      : null;
              if (p && y) {
                window.butterchurnVisualizer = p.createVisualizer(
                  window.__audioCtx,
                  window.bcCanvas,
                  { width: h, height: m },
                );
                const e = y.getPresets(),
                  t = Object.keys(e),
                  n = t[Math.floor(Math.random() * t.length)];
                (window.butterchurnVisualizer.loadPreset(e[n], 0),
                  setInterval(() => {
                    const n = t[Math.floor(Math.random() * t.length)];
                    window.butterchurnVisualizer.loadPreset(e[n], 2);
                  }, 15e3));
              }
            }
            window.__audioCtx &&
              "suspended" === window.__audioCtx.state &&
              window.__audioCtx.resume();
            const e = () => {
              const e =
                window.audioTracks ||
                ("undefined" != typeof audioTracks ? audioTracks : []);
              ((window.__activePlaylist && window.__activePlaylist === e) ||
                ((window.__activePlaylist = e),
                (window.__shuffledTracks = [...e].sort(
                  () => Math.random() - 0.5,
                )),
                (window.__trackIndex = 0)),
                (t.src = window.__shuffledTracks[window.__trackIndex]),
                window.__trackIndex++,
                window.__trackIndex >= window.__shuffledTracks.length &&
                  ((window.__shuffledTracks = [...e].sort(
                    () => Math.random() - 0.5,
                  )),
                  (window.__trackIndex = 0)));
              const n = t.play();
              void 0 !== n && n.catch(() => {});
            };
            ((window.unmuteMainAudio = () => {
              (t.pause(),
                (t.loop = !1),
                t.removeEventListener("ended", e),
                t.addEventListener("ended", e),
                e());
            }),
              window.startTestSequence || window.unmuteMainAudio());
          }
        } catch (e) {
          console.error("Audio engine failed to start:", e);
        }
        (window.startTestSequence || (window.startWakeSequence = !0),
          setTimeout(function () {
            var e = document.getElementById("conky-sidebar");
            !e ||
              ("none" !== e.style.display && "" !== e.style.display) ||
              toggleConky();
          }, 300));
      }),
        document.addEventListener(
          "touchstart",
          function (e) {
            window._siteEntered &&
              (window.__audioCtx &&
                "suspended" === window.__audioCtx.state &&
                window.__audioCtx.resume().catch(() => {}),
              window.__unlockAllVideos && window.__unlockAllVideos());
          },
          { passive: !1 },
        ));
