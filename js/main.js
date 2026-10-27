/* ===========================================================
   ORGM — edit suite interactions
   =========================================================== */
(() => {
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const FPS = 25;

  const tcString = (sec) => {
    sec = Math.max(0, sec || 0);
    const h = Math.floor(sec / 3600);
    const m = Math.floor(sec % 3600 / 60);
    const s = Math.floor(sec % 60);
    const f = Math.floor((sec % 1) * FPS);
    return [h, m, s, f].map(n => String(n).padStart(2, '0')).join(':');
  };
  const mmss = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

  /* ── missing media degrades to the slate texture ──── */
  $$('img:not(#monStill)').forEach(img => {
    const drop = () => img.remove();
    img.addEventListener('error', drop);
    if (img.complete && img.naturalWidth === 0) drop();
  });

  /* ── drawer ───────────────────────────────────────── */
  const burger = $('#burger');
  const setDrawer = o => {
    document.body.classList.toggle('drawer-open', o);
    burger.setAttribute('aria-expanded', String(o));
  };
  burger.addEventListener('click', () => setDrawer(!document.body.classList.contains('drawer-open')));
  $$('#drawer a').forEach(a => a.addEventListener('click', () => setDrawer(false)));

  /* ── sequence rail ────────────────────────────────── */
  const head  = $('#railHead');
  const marks = $$('.rail__mark');
  marks.forEach(m => m.addEventListener('click',
    () => $('#' + m.dataset.go).scrollIntoView({ behavior: 'smooth' })));

  // the whole page is one sequence: its length is the total runtime of the work
  const TOTAL = $$('.clip').reduce((a, c) => a + (+c.dataset.sec || 0), 0);
  const tcOutput = $('#tc');

  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(Math.max(scrollY / max, 0), 1) : 0;
    if (head) head.style.top = (p * 100) + '%';
    if (tcOutput) tcOutput.textContent = tcString(p * TOTAL);
    let active = marks[0];
    marks.forEach(m => {
      const sec = $('#' + m.dataset.go);
      if (sec && sec.getBoundingClientRect().top <= innerHeight * 0.4) active = m;
    });
    marks.forEach(m => m.classList.toggle('is-on', m === active));
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ── the sequence: clip widths + ruler ────────────── */
  const clips = $$('.clip');
  const ruler = $('#ruler');

  const layout = () => {
    const narrow = innerWidth <= 760;
    if (narrow) { clips.forEach(c => c.style.width = ''); if (ruler) ruler.innerHTML = ''; return; }

    // square-root scale: an 18-minute doc cannot be 40x wider than a 30-second spot
    const raw = clips.map(c => Math.sqrt(+c.dataset.sec || 1));
    const sum = raw.reduce((a, b) => a + b, 0);
    let pct = raw.map(v => v / sum * 100);
    const MIN = 9;                                    // keep every clip label readable
    const short = pct.map(p => Math.max(p, MIN));
    const over  = short.reduce((a, b) => a + b, 0) - 100;
    if (over > 0) {
      const slack = short.reduce((a, p) => a + (p > MIN ? p - MIN : 0), 0);
      pct = short.map(p => p > MIN ? p - over * ((p - MIN) / slack) : p);
    } else pct = short;

    clips.forEach((c, i) => c.style.width = pct[i] + '%');

    if (ruler) {
      let acc = 0;
      ruler.innerHTML = '';
      clips.forEach((c, i) => {
        const tick = document.createElement('i');
        tick.style.width = pct[i] + '%';
        tick.innerHTML = `<span>${mmss(acc)}</span>`;
        acc += +c.dataset.sec || 0;
        ruler.appendChild(tick);
      });
    }
  };
  layout();
  addEventListener('resize', layout);

  /* ── program monitor ──────────────────────────────── */
  const mon = $('#mon'), monVideo = $('#monVideo'), monBurn = $('#monBurn'),
        monMeta = $('#monMeta'), monStill = $('#monStill'), monYT = $('#monYT');

  let current = null, yt = null, ytPoll = 0, ytApi = null;
  const burn = (sec) => { monBurn.textContent = tcString(sec); };

  /* local files */
  monVideo.addEventListener('timeupdate', () => burn(monVideo.currentTime));
  monVideo.addEventListener('seeked',     () => burn(monVideo.currentTime));
  monVideo.addEventListener('play',  () => mon.classList.add('is-playing'));
  monVideo.addEventListener('pause', () => mon.classList.remove('is-playing'));
  monVideo.addEventListener('ended', () => { mon.classList.remove('is-playing'); monVideo.controls = false; });

  /* youtube — the API is fetched only when a youtube clip is actually played */
  const loadApi = () => ytApi ||= new Promise(resolve => {
    if (window.YT && window.YT.Player) return resolve();
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (prev) prev(); resolve(); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  });

  const stopPoll = () => { clearInterval(ytPoll); ytPoll = 0; };
  const startPoll = () => {
    stopPoll();
    ytPoll = setInterval(() => { if (yt && yt.getCurrentTime) burn(yt.getCurrentTime()); }, 120);
  };

  const playYT = async (id) => {
    await loadApi();
    monStill.hidden = true;
    monYT.hidden = false;
    if (yt && yt.loadVideoById) { yt.loadVideoById(id); return; }
    yt = new YT.Player('monYTMount', {
      videoId: id,
      playerVars: { rel: 0, modestbranding: 1, playsinline: 1, autoplay: 1 },
      events: {
        onReady: e => e.target.playVideo(),
        onStateChange: e => {
          const P = YT.PlayerState;
          if (e.data === P.PLAYING) { mon.classList.add('is-playing'); startPoll(); }
          else { stopPoll(); if (e.data !== P.BUFFERING) mon.classList.remove('is-playing'); }
        }
      }
    });
  };

  const load = (clip, autoplay) => {
    clips.forEach(c => c.classList.toggle('is-on', c === clip));
    current = clip;
    const d = clip.dataset;

    mon.classList.remove('is-playing');
    stopPoll();
    if (yt && yt.stopVideo) yt.stopVideo();
    monYT.hidden = true;
    monVideo.pause();
    monVideo.controls = false;

    if (d.yt) {                                   // hosted on youtube
      monVideo.hidden = true;
      monVideo.removeAttribute('src');
      monStill.src = d.poster;
      monStill.hidden = false;
    } else {                                      // local file in assets/
      monStill.hidden = true;
      monVideo.hidden = false;
      monVideo.poster = d.poster;
      monVideo.src = d.video;
      monVideo.currentTime = 0;
    }
    burn(0);

    monMeta.innerHTML =
      `<span class="t">${d.title}</span><span>${d.kind}</span><span>${d.role}</span>` +
      `<span>${d.year}</span><span class="d">${mmss(+d.sec)}</span>`;
    if (autoplay) play();
  };

  const play = () => {
    if (current && current.dataset.yt) { playYT(current.dataset.yt); return; }
    monVideo.controls = true;
    monVideo.play().catch(() => { monVideo.controls = false; });   // no file yet → stay on the slate
  };

  clips.forEach(c => c.addEventListener('click', () => load(c, false)));
  $('#monPlay').addEventListener('click', play);
  load(clips[0], false);

  /* hero contact strip → load that clip in the monitor */
  $$('.strip__frame[data-f]').forEach(f => f.addEventListener('click', () => {
    const clip = clips[(+f.dataset.f) - 1];
    if (!clip) return;
    load(clip, false);
    $('#work').scrollIntoView({ behavior: 'smooth' });
  }));

  /* ── fullscreen player (showreel) ─────────────────── */
  const lb = $('#lb'), lbVideo = $('#lbVideo'), lbCap = $('#lbCap');
  let lastFocus = null;

  const openLB = (src, cap, poster) => {
    lastFocus = document.activeElement;
    lbVideo.src = src;
    if (poster) lbVideo.poster = poster;
    lbCap.textContent = cap || '';
    document.body.classList.add('lb-open');
    lb.setAttribute('aria-hidden', 'false');
    $('#lbClose').focus();
    lbVideo.play().catch(() => {});
  };
  const closeLB = () => {
    document.body.classList.remove('lb-open');
    lb.setAttribute('aria-hidden', 'true');
    lbVideo.pause();
    setTimeout(() => { lbVideo.removeAttribute('src'); lbVideo.load(); }, 250);
    lastFocus?.focus();
  };
  $('[data-play="reel"]').addEventListener('click',
    () => openLB('assets/work/reel.mp4', 'Showreel 2025 — 01:48', 'assets/work/reel.jpg'));
  $('#lbClose').addEventListener('click', closeLB);
  lb.addEventListener('click', e => { if (e.target === lb) closeLB(); });
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.body.classList.contains('lb-open')) closeLB();
  });

  /* ── reveal ───────────────────────────────────────── */
  const rv = $$('.sechead, .suite, .about__grid, .contact__h, .contact__side');
  rv.forEach(el => el.setAttribute('data-rv', ''));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((e, o) => e.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('is-in'); o.unobserve(en.target); }
    }), { threshold: .08, rootMargin: '0px 0px -5% 0px' });
    rv.forEach(el => io.observe(el));
  } else rv.forEach(el => el.classList.add('is-in'));
})();
