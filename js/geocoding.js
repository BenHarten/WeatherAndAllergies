// ============ GEOCODING ============
async function geocodeMultiple(q) {
  try {
    const res = await fetch(APIS.geoapifySearch(q));
    if(!res.ok) return null;
    
    const data = await res.json();
    if(!data.features?.length) return null;
    
    // Return all results
    return data.features.map(feature => {
      const coords = feature.geometry.coordinates;
      const props = feature.properties;
      const display_name = props.formatted || `${props.city || props.name}, ${props.country}`;
      return {lat: coords[1], lon: coords[0], display_name};
    });
  } catch(e) {
    console.error('Geocode error:', e);
    return null;
  }
}

async function geocode(q) {
  const results = await geocodeMultiple(q);
  return results ? results[0] : null;
}

async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(APIS.geoapifyReverse(lat, lon));
    if(!res.ok) return null;
    
    const data = await res.json();
    if(!data.features?.length) return null;
    
    const props = data.features[0].properties;
    return props.name || props.city || props.county || props.state || null;
  } catch(e) {
    console.log('Reverse geocoding failed');
    return null;
  }
}
