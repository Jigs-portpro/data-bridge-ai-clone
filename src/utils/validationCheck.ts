interface EmailCheckResult {
  existingEmails: string[];
  error?: string;
}

interface CompanyNameCheckResult {
  existingCompanyNames: string[];
  error?: string;
}

export const checkEmailExists = async (
  emails: string[],
  apiToken?: string,
  baseUrl?: string
): Promise<EmailCheckResult> => {
  if (!emails || emails.length === 0) {
    return { existingEmails: [] };
  }

  if (!apiToken) {
    return { existingEmails: [], error: "API token is missing" };
  }

  try {
    const finalBaseUrl = baseUrl || 'https://api.axle.network';
    const fullApiUrl = `${finalBaseUrl}/app/getUsedEmail`;

    const response = await fetch(fullApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        emails: emails
      }),
    });

    const responseData = await response.json();
    
    if (!response.ok) {
      return { existingEmails: [], error: responseData.message || responseData.error || "API error" };
    }

    // Extract emails from the nested data array
    const emailArray = responseData.data || responseData;
    const existingEmails = Array.isArray(emailArray) 
      ? emailArray.map((item: any) => item.email).filter(Boolean)
      : [];

    return { existingEmails };

  } catch (error) {
    return { 
      existingEmails: [], 
      error: error instanceof Error ? error.message : "Unknown error occurred" 
    };
  }
};

export const checkCompanyNamesExists = async (
  companyNames: string[],
  apiToken?: string,
  baseUrl?: string
): Promise<CompanyNameCheckResult> => {
  if (!companyNames || companyNames.length === 0) {
    return { existingCompanyNames: [] };
  }

  if (!apiToken) {
    return { existingCompanyNames: [], error: "API token is missing" };
  }

  try {
    const finalBaseUrl = baseUrl || 'https://api.axle.network';
    const fullApiUrl = `${finalBaseUrl}/bulkupload/validateCompanyNames`;

    const response = await fetch(fullApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        customers: companyNames
      }),
    });

    const responseData = await response.json();

    
    if (!response.ok) {
      return { existingCompanyNames: [], error: responseData.message || responseData.error || "API error" };
    }

    // Extract company names from the nested data array
    const companyArray = responseData.data?.customers || responseData.data || responseData;
    const existingCompanyNames = Array.isArray(companyArray) 
      ? companyArray.map((item: any) => item.company_name || item.companyName || item.name).filter(Boolean)
      : [];

    return { existingCompanyNames };

  } catch (error) {
    return { 
      existingCompanyNames: [], 
      error: error instanceof Error ? error.message : "Unknown error occurred" 
    };
  }
}; 