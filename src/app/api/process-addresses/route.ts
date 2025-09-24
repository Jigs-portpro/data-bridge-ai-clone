import { NextRequest, NextResponse } from 'next/server';
import { processAddressesBatch, type ProcessAddressesBatchClientInput } from '@/ai/flows/process-address-flow';

export async function POST(request: NextRequest) {
  try {
    const body: ProcessAddressesBatchClientInput[] = await request.json();
    
    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected an array of address processing requests.' },
        { status: 400 }
      );
    }

    // Process the first request in the array (as per the curl example)
    const firstRequest = body[0];
    
    if (!firstRequest.addresses || !Array.isArray(firstRequest.addresses)) {
      return NextResponse.json(
        { error: 'Invalid request format. Expected addresses array.' },
        { status: 400 }
      );
    }

    // Call the address processing function
    const result = await processAddressesBatch(firstRequest);
    
    return NextResponse.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Error processing addresses:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      message: 'Address Processing API', 
      method: 'POST',
      description: 'Send POST request with address data to process addresses using Map Utility Service'
    }
  );
}
