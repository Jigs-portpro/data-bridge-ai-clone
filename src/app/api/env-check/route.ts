
// src/app/api/env-check/route.ts
import { NextResponse } from 'next/server';
import { config } from 'dotenv';

// Explicitly load .env (or .env.local, etc., based on dotenv's default behavior)
config({ path: process.cwd() + '/.env' }); 
config({ path: process.cwd() + '/.env.local', override: true }); 

export async function GET() {
  // Only expose the presence of keys, not their values
  const keyStatus = {
    GOOGLEAI_API_KEY: !!process.env.GOOGLEAI_API_KEY, // Changed key name
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    // Add any other .env keys you want to check the presence of
  };
  // console.log('[env-check API] Current process.env.GOOGLEAI_API_KEY:', process.env.GOOGLEAI_API_KEY ? 'Set' : 'Not Set or Empty');
  // console.log('[env-check API] Current process.env.OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Set' : 'Not Set or Empty');
  // console.log('[env-check API] Current process.env.ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? 'Set' : 'Not Set or Empty');
  return NextResponse.json(keyStatus);
}

