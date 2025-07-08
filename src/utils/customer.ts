/**
 * Utility function to build customer profile from customerData
 * @param customerId - The customer ID to find
 * @param customerData - Array of customer data to search in
 * @returns Customer profile object or null if not found
 */
export const buildCustomerProfile = (customerId: string, customerData?: any[]) => {
  const customer = customerData?.find((e) => e._id === customerId);
  if (customer) {
    return {
      _id: customer._id,
      name: customer.company_name || customer.name || "",
      profileType: customer.type || "customer",
      profile: {
        _id: customer._id,
        name: customer.company_name || customer.name || "",
        city: customer.city || customer.address?.city || "",
        state: customer.state || customer.address?.state || "",
        address1: customer.address1 || customer.address?.address1 || "",
        country: customer.country || customer.address?.country || "",
        zipCode: customer.zip_code || customer.address?.zip_code || "",
        address: customer.address?.address || ""
      },
      profileGroup: []
    };
  }
  return null;
}; 