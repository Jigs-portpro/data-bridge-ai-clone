import type { ExportEntity } from "@/config/exportEntities";
import { transformEntityPermissions } from "./permissions";
import { autoFillLocation } from "./location";

export const mapEntityFields = (entityConfig: ExportEntity) => {
  return entityConfig.fields.reduce((acc, item) => {
    return {
      ...acc,
      [item.name]: item.sourceColumn || item.name,
    };
  }, {});
};

export const transformPayload = async (
  data: any[],
  entityConfig: ExportEntity
) => {
  const mappedFields = mapEntityFields(entityConfig);
  const STRING_ADDRESS_ENTITY = ["Chassis Owner"];

  const mappedData = data.map((item) => {
    const mappedItem: Record<string, any> = {};
    Object.keys(mappedFields).forEach((key) => {
      const sourceColumn = mappedFields[key as keyof typeof mappedFields];
      const val = item[key];
      if (
        sourceColumn == "address" &&
        !STRING_ADDRESS_ENTITY.includes(entityConfig.name)
      ) {
        const address = {
          address: val,
        };
        mappedItem[sourceColumn] = address;
      } else {
        mappedItem[sourceColumn] = val;
      }
    });
    if(entityConfig.name === "Organization") {
      mappedItem.address = {
      address: mappedItem.address?.address || '',
      lat: mappedItem.address?.lat || 0,
      lng: mappedItem.address?.lng || 0,
      address1: mappedItem.address1 || '',
      city: mappedItem.city || '',
      state: mappedItem.state || '',
      country: mappedItem.country || '',
      zip_code: mappedItem.zip_code || ''
      };
      mappedItem.address1 = mappedItem.address?.address || '';
      mappedItem.customerType = Array.isArray(mappedItem.customerType) 
      ? mappedItem.customerType 
      : [mappedItem.customerType];
      mappedItem.newTerminal = Array.isArray(mappedItem.Branch) 
      ? mappedItem.Branch 
      : [mappedItem.Branch];
      mappedItem.mcNumber = mappedItem['Mc number'];
      mappedItem.payType = mappedItem['Pay type'];
      
    }
    if (entityConfig.name === "Trucks") {
      mappedItem["equipment_type"] = "TRUCK";
    } else if (entityConfig.name === "Trailers") {
      mappedItem["equipment_type"] = "TRAILER";
    } else if (entityConfig.name === "People") {
      // Transform People entity specific fields using generic permissions utility
      // This modifies mappedItem in place and removes individual permission fields
      transformEntityPermissions(mappedItem, entityConfig.name);
      mappedItem["isCustomer"] = true;
      // Transform mobile number to array format
      if (mappedItem["mobileNumbers"]) {
        const mobile = mappedItem["mobileNumbers"];
        if (typeof mobile === "string") {
          mappedItem["mobileNumbers"] = [{ label: "Mobile", mobile: mobile }];
        } else if (Array.isArray(mobile)) {
          mappedItem["mobileNumbers"] = mobile.map((num: any) => ({
            label: "Mobile",
            mobile: String(num),
          }));
        } else {
          mappedItem["mobileNumbers"] = [
            { label: "Mobile", mobile: String(mobile) },
          ];
        }
      }
    }

    return mappedItem;
  });

  const AUTO_FILL_LOCATION_ENTITY = ["Truck Owner", "Carrier"];
  // Auto-fill location details for Truck Owner entity instead of hardcoded data
  if (AUTO_FILL_LOCATION_ENTITY.includes(entityConfig.name)) {
    try {
      await autoFillLocation(mappedData);

      // After auto-fill, restructure the address data to match API expectations
      mappedData.forEach((item) => {
        if (item.address && typeof item.address === "object") {
          // Address is already in the correct nested structure
          if (!item.address.address)
            item.address.address = item.address.address || "";
          if (!item.address.lat) item.address.lat = item.lat || 27.6755549;
          if (!item.address.lng) item.address.lng = item.lng || 85.3459238;
        } else {
          // Create nested address structure
          const addressValue = item.address || "";
          item.address = {
            address: addressValue,
            lat: item.lat || 27.6755549,
            lng: item.lng || 85.3459238,
          };
        }

        // Ensure required fields are present
        if (!item.city) item.city = item.city || "Kathmandu";
        if (!item.country) item.country = item.country || "NP";
        if (!item.state) item.state = item.state || "Bagmati";
        if (!item.zip_code) item.zip_code = item.zip_code || "44600";
        if (!item.countryCode) item.countryCode = item.countryCode || "NP";

        if (entityConfig.name === "Carrier") {
          item.vendorType = "CARRIER";
          // Set carrierAddress in the specific format required for Carrier entity
          item.defaultAddress = item.address?.address || item.address || "";
          item.carrierAddress = {
            address: item.address?.address || item.address || "",
            lat: item.address?.lat || item.lat || 12,
            lng: item.address?.lng || item.lng || 12,
            address1: item.defaultAddress || "",
            city: item.city || "",
            state: item.state || "",
            country: item.countryCode || item.country_code || "NP",
            zip_code: item.zip_code || item.zip || "",
          };

          // Set country_code for Carrier
          item.country_code = item.countryCode || "NP";
          delete item.address;
        }

        // Clean up flat lat/lng properties since they're now in address object
        delete item.lat;
        delete item.lng;
      });
    } catch (error) {
      console.error("Error auto-filling location data for Truck Owner:", error);
      // Fallback to hardcoded data if API fails
      mappedData.forEach((item) => {
        if (!item.address || typeof item.address !== "object") {
          item.address = {
            address: item.address || "",
            lat: 27.6755549,
            lng: 85.3459238,
          };
        }
        if (!item.country) item.country = "NP";
        if (!item.city) item.city = "Kathmandu";
        if (!item.countryCode) item.countryCode = "NP";
        if (!item.zip_code) item.zip_code = "44600";
        if (!item.state) item.state = "Bagmati";
      });
    }
  }

  return mappedData;
};
