// Add custom CSS
const style = document.createElement('style');
style.textContent = `
  /* Container for the trainer list */
#store-list {
    grid-column-gap: 2rem;
    grid-row-gap: 2rem;
    grid-template-rows: auto;
    grid-template-columns: 1fr 1fr 1fr;
    grid-auto-columns: 1fr;
    display: grid;
}

.trainer-card {
    border-radius: var(--_radius---large);
    flex-direction: column;
    grid-template-rows: auto;
    grid-template-columns: 1fr 1fr;
    grid-auto-columns: 1fr;
    align-items: stretch;
    display: flex;
    overflow: hidden;
}

.shadow-xlarge {
    box-shadow: 0 24px 48px -12px #0000002e;
}

.trainer-card__media img,
.trainer-card__placeholder {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #f4f6f8;
}

.trainer-card__body { padding: 14px; }
.trainer-card__title { margin: 0 0 6px; font-size: 18px; line-height: 1.2; }
.trainer-card__meta { font-size: 13px; color: #666; margin-bottom: 10px; }

.trainer-card__services { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
.svc-tag { font-size: 12px; padding: 4px 8px; border: 1px solid #e6e6e6; border-radius: 999px; background: #fafafa; white-space: nowrap; }

.trainer-card__btn {
  display: inline-block; font-size: 14px; padding: 10px 12px; border-radius: 10px;
  background: #111; color: #fff; text-decoration: none;
}
.trainer-card__btn:hover { opacity: .9; }
`;
document.head.appendChild(style);

