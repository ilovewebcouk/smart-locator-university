const mapStyle = [{
    'featureType': 'administrative',
    'elementType': 'all',
    'stylers': [{
        'visibility': 'on',
    },
        {
            'lightness': 33,
        },
    ],
},
    {
        'featureType': 'landscape',
        'elementType': 'all',
        'stylers': [{
            'color': '#f8f9fa',
        }],
    },
    {
        'featureType': 'poi.park',
        'elementType': 'geometry',
        'stylers': [{
            'color': '#dce8dd',
        }],
    },
    {
        'featureType': 'poi.park',
        'elementType': 'labels',
        'stylers': [{
            'visibility': 'on',
        },
            {
                'lightness': 20,
            },
        ],
    },
    {
        'featureType': 'road',
        'elementType': 'all',
        'stylers': [{
            'lightness': 20,
        }],
    },
    {
        'featureType': 'road.highway',
        'elementType': 'geometry',
        'stylers': [{
            'color': '#f4a261',
        }],
    },
    {
        'featureType': 'road.arterial',
        'elementType': 'geometry',
        'stylers': [{
            'color': '#ffd28f',
        }],
    },
    {
        'featureType': 'road.local',
        'elementType': 'geometry',
        'stylers': [{
            'color': '#ffffff',
        }],
    },
    {
        'featureType': 'water',
        'elementType': 'all',
        'stylers': [{
            'visibility': 'on',
        },
            {
                'color': '#b6d8ef',
            },
        ],
    },
];

async function initMap() {
    // 1. Create the map
    const map = new google.maps.Map(document.getElementById('map'), {
        zoom: 7,
        center: { lat: 52.9, lng: -1.48 },
        styles: mapStyle,
    });

    // Inside your initMap (make it async):
    const res     = await fetch('https://smart-locator-university.netlify.app/.netlify/functions/locations?type=trainer'
    );
    const geojson  = await res.json();
    map.data.addGeoJson(geojson);

    // 3. Style each feature’s marker icon by category (with fallback)
    map.data.setStyle(feature => ({
        icon: {
            url: `https://smart-locator-university.netlify.app/img/icon_trainer.png`,
            scaledSize: new google.maps.Size(50, 60),
        },
        // ensure the feature responds to clicks
        clickable: true
    }));

    // 4. InfoWindow instance (reused)
    const infoWindow = new google.maps.InfoWindow();

    // Show the information for a venue when its marker is clicked.
    map.data.addListener('click', (event) => {
        // grab props...
        const name     = event.feature.getProperty('name');
        const excerpt  = event.feature.getProperty('excerpt');
        const address  = event.feature.getProperty('address');
        const imageUrl = event.feature.getProperty('image');
        const slug     = event.feature.getProperty('slug')

        // Build slug path

        const detailsUrl = `https://smartdogtraining.com/trainers/${slug}`

        // pick the logo
        const logoUrl = 'https://smart-locator-university.netlify.app/img/smart_dog_training.svg';

        // Build header + body
        const content = `
      <div style="max-width:300px; font-family:Arial, sans-serif;">
      <!-- Header flex -->
      <div style="
          display:flex;
          justify-content:space-between;
          align-items:start;
          margin-bottom:8px;
        ">
        <!-- Logo on left -->
        <img
          src="${logoUrl}"
          alt="trainer logo"
          style="width:150px; height:auto; object-fit:contain;"
        >
        <!-- Custom close button on right -->
        <div
          id="iw-close-btn"
          style="
            font-size:30px;
            line-height:16px;
            cursor:pointer;
            user-select:none;
            color: #70757a;
          "
        >&times;</div>
      </div>

      <!-- Link to venue page  -->
      <a href="${detailsUrl}">
        <!-- Body text -->
        <h2 style="margin:0 0 6px; font-size:18px;">${name}</h2>
        <p style="margin:0 0 8px; font-size:14px; color:#333;">${excerpt}</p>
        <p style="margin:0 0 12px; font-size:12px; color:#555;"><i>${address}</i></p>

        <!-- Divider -->
        <hr style="border:none; border-top:1px solid #ddd; margin:0 0 8px;">

        <!-- Main image at bottom -->
        <img
        src="${imageUrl}"
        alt="${name}"
        style="width:100%; max-height:180px; object-fit:cover;"
        >     
      </a>
      
      
     
    </div>
    `;

        // Hide default close, then open with custom content
        infoWindow.setOptions({
            content,
            position: event.feature.getGeometry().get(),
            pixelOffset: new google.maps.Size(0, -30),
            closeBoxURL: ''    // remove the Google “X”
        });
        infoWindow.open(map);

        // Attach click listener to your custom “X”
        // Wait a tick so the DOM is in place
        window.setTimeout(() => {
            const btn = document.getElementById('iw-close-btn');
            if (btn) btn.onclick = () => infoWindow.close();
        }, 0);
    });

    // Grab the input from your HTML (no more dynamic card)
    const input = document.getElementById('pac-input');

// Initialize the autocomplete widget
    const autocomplete = new google.maps.places.Autocomplete(input, {
        types: ['address'],
        componentRestrictions: { country: 'gb' },
    });
    autocomplete.setFields(['geometry', 'name']);

// Origin marker
    const originMarker = new google.maps.Marker({ map });
    originMarker.setVisible(false);

// Listen for selection
    autocomplete.addListener('place_changed', async () => {
        const place = autocomplete.getPlace();
        if (!place.geometry) {
            alert(`No address available for input: '${place.name}'`);
            return;
        }

        const origin = place.geometry.location;
        map.setCenter(origin);
        map.setZoom(9);
        originMarker.setPosition(origin);
        originMarker.setVisible(true);

        const ranked = await calculateDistances(map.data, origin);
        showStoresList(map.data, ranked);
    });
}


