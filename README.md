
# Data Bridge - Intelligent Data Processing and Enrichment Platform

Data Bridge is a Next.js application designed to help users upload, process, clean, enrich, and export data with the assistance of AI-powered tools. It provides an intuitive interface for managing data workflows, from initial upload to final export to target APIs or as CSV files.

## Features

*   **File Upload:**
    *   Supports uploading CSV and Excel (.xls, .xlsx) files.
    *   Handles multi-sheet Excel files by prompting the user to select which sheet to process.
*   **Data Preview:** Displays uploaded data in a sortable and filterable table.
*   **AI-Powered Data Tools:**
    *   **Data Correction:** Suggests and applies corrections for casing, formatting, and other data quality issues in selected columns.
    *   **Data Enrichment:** Allows users to provide natural language instructions to enrich data (e.g., adding new columns based on existing data, standardizing values).
    *   **Intelligent Column Reordering:** AI suggests a more logical column order based on titles and content.
    *   **Anomaly Report:** Generates a report highlighting potential data anomalies based on statistical analysis.
    *   **Duplicate Detection:** Identifies and flags potential duplicate rows based on user-selected columns.
    *   **Address Processing:** AI tool to clean, standardize, and geocode addresses, adding Latitude, Longitude, processing status, and AI reasoning.
    *   **Chat Interface:** Allows users to interact with their data using natural language, ask questions, and request data modifications.
*   **AI Provider & Model Selection (AI Settings Page):**
    *   Configure preferred AI provider (Google AI, OpenAI, Anthropic) and specific model for generative features.
    *   Selection is stored locally and used by all AI tools.
    *   Requires corresponding API keys (e.g., `GOOGLEAI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) in `.env` or `.env.local`.
*   **Lookup Data Management (Lookups Page):**
    *   Fetch and cache lookup datasets (e.g., Chassis Owners, Chassis Sizes, Container Types) from external APIs.
    *   View cached lookup data.
    *   Cached data can be used for validation during data export.
*   **Target Entity Configuration (Setup Page):**
    *   Define target API endpoints (base URL and specific entity paths).
    *   Configure fields for each entity, including name, data type, required status, and validation rules (minLength, maxLength, pattern, minValue, maxValue).
    *   Supports **lookup validation**: configure fields to be validated against cached lookup datasets (e.g., ensure a "Chassis Owner" exists in the "Chassis Owners" lookup).
    *   Configuration is stored in `exportEntities.json` and managed via the UI.
*   **API Authentication Token Management (API Auth Page):**
    *   Page to obtain and store a bearer token from a target API (e.g., Axle.Network API).
    *   Displays the full API response for inspection.
    *   Extracts and displays the company name associated with the token, which is then shown in the global header as the API Target Context.
*   **Data Export Page:**
    *   Select a configured target API entity.
    *   **AI Auto-Column Mapping:** Automatically suggest mappings between uploaded data columns and target entity fields, with confidence indicators.
    *   Manually map data columns to target entity fields.
    *   **Data Validation:** Validate mapped data against the target entity's rules (including lookup validation) before exporting. Displays a list of all validation errors.
    *   **Export to API:** Sends the validated and transformed data to the configured API endpoint (currently simulated, logs payload to console).
    *   **Download as CSV:** Allows downloading the validated and transformed data as a CSV file.
*   **User Authentication:** Simple username/password based login for accessing the application.
*   **Responsive UI:** Built with ShadCN UI components and Tailwind CSS for a modern and responsive experience.
*   **User Experience:**
    *   Redirects to the main data view page when AI tools are activated from the sidebar, ensuring data context is visible.

## Getting Started Locally

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

*   [Node.js](https://nodejs.org/) (v18.x or later recommended)
*   [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation & Setup

1.  **Clone the repository:**
    If you have access to the GitHub repository, clone it to your local machine:
    ```bash
    git clone <repository-url>
    cd <repository-directory-name>
    ```
    Replace `<repository-url>` with the actual URL of the GitHub repository and `<repository-directory-name>` with the name of the folder created by `git clone`.

2.  **Install dependencies:**
    Navigate to the project directory and install the necessary Node.js packages.
    Using npm:
    ```bash
    npm install
    ```
    Or using yarn:
    ```bash
    yarn install
    ```

3.  **Set up Environment Variables:**
    *   Create a `.env.local` file in the root of your project by copying the `.env` file (if it exists and contains placeholders) or by creating a new one.
    *   Add your AI API Keys for Genkit to function. At least one is required. The application supports Google AI, OpenAI, and Anthropic.
        ```env
        # Example for Google AI (Gemini)
        GOOGLEAI_API_KEY=your_google_ai_api_key_here

        # Example for OpenAI (GPT models)
        # OPENAI_API_KEY=your_openai_api_key_here

        # Example for Anthropic (Claude models)
        # ANTHROPIC_API_KEY=your_anthropic_api_key_here
        ```
    *   **Important:** After adding or changing keys in your `.env` or `.env.local` file, you **must restart your Next.js development server** for the changes to take effect.

4.  **Ensure `exportEntities.json` exists:**
    The application relies on an `exportEntities.json` file in the project root for storing API entity configurations. If this file is missing, the API route `/api/export-entities` will attempt to create a default one. You can manage this file through the "Setup" page in the application or by manually creating it. An example structure with lookup validation:
    ```json
    {
      "baseUrl": "https://api.example.com/data",
      "entities": [
        {
          "id": "Chassis",
          "name": "Chassis",
          "url": "/new-endpoint",
          "fields": [
            {
              "name": "Chasis Owner",
              "type": "string",
              "required": true,
              "lookupValidation": {
                "lookupId": "chassisOwners",
                "lookupField": "company_name" 
              }
            },
            {
              "name": "Chasis Size",
              "type": "string",
              "required": true
            }
          ]
        }
      ]
    }
    ```

### Running the Development Server

Once the dependencies are installed and environment variables are set up, you can run the Next.js development server:

Using npm:
```bash
npm run dev
```
Or using yarn:
```bash
yarn dev
```

This will typically start the application on `http://localhost:9002`. Open this URL in your web browser to see the application.

### Running Genkit Dev Server (for AI development)

If you are actively developing or debugging AI flows with Genkit, you might want to run the Genkit development server separately. This server allows you to inspect flows, traces, and more via the Genkit Developer UI.

```bash
npm run genkit:dev
```
Or using yarn:
```bash
yarn genkit:dev
```
This will usually start the Genkit Developer UI on `http://localhost:4000`. The Next.js app will still call the AI flows as server actions, but this gives you visibility into Genkit's operations.

## Building for Production

To create a production build:

Using npm:
```bash
npm run build
```
Or using yarn:
```bash
yarn build
```

To run the production build:

Using npm:
```bash
npm run start
```
Or using yarn:
```bash
yarn start
```

## Tech Stack

*   **Framework:** Next.js (with App Router)
*   **AI Integration:** Genkit (with support for Google AI, OpenAI, Anthropic models)
*   **UI Components:** ShadCN UI
*   **Styling:** Tailwind CSS
*   **Language:** TypeScript
*   **Forms:** React Hook Form (implicitly via ShadCN form components)
*   **File Parsing:** `xlsx` for Excel, custom CSV parser.

This should cover the basics of getting the Data Bridge application running locally and give an overview of its capabilities!
