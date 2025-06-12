import type { ExportEntity } from "@/config/exportEntities";

export const mapEntityFields = (entityConfig: ExportEntity) => {
  return entityConfig.fields.reduce((acc, item) => {
    return {
      ...acc,
      [item.name]: item.sourceColumn || item.name,
    };
  }, {});
};

export const transformPayload = (data: any[], entityConfig: ExportEntity) => {
  const mappedFields = mapEntityFields(entityConfig);
  return data.map((item) => {
    const mappedItem: Record<string, any> = {};
    Object.keys(mappedFields).forEach((key) => {
      const sourceColumn = mappedFields[key as keyof typeof mappedFields];
      const val = item[key];
      if (sourceColumn == "address") {
        const address = {
          address: val,
          lat: 27.6755549,
          lng: 85.3459238,
        };
        mappedItem[sourceColumn] = address;
      } else {
        mappedItem[sourceColumn] = val;
      }
    });
    let addressData = {};
    if (entityConfig.name === "Truck Owner") {
      // ! hardcoded address data
      // ! TODO: remove this after testing
      addressData = {
        country: "NP",
        city: "Kathmandu",
        countryCode: "NP",
        zip_code: "44600",
        state: "Bagmati",
      };
    }

    if (entityConfig.name === "Trucks") {
      mappedItem["equipment_type"] = "TRUCK";
    }

    return { ...mappedItem, ...addressData };
  });
};
