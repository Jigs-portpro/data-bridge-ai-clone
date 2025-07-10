import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import redis from "@/lib/redis";
import { authOptions } from "../auth/[...nextauth]/route";
import { generateRedisKey } from "@/utils/redis-helpers";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    const sessionId = session?.user?.sessionId;

    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const entityName = searchParams.get("entityName");

    if (!entityName) {
      return NextResponse.json(
        { error: "entityName query parameter is required" },
        { status: 400 }
      );
    }

    const redisKey = generateRedisKey(sessionId, entityName);
    const data = await redis.get(redisKey);

    if (!data) {
      return NextResponse.json({ error: "Data not found" }, { status: 404 });
    }

    const parsedData = JSON.parse(data);
    
    // Check if data is recent (within 24 hours)
    const isRecent = Date.now() - (parsedData.timestamp || 0) < 24 * 60 * 60 * 1000;
    
    if (!isRecent && parsedData.timestamp) {
      // Clear old data
      await redis.del(redisKey);
      return NextResponse.json({ error: "Data has expired" }, { status: 404 });
    }

    return NextResponse.json(parsedData);
  } catch (error) {
    console.error("Error fetching data from Redis:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching data." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    const sessionId = session?.user?.sessionId;

    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { 
      entityName, 
      data, 
      columns, 
      datatableEditedCells,
      organizedData,
      errorRows,
      errorCells,
      errorMessages,
      hasValidated,
      validationMessages,
      timestamp
    } = body;

    // Validate required fields
    if (!entityName) {
      return NextResponse.json(
        { error: "entityName is required" },
        { status: 400 }
      );
    }

    if (!data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: "data must be an array" },
        { status: 400 }
      );
    }

    if (!columns || !Array.isArray(columns)) {
      return NextResponse.json(
        { error: "columns must be an array" },
        { status: 400 }
      );
    }

    // Prepare the data context for Redis with all DataTable state
    const updatedDataContext = {
      columns: columns,
      data: data,
      entityName: entityName,
      datatableEditedCells: datatableEditedCells || [],
      organizedData: organizedData || data, // Fallback to original data if not organized
      errorRows: errorRows || [],
      errorCells: errorCells || {},
      errorMessages: errorMessages || {},
      hasValidated: hasValidated || false,
      validationMessages: validationMessages || [],
      timestamp: timestamp || Date.now()
    };

    const redisKey = generateRedisKey(sessionId, entityName);
    await redis.set(redisKey, JSON.stringify(updatedDataContext));

    return NextResponse.json({ 
      success: true, 
      message: "Data and DataTable state saved successfully" 
    });
  } catch (error) {
    console.error("Error saving data to Redis:", error);
    return NextResponse.json(
      { error: "An error occurred while saving data." },
      { status: 500 }
    );
  }
}