// ... keep your existing calculateDistances() and showStoresList() functions unchanged,
// since they already use storeid and map.data correctly.

async function calculateDistances(data, origin) {
    const stores = [];
    const destinations = [];

    // Build parallel arrays for the store IDs and destinations
    data.forEach((store) => {
        const storeNum = store.getProperty('storeid');
        const storeLoc = store.getGeometry().get();

        stores.push(storeNum);
        destinations.push(storeLoc);
    });

    // Retrieve the distances of each store from the origin
    // The returned list will be in the same order as the destinations list
    const service = new google.maps.DistanceMatrixService();
    const getDistanceMatrix =
        (service, parameters) => new Promise((resolve, reject) => {
            service.getDistanceMatrix(parameters, (response, status) => {
                if (status != google.maps.DistanceMatrixStatus.OK) {
                    reject(response);
                } else {
                    const distances = [];
                    const results = response.rows[0].elements;
                    for (let j = 0; j < results.length; j++) {
                        const element = results[j];
                        const distanceText = element.distance.text;
                        const distanceVal = element.distance.value;
                        const distanceObject = {
                            storeid: stores[j],
                            distanceText: distanceText,
                            distanceVal: distanceVal,
                        };
                        distances.push(distanceObject);
                    }

                    resolve(distances);
                }
            });
        });

    const distancesList = await getDistanceMatrix(service, {
        origins: [origin],
        destinations: destinations,
        travelMode: 'DRIVING',
        unitSystem: google.maps.UnitSystem.IMPERIAL,
    });

    distancesList.sort((first, second) => {
        return first.distanceVal - second.distanceVal;
    });

    return distancesList;
}

function showStoresList(data, stores) {
    const container = document.getElementById('store-list');
    if (!container) return;

    // Clear previous
    container.innerHTML = '';

    if (stores.length === 0) {
        container.innerHTML = '<p>No locations found.</p>';
        return;
    }

    // Build each store item
    stores.forEach((store) => {
        const currentStore = data.getFeatureById(store.storeid);
        const name = currentStore.getProperty('name');
        const distanceText = store.distanceText;

        const item = document.createElement('div');
        item.className = 'store-item';
        item.innerHTML = `
            <strong>${name}</strong><br>
            <span>${distanceText} away</span>
        `;

        container.appendChild(item);
    });
}

window.initMap = initMap;