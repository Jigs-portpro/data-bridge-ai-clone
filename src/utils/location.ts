export async function getGooglePlaces(query: string) {
  let url =
    "https://maps.googleapis.com/maps/api/geocode/json?key=AIzaSyD1WC-07rfhCPOaSCmuvKDr5-x5nbquf04&address=" +
    encodeURIComponent(query + "");
  const response = await (await fetch(url)).json();
  return response;
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

      if (!address?.length) return;

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
      console.error(error);
    }
  }
};

export const autoFillLocation = async (sourceData: any[]) => {
  for (const [i, data] of sourceData.entries()) {
    await getAddressDetails(i, data, sourceData);
  }
};