/* ===== Map style (unchanged) ===== */
const mapStyle = [
    { featureType: 'administrative', elementType: 'all', stylers: [{ visibility: 'on' }, { lightness: 33 }] },
    { featureType: 'landscape', elementType: 'all', stylers: [{ color: '#f8f9fa' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#dce8dd' }] },
    { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'on' }, { lightness: 20 }] },
    { featureType: 'road', elementType: 'all', stylers: [{ lightness: 20 }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#f4a261' }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#ffd28f' }] },
    { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'water', elementType: 'all', stylers: [{ visibility: 'on' }, { color: '#b6d8ef' }] },
];

/* ===== Optional: service icons map (adjust URLs to your assets) ===== */
const SERVICE_ICONS = {
    'Obedience Training': '/icons/obedience.svg',
    'Puppy Training': '/icons/puppy.svg',
    'Service Dog Training': '/icons/service-dog.svg',
    'Anxiety & Aggression': '/icons/behaviour.svg',
    'Therapy Dog Training': '/icons/therapy.svg',
    'Group Training': '/icons/group.svg',
    'Protection Training': '/icons/protection.svg',
};

/* ===== Helpers ===== */
function getAllFeaturesArray(mapData) {
    const arr = [];
    mapData.forEach(f => arr.push(f));
    return arr;
}

function buildInfoWindowContent({ name, excerpt, address, imageUrl, slug }) {
    const logoUrl = 'https://smart-locator-university.netlify.app/img/smart_dog_training.svg';
    const detailsUrl = `https://smartdogtraining.com/trainers/${slug}`;
    return `
    <div style="max-width:300px; font-family:Arial, sans-serif;">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;">
        <img src="${logoUrl}" alt="trainer logo" style="width:150px;height:auto;object-fit:contain;">
        <div id="iw-close-btn" style="font-size:30px;line-height:16px;cursor:pointer;user-select:none;color:#70757a;">&times;</div>
      </div>
      <a href="${detailsUrl}">
        <h2 style="margin:0 0 6px;font-size:18px;">${name}</h2>
        <p style="margin:0 0 8px;font-size:14px;color:#333;">${excerpt || ''}</p>
        <p style="margin:0 0 12px;font-size:12px;color:#555;"><i>${address || ''}</i></p>
        <hr style="border:none;border-top:1px solid #ddd;margin:0 0 8px;">
        ${imageUrl ? `<img src="${imageUrl}" alt="${name}" style="width:100%;max-height:180px;object-fit:cover;">` : ''}
      </a>
    </div>`;
}

/* Render the grid of trainer cards. If distancesById provided, sorts and shows distance */
function renderStoreList(features, distancesById = null) {
    const container = document.getElementById('store-list');
    if (!container) return;

    const rows = features.map(f => {
        const id       = f.getProperty('storeid');
        const name     = f.getProperty('name');
        const town     = f.getProperty('town') || '';
        const slug     = f.getProperty('slug');
        const image    = f.getProperty('profile') || f.getProperty('image') || '';
        const services = f.getProperty('services') || [];
        const dObj     = distancesById ? distancesById[id] : null;

        return {
            id, name, town, slug, image, services,
            distanceText: dObj?.distanceText || null,
            distanceVal:  dObj?.distanceVal  ?? Number.POSITIVE_INFINITY,
            feature: f
        };
    });

    if (distancesById) rows.sort((a, b) => a.distanceVal - b.distanceVal);

    container.innerHTML = '';
    rows.forEach(r => {
        const tagsHtml = r.services.slice(0, 5).map(svc => {
            const icon = SERVICE_ICONS[svc] ? `<img src="${SERVICE_ICONS[svc]}" alt="" width="14" height="14" style="vertical-align:middle;margin-right:6px">` : '';
            return `<span class="svc-tag">${icon}${svc}</span>`;
        }).join('');

        const card = document.createElement('div');
        card.className = 'location_card shadow-xlarge';
        card.innerHTML = `
      <div class="trainer-card__media">
        ${r.image ? `<img src="${r.image}" alt="${r.name}" loading="lazy">` : `<div class="trainer-card__placeholder"></div>`}
      </div>
      <div class="trainer-card__body">
        <h3 class="trainer-card__title">${r.name}</h3>
        <div class="trainer-card__meta">${r.town ? r.town : ''}${r.distanceText ? ` · ${r.distanceText} away` : ''}</div>
        <div class="trainer-card__services">${tagsHtml}</div>
        <a class="trainer-card__btn" href="https://smartdogtraining.com/trainers/${r.slug}">View Trainer</a>
      </div>
    `;
        container.appendChild(card);
    });
}

/* ===== Map init ===== */
async function initMap() {
    const map = new google.maps.Map(document.getElementById('map'), {
        zoom: 7,
        center: { lat: 52.9, lng: -1.48 },
        styles: mapStyle,
    });

    // Load GeoJSON
    const res = await fetch('https://smart-locator-university.netlify.app/.netlify/functions/locations?type=trainer');
    const geojson = await res.json();
    map.data.addGeoJson(geojson);

    // Marker style
    map.data.setStyle(() => ({
        icon: {
            url: `https://smart-locator-university.netlify.app/img/icon_trainer.png`,
            scaledSize: new google.maps.Size(50, 60),
        },
        clickable: true
    }));

    // Reusable info window
    const infoWindow = new google.maps.InfoWindow();

    // Click markers → show card
    map.data.addListener('click', (event) => {
        const content = buildInfoWindowContent({
            name:    event.feature.getProperty('name'),
            excerpt: event.feature.getProperty('excerpt'),
            address: event.feature.getProperty('address'),
            imageUrl:event.feature.getProperty('image'),
            slug:    event.feature.getProperty('slug'),
        });

        infoWindow.setOptions({
            content,
            position: event.feature.getGeometry().get(),
            pixelOffset: new google.maps.Size(0, -30),
            closeBoxURL: ''
        });
        infoWindow.open(map);

        // attach close
        setTimeout(() => {
            const btn = document.getElementById('iw-close-btn');
            if (btn) btn.onclick = () => infoWindow.close();
        }, 0);
    });

    // Autocomplete
    const input = document.getElementById('pac-input');
    const autocomplete = new google.maps.places.Autocomplete(input, {
        types: ['address'],
        componentRestrictions: { country: 'gb' },
    });
    autocomplete.setFields(['geometry', 'name']);

    const originMarker = new google.maps.Marker({ map });
    originMarker.setVisible(false);

    // Initial list: show all trainers (unsorted)
    renderStoreList(getAllFeaturesArray(map.data));

    // On place selection: compute distances and re-render nearest-first
    autocomplete.addListener('place_changed', async () => {
        const place = autocomplete.getPlace();
        if (!place.geometry) return;

        const origin = place.geometry.location;
        map.setCenter(origin);
        map.setZoom(9);
        originMarker.setPosition(origin);
        originMarker.setVisible(true);

        const ranked = await calculateDistances(map.data, origin);
        const byId = {};
        ranked.forEach(r => { byId[r.storeid] = r; });

        renderStoreList(getAllFeaturesArray(map.data), byId);
    });
}

/* ===== Distance calc (unchanged) ===== */
async function calculateDistances(data, origin) {
    const stores = [];
    const destinations = [];

    data.forEach((store) => {
        const storeNum = store.getProperty('storeid');
        const storeLoc = store.getGeometry().get();
        stores.push(storeNum);
        destinations.push(storeLoc);
    });

    const service = new google.maps.DistanceMatrixService();
    const distancesList = await new Promise((resolve, reject) => {
        service.getDistanceMatrix(
            {
                origins: [origin],
                destinations,
                travelMode: 'DRIVING',
                unitSystem: google.maps.UnitSystem.IMPERIAL, // switch to METRIC for km
            },
            (response, status) => {
                if (status !== google.maps.DistanceMatrixStatus.OK) return reject(response);
                const distances = response.rows[0].elements.map((el, j) => ({
                    storeid: stores[j],
                    distanceText: el.distance.text,
                    distanceVal: el.distance.value,
                }));
                resolve(distances.sort((a, b) => a.distanceVal - b.distanceVal));
            }
        );
    });

    return distancesList;
}

/* ===== Expose init ===== */
window.initMap = initMap;