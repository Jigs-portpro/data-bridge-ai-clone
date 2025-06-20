import type { ExportEntity } from "@/config/exportEntities";
import { transformEntityPermissions } from "./permissions";
import { autoFillLocation } from "./location";
import { unitOfMeasureOptions } from "@/lib/constants";

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
  carrierId?: string
) => {
  const mappedFields:any = mapEntityFields(entityConfig);
  const STRING_ADDRESS_ENTITY = ["Chassis Owner"];

  if(entityConfig.name === "Charge Profile") {
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

  if(['Charge Profile'].includes(entityConfig.name)) {
    console.log(formattedData)
  }

  const mappedData = formattedData.map((mappedItem) => {
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
    } else if (entityConfig.name === "Charge Profile") {
      const payload = getChargeProfilePayload(mappedItem, data = [], carrierId);
      console.log({payload})
      mappedItem = payload
    }

    return mappedItem;
  })

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

export const getChargeProfilePayload = (item: any, carrierId?: string) => {
  const chargeTemplate: any = {};

  // Helper function to check if field exists in item
  const hasField = (key: string) => {
    return (item ?? {})?.hasOwnProperty(key);
  };

  // Helper function to safely get field value
  const getFieldValue = (key: string, defaultValue: any = null) => {
    return hasField(key) ? (item[key] ?? defaultValue) : undefined;
  };

  // Required fields from ChargeTemplateValidator
  if (hasField('name') && item.name) chargeTemplate.name = item.name;
  if (hasField('chargeName') && item.chargeName) chargeTemplate.chargeName = item.chargeName;
  if (hasField('chargeCode') && item.chargeCode) chargeTemplate.chargeCode = item.chargeCode;
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
  if (hasField('fromProfileType')) chargeTemplate.fromProfileType = getFieldValue('fromProfileType');
  if (hasField('toProfileType')) chargeTemplate.toProfileType = getFieldValue('toProfileType');
  if (hasField('version')) chargeTemplate.version = getFieldValue('version');
  if (hasField('isDeleted')) chargeTemplate.isDeleted = getFieldValue('isDeleted');
  if (hasField('createdAt')) chargeTemplate.createdAt = getFieldValue('createdAt');
  if (hasField('updatedAt')) chargeTemplate.updatedAt = getFieldValue('updatedAt');

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
  chargeTemplate.eventLocationRules = getFieldValue('eventLocationRules') ?? [];
  console.log({item, chargeTemplate})

  // FromEventValidator
  if (
    (hasField('fromEvent') && getFieldValue('fromEventId') != null) ||
    (hasField('from') && getFieldValue('from') != null) ||
    (hasField('fromType') && getFieldValue('fromType') != null)
  ) {
    chargeTemplate.fromEvent = {
      _id: getFieldValue('fromEventId'),
      from: getFieldValue('from'),
      fromType: getFieldValue('fromType')
    };
  } else if(hasField('fromEvent') || hasField('from') || hasField('fromType')) {
    chargeTemplate.fromEvent = null;
  }

  // InEventValidator
  if (
    (hasField('inEvent') && getFieldValue('inEventId') != null) ||
    (hasField('in') && getFieldValue('in') != null) ||
    (hasField('inType') && getFieldValue('inType') != null)
  ) {
    chargeTemplate.inEvent = {
      _id: getFieldValue('inEventId'),
      in: getFieldValue('in'),
      inType: getFieldValue('inType')
    };
  } else if(hasField('inEvent') || hasField('in') || hasField('inType')) {
    chargeTemplate.inEvent = null
  }

  // ToEventValidator (array)
  if (
    (hasField('toEvent') && getFieldValue('toEventId') != null) ||
    (hasField('to') && getFieldValue('to') != null) ||
    (hasField('toType') && getFieldValue('toType') != null)
  ) {
    const toEventObj: any = {};
    if (getFieldValue('toEventId') != null) toEventObj._id = getFieldValue('toEventId');
    if (getFieldValue('to') != null) toEventObj.to = getFieldValue('to');
    if (getFieldValue('toType') != null) toEventObj.toType = getFieldValue('toType');
    if (Object.keys(toEventObj).length > 0) {
      chargeTemplate.toEvent = [toEventObj];
    }
  } else if(hasField('toEvent') || hasField('to') || hasField('toType')) {
    chargeTemplate.toEvent = null
  }

  // From ProfileTypeByLegSchema
  if (
    (hasField('fromZipCode') && getFieldValue('fromZipCode') != null) ||
    (hasField('fromCityState') && getFieldValue('fromCityState') != null) ||
    (hasField('fromProfile') && getFieldValue('fromProfile') != null) ||
    (hasField('fromProfileGroup') && getFieldValue('fromProfileGroup') != null) ||
    (hasField('fromCityStateGroup') && getFieldValue('fromCityStateGroup') != null) ||
    (hasField('fromZipCodeGroup') && getFieldValue('fromZipCodeGroup') != null)
  ) {
    chargeTemplate.from = {
      zipCode: getFieldValue('fromZipCode'),
      cityState: getFieldValue('fromCityState'),
      profile: getFieldValue('fromProfile'),
      profileGroup: getFieldValue('fromProfileGroup'),
      cityStateGroup: getFieldValue('fromCityStateGroup'),
      zipCodeGroup: getFieldValue('fromZipCodeGroup')
    };
  }

  // To ProfileTypeByLegSchema
  if (
    (hasField('toZipCode') && getFieldValue('toZipCode') != null) ||
    (hasField('toCityState') && getFieldValue('toCityState') != null) ||
    (hasField('toProfile') && getFieldValue('toProfile') != null) ||
    (hasField('toProfileGroup') && getFieldValue('toProfileGroup') != null) ||
    (hasField('toCityStateGroup') && getFieldValue('toCityStateGroup') != null) ||
    (hasField('toZipCodeGroup') && getFieldValue('toZipCodeGroup') != null)
  ) {
    chargeTemplate.to = {
      zipCode: getFieldValue('toZipCode'),
      cityState: getFieldValue('toCityState'),
      profile: getFieldValue('toProfile'),
      profileGroup: getFieldValue('toProfileGroup'),
      cityStateGroup: getFieldValue('toCityStateGroup'),
      zipCodeGroup: getFieldValue('toZipCodeGroup')
    };
  }

  // From Profile (ParameterProfileValidator)
  if (
    (hasField('fromProfileName') && getFieldValue('fromProfileName') != null) ||
    (hasField('fromProfileType') && getFieldValue('fromProfileType') != null) ||
    (hasField('fromProfileIndex') && getFieldValue('fromProfileIndex') != null)
  ) {
    chargeTemplate.fromProfile = {
      _id: getFieldValue('fromProfileId'),
      name: getFieldValue('fromProfileName'),
      profileType: getFieldValue('fromProfileType'),
      index: getFieldValue('fromProfileIndex'),
      profile: getFieldValue('fromProfileProfile'),
      profileGroup: getFieldValue('fromProfileGroup')
    };
  }

  // To Profile (ParameterProfileValidator)
  if (
    (hasField('toProfileName') && getFieldValue('toProfileName') != null) ||
    (hasField('toProfileType') && getFieldValue('toProfileType') != null) ||
    (hasField('toProfileIndex') && getFieldValue('toProfileIndex') != null)
  ) {
    chargeTemplate.toProfile = {
      _id: getFieldValue('toProfileId'),
      name: getFieldValue('toProfileName'),
      profileType: getFieldValue('toProfileType'),
      index: getFieldValue('toProfileIndex'),
      profile: getFieldValue('toProfileProfile'),
      profileGroup: getFieldValue('toProfileGroup')
    };
  }

  // Vendor (VendorParameterProfileValidator)
  if (
    (hasField('vendorName') && getFieldValue('vendorName') != null) ||
    (hasField('vendorProfileType') && getFieldValue('vendorProfileType') != null) ||
    (hasField('vendorIndex') && getFieldValue('vendorIndex') != null)
  ) {
    chargeTemplate.vendor = {
      _id: getFieldValue('vendorId'),
      name: getFieldValue('vendorName'),
      profileType: getFieldValue('vendorProfileType'),
      index: getFieldValue('vendorIndex'),
      profile: getFieldValue('vendorProfile'),
      profileGroup: getFieldValue('vendorProfileGroup'),
      additionalInfo: getFieldValue('vendorAdditionalInfo')
    };
  }

  // EventLocationRule (EventLocationRuleValidator)
  if (
    (hasField('eventLocationEvent') && getFieldValue('eventLocationEvent') != null) ||
    (hasField('eventLocationEventLocation') && getFieldValue('eventLocationEventLocation') != null) ||
    (hasField('eventLocationEventTime') && getFieldValue('eventLocationEventTime') != null)
  ) {
    chargeTemplate.eventLocationRule = {
      _id: getFieldValue('eventLocationId'),
      event: getFieldValue('eventLocationEvent'),
      eventLocation: getFieldValue('eventLocationEventLocation'),
      eventTime: getFieldValue('eventLocationEventTime')
    };
  } else if(hasField('eventLocationEvent') || hasField('eventLocationEventLocation') || hasField('eventLocationEventTime')) {
    chargeTemplate.eventLocationRule = null
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
    const loadTypes = csvRules[chargeProfileRulesWithAnyList.loadType]?.split(',')?.map((e) => e?.trim()?.toUpperCase());
    let loadTypeList = loadTypes.map((e: any) => buildLabelValue(e, e));
    const loadTypeRule: any = buildRule('type_of_load', loadTypeList, ANY_IN);

    rule.children.push(loadTypeRule);
  }

  // check load type not in
  if(csvRules[chargeProfileRulesWithNotIn.loadType]) {
    const loadTypes = csvRules[chargeProfileRulesWithNotIn.loadType]?.split(',')?.map((e) => e?.trim()?.toUpperCase());
    let loadTypeList = loadTypes.map((e: any) => buildLabelValue(e, e));
    const loadTypeRule = buildRule('type_of_load', loadTypeList, NOT_IN);

    rule.children.push(loadTypeRule);
  }

  //City State (any in)
  if (csvRules[chargeProfileRulesWithAnyList.cityState]) {
    let cityStates = [csvRules[chargeProfileRulesWithAnyList.cityState].split(",").map((e) => e.trim()).filter((e) => e.length > 0).join(", ")];
    let cityStateList = cityStates.map((e: any) => buildLabelValue(e, e));
    const cityStateRule = buildRule('cityState', cityStateList, ANY_IN);
  
    rule.children.push(cityStateRule);
  }
  
  // check customer type any in
  if(csvRules[chargeProfileRulesWithAnyList.customer]) {
    const customers = csvRules[chargeProfileRulesWithAnyList.customer]?.split(';')?.map((e) => e?.trim()?.toUpperCase());
    
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
