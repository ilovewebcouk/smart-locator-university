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
    const container = document.querySelector('.trainer-collection-list');
    if (!container) return;

    const rows = features.map(f => {
        const id       = f.getProperty('storeid');
        const name     = f.getProperty('name');
        const town     = f.getProperty('town') || '';
        const address  = f.getProperty('address') || '';
        const slug     = f.getProperty('slug');
        const image    = f.getProperty('profile') || f.getProperty('image') || '';
        // const services = f.getProperty('services') || [];
        const dObj     = distancesById ? distancesById[id] : null;

        return {
            id, name, town, address, slug, image,
            distanceText: dObj?.distanceText || null,
            distanceVal:  dObj?.distanceVal  ?? Number.POSITIVE_INFINITY,
            feature: f
        };
    });

    if (distancesById) rows.sort((a, b) => a.distanceVal - b.distanceVal);

    container.innerHTML = '';
    rows.forEach(r => {
        const card = document.createElement('div');

            card.className = 'trainer-card shadow-xlarge';
            card.innerHTML = `
            <div class="trainer-top">
              ${r.image
                ? `<img src="${r.image}" alt="${r.name}" loading="lazy" class="trainer-image">`
                : `<div class="trainer-card__placeholder"></div>`}
            </div>
            <div class="trainer-bottom">
                <div class="trainer-info">
                    <div class="margin-bottom margin-xsmall">
                         <div class="text-style-tagline">${r.town || ''}</div>
                    </div>
                    <div class="margin-bottom margin-xsmall">
                        <div class="trainer-name-wrap"><h3 class="trainer_name">${r.name}</h3>
                            <div class="trainer-title">SMDT</div>
                        </div>
                    </div>
                        <div class="margin-bottom margin-small">
                            <div class="card_location_wrap">
                                <div>📍</div><div>${r.address || ''}</div>
                            </div>  
                        </div>
                </div>
                    <div class="button-group">
                        <a data-w-id="9e7c5330-8ec0-ef63-6e62-0181fb9b7027" href="https://smartdogtraining.com/trainers/${r.slug}" class="button is-icon max-width-full w-inline-block">
                            <div>View Trainer</div>
                            <div style="transform: translate3d(0px, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg) skew(0deg, 0deg); transform-style: preserve-3d;" class="icon-embed-xxsmall w-embed">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free v7.0.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.-->
                                    <path fill="currentColor" d="M502.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-160-160c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L402.7 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l370.7 0-105.4 105.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l160-160z"></path>
                                </svg>
                            </div>
                        </a>
                    </div>
                ${r.distanceText ? `<div class="text-size-small distance-tag">${r.distanceText} away</div>` : ``}
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
            imageUrl: event.feature.getProperty('profile') || event.feature.getProperty('image'),
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