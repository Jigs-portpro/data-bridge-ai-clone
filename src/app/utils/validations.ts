export const transformPayload = (data: any[]) => {
    return data.map(item => {
      // Create the address object with required fields
      const addressObj = {
        address: item["Address"],
        lat: 0, // You'll need to get these coordinates
        lng: 0  // You'll need to get these coordinates
      };
  
      return {
        company_name: item["Company Name"],
        address: addressObj,
        city: "", // Required but missing in payload
        state: "", // Optional
        country: "US", // Required but missing in payload
        countryCode: "US", // Optional
        zip_code: "", // Optional
        main_contact_name: item["Main Contact Name"],
        secondary_contact_name: item["Secondary Contact Name"],
        mobile: item["Mobile"],
        email: item["Email"].toLowerCase(), // Ensure lowercase as per schema
        DOTNumber: item["DOT #"],
        MCNumber: item["MC #"],
        taxId: item["Tax ID/EIN #"],
        ssn: item["SSN"],
        externalSystemID: "" // Optional
      };
    });
  };