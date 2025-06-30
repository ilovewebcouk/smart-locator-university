// src/functions/locations.js
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    // 1) Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers: {
                'Access-Control-Allow-Origin':  '*',
                'Access-Control-Allow-Methods': 'GET,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: ''
        };
    }

    // Declare colletion IDs
    const COLLECTIONS = {
        trainer:    '6860ecbf9d22681e60ff5fed',
        university: '6827594dfcf4f6f6756d0ac7',
    };

    // Determine which collection to fetch
    const params       = event.queryStringParameters || {};
    const typeParam    = (params.type || '').toLowerCase();
    const collectionId = COLLECTIONS[typeParam];

    if (!collectionId) {
        return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Missing or invalid type param (trainer|university)' }),
        };
    }

    // 2) On real GET, fetch & return GeoJSON
    const API_URL =
        `https://api.webflow.com/v2/collections/${collectionId}/items/live?offset=0&limit=100`;
    const API_TOKEN = '46274ed627db4d7af9cd40fded3f729886824b6918b58b663b735a02fbeca748';

    try {
        const wfRes = await fetch(API_URL, {
            headers: {
                Authorization: `Bearer ${API_TOKEN}`,
                accept:        'application/json',
            },
        });
        const { items } = await wfRes.json();

        const features = items
            .map(item => {
                if (!item.fieldData.latitude) return null;
                const [lat, lng] = item.fieldData.latitude
                    .split(',')
                    .map(s => parseFloat(s.trim()));
                return {
                    type: 'Feature',
                    id:   item.id,
                    properties: {
                        storeid:  item.id,
                        name:     item.fieldData.name,
                        address:  item.fieldData.address,
                        excerpt:  item.fieldData['location-excerpt'],
                        infoHtml: item.fieldData.information,
                        image:    item.fieldData['main-image']?.url || '',
                        slug:     item.fieldData.slug,
                    },
                    geometry: { type: 'Point', coordinates: [lng, lat] },
                };
            })
            .filter(Boolean);

        return {
            statusCode: 200,
            headers: {
                'Content-Type':                'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ type: 'FeatureCollection', features }),
        };
    } catch (e) {
        console.error('Function error:', e);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
            body: 'Proxy error',
        };
    }
};