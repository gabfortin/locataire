// Maps of nearby places (print shops, Bureau en Gros, libraries, Canada Post offices) around the
// tenant's address, using OpenStreetMap data through Nominatim.
// Nothing is sent anywhere until the tenant clicks a map button: the address is then geocoded,
// nearby places are searched, and Leaflet + OSM tiles are loaded on demand.
// Nominatim's usage policy allows at most 1 request per second, so requests are queued.

(function () {
  const LEAFLET_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
  const LEAFLET_JS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
  const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
  const NOMINATIM_DELAY_MS = 1100;
  const SEARCH_RADIUS_KM = 4.5;
  const MAX_LISTED = 20;
  const HOME_COLOR = '#1c1b2e';

  const CATEGORIES = {
    staples: {
      color: '#d62828',
      query: 'Bureau en Gros',
      accept: (r) => /bureau en gros|staples/i.test(r.name || ''),
    },
    copyshop: {
      color: '#1e3a5f',
      query: 'copyshop',
      accept: (r) => r.type === 'copyshop',
    },
    library: {
      color: '#0f9d8a',
      query: 'library',
      accept: (r) => r.type === 'library',
    },
    post: {
      color: '#e08a00',
      query: 'post office',
      // OSM also tags private shipping stores as post offices: keep Canada Post outlets only.
      accept: (r) => {
        if (r.type !== 'post_office') return false;
        const tags = r.extratags || {};
        const label = [r.name, tags.brand, tags.operator].filter(Boolean).join(' ');
        return /postes? canada|canada post|bureau de poste/i.test(label);
      },
    },
  };

  const MAP_KINDS = {
    print: ['staples', 'copyshop', 'library'],
    post: ['post'],
  };

  const form = document.getElementById('letter-form');
  const dialog = document.getElementById('map-dialog');
  const panels = {};
  document.querySelectorAll('[data-map-panel]').forEach((panel) => {
    panels[panel.getAttribute('data-map-panel')] = {
      panel,
      status: panel.querySelector('.map-status'),
      canvas: panel.querySelector('.map-canvas'),
      list: panel.querySelector('.map-list'),
      map: null,
      layer: null,
      loadedFor: null,
    };
  });

  let leafletPromise = null;
  let nominatimQueue = Promise.resolve();
  let lastNominatimAt = 0;
  const geocodeCache = new Map();

  function loadLeaflet() {
    if (window.L) return Promise.resolve();
    if (leafletPromise) return leafletPromise;
    leafletPromise = new Promise((resolve, reject) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = LEAFLET_CSS;
      document.head.appendChild(css);
      const script = document.createElement('script');
      script.src = LEAFLET_JS;
      script.onload = () => resolve();
      script.onerror = () => {
        leafletPromise = null;
        reject(new Error('leaflet'));
      };
      document.head.appendChild(script);
    });
    return leafletPromise;
  }

  async function fetchJson(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  // Runs Nominatim requests one at a time, at most one per second.
  function nominatim(params) {
    const run = nominatimQueue.then(async () => {
      const wait = lastNominatimAt + NOMINATIM_DELAY_MS - Date.now();
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      lastNominatimAt = Date.now();
      const query = new URLSearchParams({ format: 'jsonv2', countrycodes: 'ca', ...params });
      return fetchJson(`${NOMINATIM_URL}?${query}`);
    });
    nominatimQueue = run.catch(() => {});
    return run;
  }

  async function geocode(query) {
    if (geocodeCache.has(query)) return geocodeCache.get(query);
    const results = await nominatim({ q: query, limit: '1' });
    const point = results.length ? { lat: Number(results[0].lat), lon: Number(results[0].lon) } : null;
    geocodeCache.set(query, point);
    return point;
  }

  function tenantAddress() {
    const get = (name) => (form.querySelector(`[name="${name}"]`).value || '').trim();
    return {
      address: get('tenant_address'),
      city: get('tenant_city') || 'Montréal',
      postal: get('tenant_postal'),
    };
  }

  // Try the full address first, then fall back to the postal code alone.
  async function locateTenant() {
    const { address, city, postal } = tenantAddress();

    const attempts = [
      [address, city, postal, 'Québec'].filter(Boolean).join(', '),
      postal && `${postal}, Québec`,
    ].filter(Boolean);

    for (const query of attempts) {
      const point = await geocode(query);
      if (point) return point;
    }
    return null;
  }

  async function findPlaces(home, categoryNames) {
    // Search box of roughly SEARCH_RADIUS_KM around the tenant (1° latitude ≈ 111 km).
    const dLat = SEARCH_RADIUS_KM / 111;
    const dLon = SEARCH_RADIUS_KM / (111 * Math.cos((home.lat * Math.PI) / 180));
    const viewbox = [home.lon - dLon, home.lat + dLat, home.lon + dLon, home.lat - dLat].join(',');

    const places = [];
    for (const category of categoryNames) {
      const def = CATEGORIES[category];
      const results = await nominatim({
        q: def.query,
        viewbox,
        bounded: '1',
        limit: '40',
        addressdetails: '1',
        extratags: '1',
      });
      results.filter(def.accept).forEach((r) => {
        const lat = Number(r.lat);
        const lon = Number(r.lon);
        const address = r.address || {};
        places.push({
          id: `${r.osm_type}${r.osm_id}`,
          category,
          name: r.name || '',
          address: [address.house_number, address.road].filter(Boolean).join(' '),
          lat,
          lon,
          distance: distanceKm(home.lat, home.lon, lat, lon),
        });
      });
    }

    const seen = new Set();
    return places
      .filter((place) => place.distance <= SEARCH_RADIUS_KM)
      .filter((place) => !seen.has(place.id) && seen.add(place.id))
      .sort((a, b) => a.distance - b.distance);
  }

  function distanceKm(lat1, lon1, lat2, lon2) {
    const rad = (deg) => (deg * Math.PI) / 180;
    const dLat = rad(lat2 - lat1);
    const dLon = rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function formatDistance(km) {
    const lang = document.documentElement.lang;
    return `${km.toLocaleString(lang, { maximumFractionDigits: 1, minimumFractionDigits: 1 })} km`;
  }

  function directionsUrl(home, place) {
    return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=${home.lat},${home.lon};${place.lat},${place.lon}`;
  }

  // Builds a label whose text follows the interface language (applyLanguage updates [data-i18n]).
  function i18nSpan(key) {
    const span = document.createElement('span');
    span.setAttribute('data-i18n', key);
    span.textContent = t(key, document.documentElement.lang);
    return span;
  }

  function placeDetails(place, home) {
    const wrap = document.createElement('div');
    wrap.className = 'map-place-body';
    const title = document.createElement('strong');
    if (place.name) {
      title.textContent = place.name;
    } else {
      title.appendChild(i18nSpan(`map.cat.${place.category}`));
    }
    wrap.appendChild(title);

    const meta = document.createElement('span');
    meta.className = 'map-place-meta';
    meta.appendChild(i18nSpan(`map.cat.${place.category}`));
    meta.appendChild(document.createTextNode(` · ${formatDistance(place.distance)}`));
    if (place.address) meta.appendChild(document.createTextNode(` · ${place.address}`));
    wrap.appendChild(meta);

    const link = document.createElement('a');
    link.href = directionsUrl(home, place);
    link.target = '_blank';
    link.rel = 'noopener';
    link.appendChild(i18nSpan('map.directions'));
    wrap.appendChild(link);
    return wrap;
  }

  function setStatus(state, key) {
    if (!key) {
      state.status.hidden = true;
      state.status.removeAttribute('data-i18n');
      return;
    }
    state.status.hidden = false;
    state.status.setAttribute('data-i18n', key);
    state.status.textContent = t(key, document.documentElement.lang);
  }

  function renderMap(state, home, places) {
    if (!state.map) {
      state.map = L.map(state.canvas, { scrollWheelZoom: false });
      // tile.openstreetmap.org is a low-volume demo server that blocks third-party apps
      // (see osm.wiki/Blocked). OSM France's donation-funded mirror explicitly welcomes
      // external reuse, as long as OpenStreetMap is credited (done below).
      L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
        subdomains: 'abc',
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(state.map);
    }
    if (state.layer) state.layer.remove();
    state.layer = L.featureGroup().addTo(state.map);

    L.circleMarker([home.lat, home.lon], {
      radius: 9, color: '#fff', weight: 3, fillColor: HOME_COLOR, fillOpacity: 1,
    }).bindPopup(i18nSpan('map.home')).addTo(state.layer);

    places.forEach((place) => {
      L.circleMarker([place.lat, place.lon], {
        radius: 7, color: '#fff', weight: 2, fillColor: CATEGORIES[place.category].color, fillOpacity: 1,
      }).bindPopup(placeDetails(place, home)).addTo(state.layer);
    });

    // Leaflet needs the container to be visible to measure it.
    state.map.invalidateSize();
    if (places.length) {
      state.map.fitBounds(state.layer.getBounds(), { padding: [24, 24], maxZoom: 16 });
    } else {
      state.map.setView([home.lat, home.lon], 15);
    }
  }

  function renderList(state, home, places) {
    state.list.replaceChildren();
    places.slice(0, MAX_LISTED).forEach((place) => {
      const li = document.createElement('li');
      li.className = 'map-place';
      const dot = document.createElement('span');
      dot.className = 'map-dot';
      dot.style.background = CATEGORIES[place.category].color;
      li.appendChild(dot);
      li.appendChild(placeDetails(place, home));
      state.list.appendChild(li);
    });
  }

  function openDialog(kind) {
    Object.entries(panels).forEach(([name, state]) => {
      state.panel.hidden = name !== kind;
    });
    dialog.setAttribute('aria-labelledby', `map-title-${kind}`);
    if (!dialog.open) dialog.showModal();
  }

  async function showMap(kind, button) {
    const state = panels[kind];
    const addressKey = JSON.stringify(tenantAddress());
    openDialog(kind);

    // Same address as last time: the results are still there.
    if (state.loadedFor === addressKey) {
      state.map.invalidateSize();
      return;
    }

    button.disabled = true;
    state.loadedFor = null;
    state.canvas.hidden = true;
    state.list.replaceChildren();
    setStatus(state, 'map.loading');
    try {
      const [home] = await Promise.all([locateTenant(), loadLeaflet()]);
      if (!home) {
        setStatus(state, 'map.notFound');
        return;
      }
      const places = await findPlaces(home, MAP_KINDS[kind]);
      state.canvas.hidden = false;
      renderMap(state, home, places);
      renderList(state, home, places);
      setStatus(state, places.length ? null : 'map.none');
      state.loadedFor = addressKey;
    } catch (e) {
      setStatus(state, 'map.error');
    } finally {
      button.disabled = false;
    }
  }

  // A new letter may use a different address: drop the old results.
  function reset() {
    if (dialog.open) dialog.close();
    Object.values(panels).forEach((state) => {
      state.loadedFor = null;
      state.list.replaceChildren();
      if (state.layer) {
        state.layer.remove();
        state.layer = null;
      }
    });
  }

  document.querySelectorAll('[data-map-kind]').forEach((button) => {
    button.addEventListener('click', () => showMap(button.getAttribute('data-map-kind'), button));
  });
  document.getElementById('btn-generate').addEventListener('click', reset);
  document.getElementById('map-close').addEventListener('click', () => dialog.close());
  // Clicking the dimmed backdrop (outside the dialog body) closes it.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
})();
