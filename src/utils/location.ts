export async function getGooglePlaces(query: string) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.error('GOOGLE_MAPS_API_KEY is not configured in environment variables');
    throw new Error('Google Maps API key is not configured. Please add GOOGLE_MAPS_API_KEY to your .env.local file.');
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?key=${apiKey}&address=${encodeURIComponent(query)}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Google Maps API request failed with status ${response.status}`);
  }

  const data = await response.json();

  if (data.status === 'REQUEST_DENIED') {
    throw new Error('Google Maps API request denied. Please check your API key and ensure the Geocoding API is enabled.');
  }

  if (data.status === 'OVER_QUERY_LIMIT') {
    throw new Error('Google Maps API quota exceeded. Please check your usage limits.');
  }

  return data;
}

export const getAddressDetails = async (i: number, data: any, sourceData: any[]) => {
  if (
    data?.address &&
    (!data.lat ||
      !data.lng ||
      !data.city ||
      !data.state ||
      !data.country ||
      !data.zip_code)
  ) {
    try {
      const filterAddress: string[] = [];
      const response = await getGooglePlaces(data.address);
      const address = response?.results?.[0]?.address_components?.reverse();

      if (!address?.length) {
        console.warn(`No geocoding results found for address: ${data.address}`);
        return;
      }

      address.map((add: any) => {
        const { types, long_name, short_name } = add ?? {};
        if (
          (types?.[0] === "route" || types?.[0] === "street_number") &&
          short_name
        )
          filterAddress.push(short_name);
        if (types?.[0] === "postal_code" && !data.zip_code)
          sourceData[i].zip_code = long_name;
        else if (types?.[0] === "country" && !data.country)
          sourceData[i].country = short_name;
        else if (types?.[0] === "administrative_area_level_1" && !data.state)
          sourceData[i].state = short_name;
        else if (types?.[0] === "locality" && !data.city)
          sourceData[i].city = long_name;
        else if (types?.[0] !== "locality" && !data.city) {
          if (types?.[1] === "sublocality")
            sourceData[i].city = long_name;
        }

        sourceData[i].address = filterAddress.reverse().join(" ");
      });

      const location = response?.results[0]?.geometry?.location;

      if (!data.lat) sourceData[i].lat = location?.lat;
      if (!data.lng) sourceData[i].lng = location?.lng;
    } catch (error) {
      console.error(`Failed to geocode address "${data.address}" at row ${i + 1}:`, error);
      // Continue processing other addresses instead of failing completely
    }
  }
};

export const autoFillLocation = async (sourceData: any[]) => {
  for (const [i, data] of sourceData.entries()) {
    await getAddressDetails(i, data, sourceData);
  }
};
