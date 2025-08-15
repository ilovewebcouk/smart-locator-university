// src/functions/locations.js
const fetch = require('node-fetch');

/**
 * Normalize Webflow "Option" multi-select into a flat array of names.
 * Handles strings, arrays of strings, or arrays of {name, id}.
 */
function normalizeServices(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) {
        if (raw.length === 0) return [];
        if (typeof raw[0] === 'string') return raw;
        if (raw[0] && typeof raw[0].name === 'string') return raw.map(o => o.name);
    }
    if (typeof raw === 'string') {
        return raw.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
}

/** Build one GeoJSON Feature from a Webflow item */
function toFeature(item) {
    const latlng = item.fieldData.latitude; // "Latitude & Longitude" field
    if (!latlng) return null;

    const [lat, lng] = latlng.split(',').map(s => parseFloat(s.trim()));
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

    const services = normalizeServices(item.fieldData['services-available']);

    return {
        type: 'Feature',
        id:   item.id,
        properties: {
            storeid:  item.id,
            name:     item.fieldData.name || '',
            slug:     item.fieldData.slug || '',
            address:  item.fieldData.address || '',
            excerpt:  item.fieldData.excerpt || '',
            infoHtml: item.fieldData.information || '',
            image:    item.fieldData['main-image']?.url || '',
            profile:  item.fieldData['profile-image']?.url || '',
            town:     item.fieldData['area-1'] || '',
            services,
            // optional extras you might use on trainer pages:
            phone:    item.fieldData.telephone || '',
            email:    item.fieldData.email || '',
            social: {
                facebook:  item.fieldData.facebook || '',
                instagram: item.fieldData.instagram || '',
                google:    item.fieldData.google || ''
            },
            placeId:  item.fieldData['place-id-google-reviews'] || '',
            mapsSrc:  item.fieldData['google-map-embed-2'] || '',
            acuitySrc:item.fieldData['acuity-assessments-embed-code'] || ''
        },
        geometry: { type: 'Point', coordinates: [lng, lat] }
    };
}

/** Fetch all items with pagination */
async function fetchAllItems(collectionId, token) {
    const all = [];
    let offset = 0;
    const limit = 100;

    /* Webflow v2 live endpoint supports offset+limit */
    /* Loop until fewer than limit returned */
    for (;;) {
        const url = `https://api.webflow.com/v2/collections/${collectionId}/items/live?offset=${offset}&limit=${limit}`;
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}`, accept: 'application/json' }
        });
        if (!res.ok) throw new Error(`Webflow fetch failed ${res.status}`);
        const json = await res.json();
        const items = json.items || [];
        all.push(...items);
        if (items.length < limit) break;
        offset += limit;
    }
    return all;
}

exports.handler = async function(event) {
    // CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers: {
                'Access-Control-Allow-Origin':  '*',
                'Access-Control-Allow-Methods': 'GET,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: ''
        };
    }

    // Collections
    const COLLECTIONS = {
        trainer:    '6860ecbf9d22681e60ff5fed',
        university: '6827594dfcf4f6f6756d0ac7'
    };

    // Query params
    const params    = event.queryStringParameters || {};
    const typeParam = (params.type || '').toLowerCase();
    const collectionId = COLLECTIONS[typeParam];

    if (!collectionId) {
        return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Missing or invalid type param (trainer|university)' })
        };
    }

    // Security: use env var
    const API_TOKEN = process.env.WEBFLOW_TOKEN;
    if (!API_TOKEN) {
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Missing WEBFLOW_TOKEN environment variable' })
        };
    }

    try {
        const items = await fetchAllItems(collectionId, API_TOKEN);

        // Optional filtering by slug or id
        const bySlug = params.slug;
        const byId   = params.id;
        const filtered = (bySlug || byId)
            ? items.filter(it =>
                (bySlug && it.fieldData.slug === bySlug) ||
                (byId && it.id === byId)
            )
            : items;

        const features = filtered.map(toFeature).filter(Boolean);

        // Basic cache headers to speed up map loads
        return {
            statusCode: 200,
            headers: {
                'Content-Type':                'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control':               'public, max-age=300, s-maxage=300' // 5 minutes
            },
            body: JSON.stringify({ type: 'FeatureCollection', features })
        };
    } catch (err) {
        console.error('Function error:', err);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Proxy error' })
        };
    }
};