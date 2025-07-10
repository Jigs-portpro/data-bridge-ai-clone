import type { ExportEntity } from "@/config/exportEntities";
import { transformEntityPermissions } from "./permissions";
import { autoFillLocation } from "./location";
import { buildCustomerProfile } from "./customer";
import { EVENT_OPTIONS, STATUSES, unitOfMeasureOptions } from "@/lib/constants";
import moment from "moment";

// Generate a MongoDB ObjectId-like string
const generateObjectId = () => {
  const timestamp = Math.floor(Date.now() / 1000).toString(16);
  const randomBytes = Math.random().toString(16).substring(2, 18);
  return timestamp + randomBytes;
};

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
  entityConfig: ExportEntity,
  carrierId?: string,
  customerData?: any[],
  driverGroupsData?: any[],
  branchData?: any[],
  carrierGroupsData?: any[],
  validChargeProfileList?: any[]
) => {
  const mappedFields:any = mapEntityFields(entityConfig);
  const STRING_ADDRESS_ENTITY = ["Chassis Owner"];

  const isChargeProfileEntity = entityConfig.name === "Charge Profile";

  if(isChargeProfileEntity) {
    mappedFields['Charge Code'] = 'chargeCode';
  }

  
  let formattedData = data.map((item) => {
    let mappedItem: Record<string, any> = {};
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

    return mappedItem;
  });


  const mappedData = formattedData.map((mappedItem) => {
    if(entityConfig.name === "Organization") {
      mappedItem.address = {
      address: mappedItem.address?.address || '',
      lat: mappedItem.Latitude || mappedItem.latitude || mappedItem.address?.lat || 0,
      lng: mappedItem.Longitude || mappedItem.longitude || mappedItem.address?.lng || 0,
      address1: mappedItem.address1 || '',
      city: mappedItem.city || '',
      state: mappedItem.state || '',
      country: mappedItem.country || '',
      zip_code: mappedItem.zip_code || ''
      };
      mappedItem.address1 = mappedItem.address?.address || '';
      
      // Transform customerType based on values
      const customerTypeMap: Record<string, string | string[]> = {
      'CUSTOMER': ['caller'],
      'TERMINAL': ['shipper', 'containerReturn'],
      'WAREHOUSE': ['consignee'],
      'YARD': ['chassisTermination', 'chassisPick'],
      'ALL': ['ALL']
      };

      const originalType = Array.isArray(mappedItem.customerType) 
      ? mappedItem.customerType[0] 
      : mappedItem.customerType;

      mappedItem.customerType = customerTypeMap[originalType] || originalType;

      mappedItem.newTerminal = Array.isArray(mappedItem.Branch) 
      ? mappedItem.Branch 
      : [mappedItem.Branch];
      mappedItem.mcNumber = mappedItem.mcNumber;
      mappedItem.payType = mappedItem.payType;
      
      // Clean up latitude and longitude fields 
      delete mappedItem.latitude;
      delete mappedItem.longitude;
      delete mappedItem.Latitude;
      delete mappedItem.Longitude;
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
    } else if (entityConfig.name === "Charge Profile") {
      const payload = getChargeProfilePayload(mappedItem, data = [], carrierId, customerData, driverGroupsData, carrierGroupsData);
      delete payload.vendorType;
      mappedItem = payload
    } else if (entityConfig.name === "Tariff") {
      const payload = getTariffPayload(mappedItem, data = [], carrierId, customerData, driverGroupsData, carrierGroupsData, validChargeProfileList, branchData);
      mappedItem = payload;
    }

    return mappedItem;
  })
  if (entityConfig.name === "Tariff") {
    const groupedByTariffName = new Map();
    
    for (const item of mappedData) {
      const tariffName = item.name;
      if (!groupedByTariffName.has(tariffName)) {
        groupedByTariffName.set(tariffName, item);
      }
    }
    
    const allTariffs = Array.from(groupedByTariffName.values());
    return { rateRecords: allTariffs };
  }

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

export const getChargeProfilePayload = (item: any,  data: any[], carrierId?: string, customerData?: any[], driverGroupsData?: any[], carrierGroupsData?: any[]) => {
  const chargeTemplate: any = {};

  // Helper function to check if field exists in item
  const hasField = (key: string) => {
    return (item ?? {})?.hasOwnProperty(key);
  };

  // Helper function to safely get field value
  const getFieldValue = (key: string, defaultValue: any = null) => {
    return hasField(key) ? (item[key] ?? defaultValue) : undefined;
  };

  // Special handling for eventTime field - check both "Event Time" and "eventTime"
  const getEventTimeValue = () => {
    if (hasField('eventTime')) return item['eventTime'];
    if (hasField('Event Time')) return item['Event Time'];
    return undefined;
  };

  // Required fields from ChargeTemplateValidator
  if (hasField('name') && item.name) chargeTemplate.name = item.name;
  if (hasField('chargeName') && item.chargeName) chargeTemplate.chargeName = item.chargeCode;
  if (hasField('chargeCode') && item.chargeCode) chargeTemplate.chargeCode = item.chargeName;
  if (hasField('unitOfMeasure') && item.unitOfMeasure) {
    chargeTemplate.unitOfMeasure = unitOfMeasureOptions.find((e) => e.label === item.unitOfMeasure)?.value;
  }

  // Required boolean fields
  chargeTemplate.systemGenerated = item.systemGenerated ?? false;
  chargeTemplate.isActive = item.isActive ?? true;

  // Optional fields from ChargeTemplateValidator
  if (hasField('description')) chargeTemplate.description = getFieldValue('description', '');
  if (hasField('owner')) chargeTemplate.owner = getFieldValue('owner');
  if (hasField('effectiveDateParameter')) chargeTemplate.effectiveDateParameter = getFieldValue('effectiveDateParameter');
  if (hasField('percentageOf')) chargeTemplate.percentageOf = getFieldValue('percentageOf');
  if (hasField('ruleErrorMessages')) chargeTemplate.ruleErrorMessages = getFieldValue('ruleErrorMessages');
  if (hasField('vendorId')) chargeTemplate.vendorId = getFieldValue('vendorId');
  if (hasField('vendorProfileType')) chargeTemplate.vendorProfileType = getFieldValue('vendorProfileType');
  if (hasField('chargesBasedOn')) chargeTemplate.chargesBasedOn = getFieldValue('chargesBasedOn');
  if (hasField('vendorType')) chargeTemplate.vendorType = getFieldValue('vendorType');

  if(hasField('driverGroup')) {
    const driverGroupName = getFieldValue('driverGroup');
    const driverGroup = driverGroupsData?.find((e) => e._id === driverGroupName);
    if(driverGroup) {
      chargeTemplate.vendor = {
        _id: driverGroup._id,
        name: driverGroup.name,
        profileType: 'driver/group',
        profileGroup: [],
        profile: {
          _id: driverGroup._id,
        }
      };
      chargeTemplate.vendorId = driverGroup._id;
      chargeTemplate.vendorProfileType = 'driver/group';
    } else if (driverGroupName === 'All Driver Group') {
      chargeTemplate.vendor = {
        name: 'All Driver Group',
        profileType: 'driver/group',
        profileGroup: [],
      };
      chargeTemplate.vendorId = null;
      chargeTemplate.vendorProfileType = "driverGroups/all";
    }
  }

  if(hasField('carrierGroup')) {
    const carrierGroupName = getFieldValue('carrierGroup');
    const carrierGroup = carrierGroupsData?.find((e) => e._id === carrierGroupName);
    if(carrierGroup) {
      chargeTemplate.vendor = {
        _id: carrierGroup._id,
        name: carrierGroup.name,
        profileType: 'driver/group',
        profileGroup: [],
        profile: {
          _id: carrierGroup._id,
        }
      };
      chargeTemplate.vendorId = carrierGroup._id;
      chargeTemplate.vendorProfileType = 'carrier/group';
    } else if (carrierGroupName === 'All Carrier Group') {
      chargeTemplate.vendor = {
        name: 'All Carrier Group',
        profileType: 'carrierGroups/all',
        profileGroup: [],
      };
      chargeTemplate.vendorId = null;
      chargeTemplate.vendorProfileType = "carrierGroups/all";
    }
  }

  if (hasField('autoAdd')) {
    const autoAddValue = getFieldValue('autoAdd');
    chargeTemplate.autoAdd = /Yes/i.test(autoAddValue) ? true : (!autoAddValue ? true : false);
  }
  
  // Array fields
  chargeTemplate.rules = mapCSVRules(item, {}, carrierId);
  chargeTemplate.exactEvents = getFieldValue('exactEvents') ?? [];
  chargeTemplate.chargeTemplateGroupID = getFieldValue('chargeTemplateGroupID');
  chargeTemplate.fromLegs = getFieldValue('fromLegs') ?? [];
  chargeTemplate.toLegs = getFieldValue('toLegs') ?? [];
  
  // Additional fields for move rules
  chargeTemplate.fromProfileType = getFieldValue('fromProfileType') ?? null;
  chargeTemplate.from = getFieldValue('from') ?? null;
  chargeTemplate.toProfileType = getFieldValue('toProfileType') ?? null;
  chargeTemplate.to = getFieldValue('to') ?? null;
  chargeTemplate.moveType = getFieldValue('moveType') ?? null;
  
  // ****** BY MOVE RULE (eventLocation can be null/empty) ******
  let eventTimeValue = getEventTimeValue();
  if (
    hasField('ifEvent') && getFieldValue('ifEvent') != null &&
    eventTimeValue != null && String(eventTimeValue).trim() !== ''
  ) {
    let ifEventValue = getFieldValue('ifEvent');
    let eventLocationValue = getFieldValue('eventLocation');

    // Process If Event
    if (ifEventValue) {
      const option = EVENT_OPTIONS.find((e) => e.label.toLowerCase() === ifEventValue.toLowerCase());
      ifEventValue = option?.value;
    }

    // Process Event Time - validate it's "arrived" or "departed"
    if (eventTimeValue && ['arrived', 'departed'].includes(eventTimeValue.toLowerCase())) {
      eventTimeValue = eventTimeValue.toLowerCase();
    } else {
      eventTimeValue = null; // Invalid event time
    }

    // Process Event Location (can be null/empty)
    let processedEventLocation = null;
    if (eventLocationValue) {
      let found = customerData?.find((e) => e._id === eventLocationValue);
      if (found) {
        processedEventLocation = {
          _id: found._id,
          name: found.company_name || found.name || "",
          profileType: found.type || "customer",
          profileGroup: [],
          profile: {
            _id: found._id,
            name: found.company_name || found.name || "",
            city: found.city || found.address?.city || "",
            state: found.state || found.address?.state || "",
            address1: found.address1 || found.address?.address1 || "",
            country: found.country || found.address?.country || "",
            zipCode: found.zip_code || found.address?.zip_code || "",
            address: found.address?.address || ""
          }
        };
      }
    }

    // Create eventLocationRules array with single rule
    if (ifEventValue && eventTimeValue) {
      chargeTemplate.eventLocationRules = [{
        event: ifEventValue,
        eventTime: eventTimeValue,
        eventLocation: processedEventLocation || null
      }];
      chargeTemplate.multiQueryIndex = [ifEventValue];
      chargeTemplate.eventLocationRule = null; // Ensure By Event is not set
    } else {
      chargeTemplate.eventLocationRules = [];
      chargeTemplate.multiQueryIndex = [];
      chargeTemplate.eventLocationRule = null;
    }
  }
  // ****** BY EVENT RULE (eventLocation can be null/empty) ******
  else if (
    hasField('ifEvent') && getFieldValue('ifEvent') != null &&
    (getEventTimeValue() == null || String(getEventTimeValue()).trim() === '')
  ) {
    let ifEventValue = getFieldValue('ifEvent');
    let eventLocationValue = getFieldValue('eventLocation');

    if (ifEventValue) {
      const option = EVENT_OPTIONS.find((e) => e.label.toLowerCase() === ifEventValue.toLowerCase());
      ifEventValue = option?.value;
    }
    let processedEventLocation = null;
    if (eventLocationValue) {
      let found = customerData?.find((e) => e._id === eventLocationValue);
      if (found) {
        processedEventLocation = {
          _id: found._id,
          name: found.company_name || found.name || "",
          profileType: found.type || "customer",
          profileGroup: [],
          profile: {
            _id: found._id,
            name: found.company_name || found.name || "",
            city: found.city || found.address?.city || "",
            state: found.state || found.address?.state || "",
            address1: found.address1 || found.address?.address1 || "",
            country: found.country || found.address?.country || "",
            zipCode: found.zip_code || found.address?.zip_code || "",
            address: found.address?.address || ""
          }
        };
      }
    }
    chargeTemplate.eventLocationRule = {
      _id: getFieldValue('eventLocationId'),
      event: ifEventValue,
      eventLocation: processedEventLocation,
    };
    chargeTemplate.eventLocationRules = [];
    chargeTemplate.multiQueryIndex = [];
  } else {
    chargeTemplate.eventLocationRules = [];
    chargeTemplate.multiQueryIndex = [];
    chargeTemplate.eventLocationRule = null;
  }


  // ****** BETWEEN STATUS RULE ******
  const fromEvent = getFieldValue('fromEvent')
  if (hasField('fromEvent') && fromEvent != null) {
    const option = STATUSES.find((e) => e.label.toLowerCase() === fromEvent.toLowerCase())
    const value = option?.value;
    const splitValue = value?.split('/');
    const fromType = splitValue?.[0];
    const fromEventName = splitValue?.[1];
    
    chargeTemplate.fromEvent = {
      from: fromEventName,
      fromType: fromType
    };
  } else if(hasField('fromEvent') || hasField('from') || hasField('fromType')) {
    chargeTemplate.fromEvent = null;
  } 

  const inEvent = getFieldValue('inEvent')
  if (hasField('inEvent') && inEvent != null) {
    const option = STATUSES.find((e) => e.label.toLowerCase() === inEvent.toLowerCase())
    const value = option?.value;
    const splitValue = value?.split('/');
    const fromType = splitValue?.[0];
    const fromEventName = splitValue?.[1];
    
    chargeTemplate.inEvent = {
      in: fromEventName,
      inType: fromType
    };
  } else if(hasField('inEvent') || hasField('in') || hasField('inType')) {
    chargeTemplate.inEvent = null;
  } 

  const toEvent = getFieldValue('toEvent')
  const toEventOptions = toEvent?.split(',')?.map((e: any) => e?.trim()?.toLowerCase())

  if (hasField('toEvent') && toEvent != null) {
    chargeTemplate.toEvent = [];

    STATUSES.forEach((e) => {
      if(toEventOptions.includes(e.label.toLowerCase())) {
        const value = e?.value;
        const splitValue = value?.split('/');
        const toType = splitValue?.[0];
        const toEventName = splitValue?.[1];

        chargeTemplate.toEvent.push({
          toType: toType,
          to: toEventName,
        });
      }
    })
  } else if(hasField('toEvent')) {
    chargeTemplate.toEvent = [];
  }


  // ****** BY LEG RULE ******
  const fromLegs = getFieldValue('fromLegs')
  const toLegs = getFieldValue('toLegs')
  const fromLegEventLocation = getFieldValue('fromLegEventLocation')
  const toLegEventLocation = getFieldValue('toLegEventLocation')
  
  if (fromEvent || toLegs || fromLegEventLocation || toLegEventLocation) {
    if (fromLegs) {
      const option = EVENT_OPTIONS.find((e) => e.label.toLowerCase() === fromLegs.toLowerCase())
      chargeTemplate.fromLegs = [option?.value];
    }

    if (toLegs) {
      const option = EVENT_OPTIONS.find((e) => e.label.toLowerCase() === toLegs.toLowerCase())
      chargeTemplate.toLegs = [option?.value];
    }

    if (fromLegEventLocation) {
      const eventLocationValue = customerData?.find((e) => e._id === fromLegEventLocation);
      if (eventLocationValue) {
        chargeTemplate.fromProfile = {
          _id: eventLocationValue._id,
          name: eventLocationValue.company_name || eventLocationValue.name || "",
          profileType: eventLocationValue.type || "customer",
          profileGroup: [],
          profile: {
            _id: eventLocationValue._id,
            name: eventLocationValue.company_name || eventLocationValue.name || "",
            city: eventLocationValue.city || eventLocationValue.address?.city || "",
            state: eventLocationValue.state || eventLocationValue.address?.state || "",
            address1: eventLocationValue.address1 || eventLocationValue.address?.address1 || "",
            country: eventLocationValue.country || eventLocationValue.address?.country || "",
            zipCode: eventLocationValue.zip_code || eventLocationValue.address?.zip_code || "",
            address: eventLocationValue.address?.address || ""
          }
        };
      }
    }

    if (toLegEventLocation) {
      const eventLocationValue = customerData?.find((e) => e._id === toLegEventLocation);
      if (eventLocationValue) {
        chargeTemplate.toProfile = {
          _id: eventLocationValue._id,
          name: eventLocationValue.company_name || eventLocationValue.name || "",
          profileType: eventLocationValue.type || "customer",
          profileGroup: [],
          profile: {
            _id: eventLocationValue._id,
            name: eventLocationValue.company_name || eventLocationValue.name || "",
            city: eventLocationValue.city || eventLocationValue.address?.city || "",
            state: eventLocationValue.state || eventLocationValue.address?.state || "",
            address1: eventLocationValue.address1 || eventLocationValue.address?.address1 || "",
            country: eventLocationValue.country || eventLocationValue.address?.country || "",
            zipCode: eventLocationValue.zip_code || eventLocationValue.address?.zip_code || "",
            address: eventLocationValue.address?.address || ""
          }
        };
      }
    }
  }



  // FuelMatrixConfiguration
  if (
    (hasField('fuelMatrixType') && getFieldValue('fuelMatrixType') != null) ||
    (hasField('fuelRegion') && getFieldValue('fuelRegion') != null) ||
    (hasField('fuelUpdateFrequency') && getFieldValue('fuelUpdateFrequency') != null) ||
    (hasField('fuelStartOfWeek') && getFieldValue('fuelStartOfWeek') != null) ||
    (hasField('fuelDecimalPrecision') && getFieldValue('fuelDecimalPrecision') != null) ||
    (hasField('fuelEffectiveDateParameter') && getFieldValue('fuelEffectiveDateParameter') != null)
  ) {
    chargeTemplate.fuelMatrixConfiguration = {
      fuelMatrixType: getFieldValue('fuelMatrixType'),
      region: getFieldValue('fuelRegion'),
      updateFrequency: getFieldValue('fuelUpdateFrequency'),
      startOfWeek: getFieldValue('fuelStartOfWeek'),
      decimalPrecision: getFieldValue('fuelDecimalPrecision'),
      fuelEffectiveDateParameter: getFieldValue('fuelEffectiveDateParameter')
    };
  }

  // Charges array (ChargeValidator) - This is required
  const charges: any[] = [];

  // Create charge object from item fields
  const charge: any = {};

  // freeUnits: optional number
  if (hasField('freeUnits')) {
    const val = getFieldValue('freeUnits');
    if (typeof val === 'number') charge.freeUnits = val;
  }

  // amount: optional number
  if (hasField('amount')) {
    const val = getFieldValue('amount');
    if (typeof val === 'number') charge.amount = val;
  }

  // minimumAmount: optional number
  if (hasField('minimumAmount')) {
    const val = getFieldValue('minimumAmount');
    if (typeof val === 'number') charge.minimumAmount = val;
  }

  // effectiveStartDate: optional date, allow null
  if (hasField('effectiveStartDate')) {
    const val = getFieldValue('effectiveStartDate');
    if (val === null || val instanceof Date || typeof val === 'string') charge.effectiveStartDate = val;
  }

  // effectiveEndDate: optional date, allow null
  if (hasField('effectiveEndDate')) {
    const val = getFieldValue('effectiveEndDate');
    if (val === null || val instanceof Date || typeof val === 'string') charge.effectiveEndDate = val;
  }

  // startValue: optional number
  if (hasField('startValue')) {
    const val = getFieldValue('startValue');
    if (typeof val === 'number') charge.startValue = val;
  }

  // endValue: optional number
  if (hasField('endValue')) {
    const val = getFieldValue('endValue');
    if (typeof val === 'number') charge.endValue = val;
  }

  // unitCount: optional number
  if (hasField('unitCount')) {
    const val = getFieldValue('unitCount');
    if (typeof val === 'number') charge.unitCount = val;
  }

  // fromValue: optional number
  if (hasField('fromValue')) {
    const val = getFieldValue('fromValue');
    if (typeof val === 'number') charge.fromValue = val;
  }

  // toValue: optional number
  if (hasField('toValue')) {
    const val = getFieldValue('toValue');
    if (typeof val === 'number') charge.toValue = val;
  }

  // fuelRateValue: optional number
  if (hasField('fuelRateValue')) {
    const val = getFieldValue('fuelRateValue');
    if (typeof val === 'number') charge.fuelRateValue = val;
  }

  // Only add charge if it has at least some meaningful data
  if (Object.keys(charge).length > 0) {
    charges.push(charge);
  }

  console.log({charges, item})
  // Set charges array (required field)
  chargeTemplate.charges = charges;

  return chargeTemplate;
}


const chargeProfileRulesWithAnyList = {
  zipCode: 'Zip Code Rule (any in)',
  loadType: 'Load Type Rule (any in)',
  customer: 'Customer Rule (any in)',
  cityState: 'City State Rule (any in)'
};

const chargeProfileRulesWithNotIn = {
  zipCode: 'Zip Code Rule (not in)',
  loadType: 'Load Type Rule (not in)',
  customer: 'Customer Rule (not in)',
};

const buildLabelValue = (label: string, value: string) => {
  return {
    label: label,
    value: value,
  };
}

const buildRule = (field: string, values: any[], operator: string) => {
  let parsedValues = JSON.parse(JSON.stringify(values));
  parsedValues = parsedValues.map((singleValue: any) => JSON.stringify(singleValue));

  return {
    field: field,
    value: parsedValues,
    operator: operator,
  };
}

const mapCSVRules = (csvRules: any, customerHashMap: any, carrierId: any) => {
  // get mapped rules
  const rule = {
    type: "GROUP",
    value: "AND",
    isNegated: false,
    children: [] as any[],
  };

  const ANY_IN = "ANY_IN";
  const NOT_IN = "NOT_IN";

  /**
   * Rule format
   * {
   *    field: "type_of_load",
   *    value: [{"label": "IMPORT", "value": "IMPORT"}],
   *    operator: "ANY_IN"
   * }
   */

  // check zip code any in
  if(csvRules[chargeProfileRulesWithAnyList.zipCode]) {
    const zipCodes =  csvRules[chargeProfileRulesWithAnyList.zipCode]?.toString()?.split(',');
    let zipCodeList = zipCodes.map((e: any) => buildLabelValue(e, e));
    const zipCodeRule: any = buildRule('zipCode', zipCodeList, ANY_IN);
    
    rule.children.push(zipCodeRule);
  }

  // check zip code not in
  if(csvRules[chargeProfileRulesWithNotIn.zipCode]) {
    const zipCodes = csvRules[chargeProfileRulesWithNotIn.zipCode]?.toString()?.split(',');
    let zipCodeList = zipCodes.map((e: any) => buildLabelValue(e, e));
    const zipCodeRule: any = buildRule('zipCode', zipCodeList, NOT_IN);
    
    rule.children.push(zipCodeRule);
  }

  // check load type any in
  if(csvRules[chargeProfileRulesWithAnyList.loadType]) {
    const loadTypes = csvRules[chargeProfileRulesWithAnyList.loadType]?.split(',')?.map((e: any) => e?.trim()?.toUpperCase());
    let loadTypeList = loadTypes.map((e: any) => buildLabelValue(e, e));
    const loadTypeRule: any = buildRule('type_of_load', loadTypeList, ANY_IN);

    rule.children.push(loadTypeRule);
  }

  // check load type not in
  if(csvRules[chargeProfileRulesWithNotIn.loadType]) {
    const loadTypes = csvRules[chargeProfileRulesWithNotIn.loadType]?.split(',')?.map((e: any) => e?.trim()?.toUpperCase());
    let loadTypeList = loadTypes.map((e: any) => buildLabelValue(e, e));
    const loadTypeRule = buildRule('type_of_load', loadTypeList, NOT_IN);

    rule.children.push(loadTypeRule);
  }

  //City State (any in)
  if (csvRules[chargeProfileRulesWithAnyList.cityState]) {
    let cityStates = [csvRules[chargeProfileRulesWithAnyList.cityState].split(",").map((e: any) => e.trim()).filter((e: any) => e.length > 0).join(", ")];
    let cityStateList = cityStates.map((e: any) => buildLabelValue(e, e));
    const cityStateRule = buildRule('cityState', cityStateList, ANY_IN);
  
    rule.children.push(cityStateRule);
  }
  
  // check customer type any in
  if(csvRules[chargeProfileRulesWithAnyList.customer]) {
    const customers = csvRules[chargeProfileRulesWithAnyList.customer]?.split(';')?.map((e:any) => e?.trim()?.toUpperCase());
    
    // for each customer in customers, check if it is present in customer hashmap or not, if not get customer information and add to hashmap
    let customerList: any[] = [];
    for(const customer of customers) {
      if(customerHashMap[customer]) {
        customerList.push(buildLabelValue(customerHashMap[customer]?.mappedCustomers?.[0]?.name, customerHashMap[customer]?.mappedCustomers?.[0]?._id));
      } else {
        // const { mappedCustomers, errorMessages } = await buildCustomerListFromCSV(
        //   [customer], 
        //   carrierId, 
        //   null, 
        //   ['ALL', 'caller', 'containerReturn', 'shipper', 'consignee'], 
        //   true, 
        //   false, 
        //   true,
        // );
        const mappedCustomers: any[] = [];
        const errorMessages: any[] = [];

        customerHashMap[customer] = {mappedCustomers, errorMessages};
        console.log({customerRule: mappedCustomers, customerRuleError: errorMessages})
        customerList.push(buildLabelValue(mappedCustomers?.[0]?.name, mappedCustomers?.[0]?._id));
      }
    }

    const customerRule: any = buildRule('caller', customerList, ANY_IN);
    rule.children.push(customerRule);
  }
  
  console.log({rule, csvRules, customerHashMap, carrierId})
  return [rule];
}

export const getTariffPayload = (item: any, data: any[], carrierId?: string, customerData?: any[], driverGroupsData?: any[], carrierGroupsData?: any[], validChargeProfileList?: any[], branchData?: any[]) => {
  const tariffTemplate: any = {};

  // Helper function to check if field exists in item
  const hasField = (key: string) => {
    return (item ?? {})?.hasOwnProperty(key);
  };

  // Helper function to get field value with default
  const getFieldValue = (key: string, defaultValue: any = null) => {
    return hasField(key) ? item[key] : defaultValue;
  };

  // 1. name
  if (hasField('Tariff Name')) tariffTemplate.name = getFieldValue('Tariff Name');

  // 2. description
  tariffTemplate.description = "-";

  // 3. customers
  if (hasField('Customer')) {
    const customerIds = getFieldValue('Customer');
    if (customerIds) {
      const customerList = customerIds.split(',').map((id: string) => id.trim());
      tariffTemplate.customers = customerList.map((id: string) => buildCustomerProfile(id, customerData)).filter(Boolean);
    }
  }

  // 4. loadType
  if (hasField('Load Type')) {
    const loadTypeValue = getFieldValue('Load Type');
    if (loadTypeValue) {
      const loadTypes = loadTypeValue.split(',').map((type: string) => type.trim().toUpperCase());
      tariffTemplate.loadType = loadTypes;
    }
  }

  // 5. pickupLocation
  if (hasField('Pick Up Location')) {
    const pickupIds = getFieldValue('Pick Up Location');
    if (pickupIds) {
      const pickupList = pickupIds.split(',').map((id: string) => id.trim());
      tariffTemplate.pickupLocation = pickupList.map((id: string) => buildCustomerProfile(id, customerData)).filter(Boolean);
    }
  }

  // 6. deliveryLocation
  if (hasField('Delivery Location')) {
    const deliveryIds = getFieldValue('Delivery Location');
    if (deliveryIds) {
      const deliveryList = deliveryIds.split(',').map((id: string) => id.trim());
      tariffTemplate.deliveryLocation = deliveryList.map((id: string) => buildCustomerProfile(id, customerData)).filter(Boolean);
    }
  }

  // 7. returnLocation
  if (hasField('Return Location')) {
    const returnIds = getFieldValue('Return Location');
    if (returnIds) {
      const returnList = returnIds.split(',').map((id: string) => id.trim());
      tariffTemplate.returnLocation = returnList.map((id: string) => buildCustomerProfile(id, customerData)).filter(Boolean);
    } else {
      tariffTemplate.returnLocation = [];
    }
  } else {
    tariffTemplate.returnLocation = [];
  }

  // 8. chargeGroups
  if (hasField('Charge Profile')) {
    const chargeProfileNames = getFieldValue('Charge Profile');
    if (chargeProfileNames && validChargeProfileList) {
      const chargeProfileNameList = chargeProfileNames.split(',').map((name: string) => name.trim());
      const matchedChargeProfiles = chargeProfileNameList
        .map((name: string) => validChargeProfileList.find((profile: any) => profile.name === name))
        .filter(Boolean);

      if (matchedChargeProfiles.length > 0) {
        tariffTemplate.chargeGroups = [{
          billTo: {
            name: "Match Customer",
            profileType: "matchCustomer",
            profileGroup: [],
            profile: {
              name: "Match Customer"
            }
          },
          oneOffCharges: [],
          chargeProfiles: matchedChargeProfiles,
          chargeProfileGroups: []
        }];
      } else {
        tariffTemplate.chargeGroups = [];
      }
    } else {
      tariffTemplate.chargeGroups = [];
    }
  } else {
    tariffTemplate.chargeGroups = [];
  }

  // 9. isActive
  tariffTemplate.isActive = true;

  // 10. effectiveStartDate
  if (hasField('Effective Start Date')) {
    const startDate = getFieldValue('Effective Start Date');
    tariffTemplate.effectiveStartDate = moment(startDate).toISOString();
  }

  // 11. effectiveEndDate
  if (hasField('Effective End Date')) {
    const endDate = getFieldValue('Effective End Date');
    tariffTemplate.effectiveEndDate = moment(endDate).toISOString();
  }

  // 12. terminals
  if (hasField('Branch')) {
    const branchIds = getFieldValue('Branch');
    if (branchIds && branchData) {
      const branchList = branchIds.split(',').map((id: string) => id.trim());
      const matchedBranches = branchList
        .map((id: string) => branchData.find((branch: any) => branch._id === id))
        .filter(Boolean);

      tariffTemplate.terminals = matchedBranches.map((branch: any) => ({
        _id: branch._id,
        name: branch.name,
        profileType: "terminal",
        profile: {
          _id: branch._id,
          name: branch.name
        },
        profileGroup: []
      }));
    } else {
      tariffTemplate.terminals = [];
    }
  } else {
    tariffTemplate.terminals = [];
  }

  // 13. version
  tariffTemplate.version = 1;

  // 14. owner
  if (hasField('owner')) {
    tariffTemplate.owner = getFieldValue('owner');
  }

  // 15. isDeleted
  tariffTemplate.isDeleted = false;

  // 16. isApplyPerLoad
  tariffTemplate.isApplyPerLoad = false;

  // 17. _id
  tariffTemplate._id = generateObjectId();

  // 18. commodity
  tariffTemplate.commodity = null;

  return tariffTemplate;
}