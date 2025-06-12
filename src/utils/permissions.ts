/**
 * Permission mapping type definition
 */
export type PermissionMapping = Record<string, string>;

/**
 * Permission mapping for People entity
 * Maps UI permission field names to API permission strings
 */
export const PEOPLE_PERMISSION_MAPPING: PermissionMapping = {
  "Loads Permission": "customer_employee_load",
  "Dropped Containers Permission": "dropped_containers", 
  "Account Payable Permission": "account_payable",
  "Info Permission": "customer_employee_load_info",
  "Billing Permission": "billing",
  "Documents Permission": "documents",
  "Upload Documents Permission": "customer_employee_load_upload_documents",
  "Payments Permission": "payments",
  "Tracking Permission": "customer_employee_load_tracking",
  "Service Messaging Permission": "customer_employee_load_messaging",
  "Summary Permission": "summary",
  "Shipment Tracking Permission": "customer_shipments",
  "Customer Permission": "customer"
} as const;

/**
 * Entity-specific permission mappings
 */
export const ENTITY_PERMISSION_MAPPINGS: Record<string, PermissionMapping> = {
  "People": PEOPLE_PERMISSION_MAPPING,
  // Add more entity mappings here as needed
  // "Drivers": DRIVER_PERMISSION_MAPPING,
  // "Customers": CUSTOMER_PERMISSION_MAPPING,
};

/**
 * Generic function to transform permission fields from UI format to API format
 * @param item - The data item containing permission fields
 * @param permissionMapping - The mapping object for permission field names to API strings
 * @returns Array of permission strings for enabled permissions
 */
export const transformPermissions = (
  item: Record<string, any>, 
  permissionMapping: PermissionMapping
): string[] => {
  const permissions: string[] = [];
  
  // Check each permission field and add to permissions array if true
  Object.keys(permissionMapping).forEach((permissionField) => {
    const value = item[permissionField];
    if (value === "TRUE" || value === "true" || value === true) {
      permissions.push(permissionMapping[permissionField]);
    }
  });
  
  return permissions;
};

/**
 * Generic function to remove individual permission fields from the data item
 * @param item - The data item to clean up
 * @param permissionMapping - The mapping object for permission field names
 */
export const removePermissionFields = (
  item: Record<string, any>, 
  permissionMapping: PermissionMapping
): void => {
  Object.keys(permissionMapping).forEach((permissionField) => {
    delete item[permissionField];
  });
};

/**
 * Generic permission transformation for any entity
 * @param item - The data item to transform (modified in place)
 * @param entityName - The name of the entity (e.g., "People", "Drivers")
 * @param customPermissionMapping - Optional custom permission mapping, overrides default entity mapping
 * @returns The same item reference with permissions array and cleaned up fields
 */
export const transformEntityPermissions = (
  item: Record<string, any>,
  entityName: string,
  customPermissionMapping?: PermissionMapping
): Record<string, any> => {
  // Use custom mapping if provided, otherwise use entity-specific mapping
  const permissionMapping = customPermissionMapping || ENTITY_PERMISSION_MAPPINGS[entityName];
  
  if (!permissionMapping) {
    console.warn(`No permission mapping found for entity: ${entityName}`);
    return item;
  }
  
  // Transform permissions to array
  item["permissions"] = transformPermissions(item, permissionMapping);
  
  // Remove individual permission fields
  removePermissionFields(item, permissionMapping);
  
  return item;
};

/**
 * Specific function for People entity (backward compatibility)
 * @param item - The data item to transform
 * @returns The transformed item with permissions array and cleaned up fields
 */
export const transformPeoplePermissions = (item: Record<string, any>): Record<string, any> => {
  return transformEntityPermissions(item, "People");
};
