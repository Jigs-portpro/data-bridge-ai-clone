
# Data Bridge - Intelligent Data Processing and Enrichment Platform

Data Bridge is a Next.js application designed to help users upload, process, clean, enrich, and export data with the assistance of AI-powered tools. It provides an intuitive interface for managing data workflows, from initial upload to final export to target APIs or as CSV files.

## Features

*   **File Upload:** Supports uploading CSV and Excel (.xls, .xlsx) files.
*   **Data Preview:** Displays uploaded data in a sortable and filterable table.
*   **AI-Powered Data Tools:**
    *   **Data Correction:** Suggests and applies corrections for casing, formatting, and other data quality issues in selected columns.
    *   **Data Enrichment:** Allows users to provide natural language instructions to enrich data (e.g., adding new columns based on existing data, standardizing values).
    *   **Intelligent Column Reordering:** AI suggests a more logical column order based on titles and content.
    *   **Anomaly Report:** Generates a report highlighting potential data anomalies based on statistical analysis.
    *   **Duplicate Detection:** Identifies and flags potential duplicate rows based on user-selected columns.
    *   **Chat Interface:** Allows users to interact with their data using natural language, ask questions, and request data modifications.
*   **Target Entity Configuration (Setup Page):**
    *   Define target API endpoints (base URL and specific entity paths).
    *   Configure fields for each entity, including name, data type, required status, and validation rules (minLength, maxLength, pattern, minValue, maxValue).
    *   Configuration is stored in `exportEntities.json` and managed via the UI.
*   **API Authentication Token Management:**
    *   Page to obtain and store a bearer token from a target API (e.g., Axle.Network API).
    *   Displays the full API response for inspection.
    *   Extracts and displays the company name associated with the token, which is then shown in the global header.
*   **Data Export Page:**
    *   Select a configured target API entity.
    *   **AI Auto-Column Mapping:** Automatically suggest mappings between uploaded data columns and target entity fields, with confidence indicators.
    *   Manually map data columns to target entity fields.
    *   **Data Validation:** Validate mapped data against the target entity's rules before exporting. Displays a list of all validation errors.
    *   **Export to API:** Sends the validated and transformed data to the configured API endpoint (currently simulated, logs payload to console).
    *   **Download as CSV:** Allows downloading the validated and transformed data as a CSV file.
*   **User Authentication:** Simple username/password based login for accessing the application.
*   **Responsive UI:** Built with ShadCN UI components and Tailwind CSS for a modern and responsive experience.
*   **Genkit Integration:** Leverages Genkit for AI functionalities, interacting with Google's Generative AI models.

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
    *   You will need to add your Google AI API Key for Genkit to function:
        ```env
        GOOGLE_API_KEY=your_google_api_key_here
        ```
    *   Review other environment variables that might be needed as the project evolves.

4.  **Ensure `exportEntities.json` exists:**
    The application relies on an `exportEntities.json` file in the project root for storing API entity configurations. If this file is missing, the API route `/api/export-entities` will attempt to create a default one. You can manage this file through the "Setup" page in the application or by manually creating it with the following basic structure:
    ```json
    {
      "baseUrl": "https://api.example.com/data",
      "entities": []
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
*   **AI Integration:** Genkit (with Google AI)
*   **UI Components:** ShadCN UI
*   **Styling:** Tailwind CSS
*   **Language:** TypeScript
*   **Forms:** React Hook Form
*   **File Parsing:** `xlsx` for Excel, custom CSV parser.

This should cover the basics of getting the Data Bridge application running locally and give an overview of its capabilities!
