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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "500");

    if (!entityName) {
      return NextResponse.json(
        { error: "entityName query parameter is required" },
        { status: 400 }
      );
    }

    const redisKey = generateRedisKey(sessionId, entityName);
    const metadataKey = `${redisKey}:metadata`;

    // Check if data exists using metadata (new format)
    const metadata = await redis.get(metadataKey);
    
    if (metadata) {
      // New Redis Lists format
      const parsedMetadata = JSON.parse(metadata);
      
      // Check if data is recent (within 24 hours)
      const isRecent = Date.now() - (parsedMetadata.timestamp || 0) < 24 * 60 * 60 * 1000;
      
      if (!isRecent && parsedMetadata.timestamp) {
        // Clear old data
        await redis.del(redisKey);
        await redis.del(metadataKey);
        return NextResponse.json({ error: "Data has expired" }, { status: 404 });
      }

      // Apply pagination using Redis Lists (LRANGE)
      if (page && limit) {
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit - 1; // LRANGE is inclusive
        
        // Fetch only the requested page using LRANGE
        const pageData = await redis.lrange(redisKey, startIndex, endIndex);
        const rows = pageData.map(item => JSON.parse(item));
        
        return NextResponse.json({
          columns: parsedMetadata.columns,
          data: rows,
          pagination: {
            page,
            limit,
            total: parsedMetadata.totalRows,
            totalPages: Math.ceil(parsedMetadata.totalRows / limit)
          },
          // Include other metadata from the original structure
          entityName: parsedMetadata.entityName,
          datatableEditedCells: parsedMetadata.datatableEditedCells || [],
          errorRows: parsedMetadata.errorRows || [],
          errorCells: parsedMetadata.errorCells || {},
          errorMessages: parsedMetadata.errorMessages || {},
          hasValidated: parsedMetadata.hasValidated || false,
          validationMessages: parsedMetadata.validationMessages || [],
          timestamp: parsedMetadata.timestamp
        });
      }

      // Fallback: return all data (for backward compatibility)
      const allData = await redis.lrange(redisKey, 0, -1);
      const rows = allData.map(item => JSON.parse(item));
      
      return NextResponse.json({
        columns: parsedMetadata.columns,
        data: rows,
        entityName: parsedMetadata.entityName,
        datatableEditedCells: parsedMetadata.datatableEditedCells || [],
        errorRows: parsedMetadata.errorRows || [],
        errorCells: parsedMetadata.errorCells || {},
        errorMessages: parsedMetadata.errorMessages || {},
        hasValidated: parsedMetadata.hasValidated || false,
        validationMessages: parsedMetadata.validationMessages || [],
        timestamp: parsedMetadata.timestamp
      });
    } else {
      // Check for old format data
      const oldData = await redis.get(redisKey);
      if (oldData) {
        console.log("Found old format data, converting to new format...");
        const parsedData = JSON.parse(oldData);
        
        // Convert old format to new format
        if (parsedData.data && Array.isArray(parsedData.data)) {
          // Clear old data
          await redis.del(redisKey);
          
          // Store in new format
          if (parsedData.data.length > 0) {
            const pipeline = redis.pipeline();
            for (const row of parsedData.data) {
              pipeline.rpush(redisKey, JSON.stringify(row));
            }
            await pipeline.exec();
          }
          
          // Store metadata
          const metadata = {
            columns: parsedData.columns || [],
            entityName: parsedData.entityName || entityName,
            totalRows: parsedData.data.length,
            datatableEditedCells: parsedData.datatableEditedCells || [],
            errorRows: parsedData.errorRows || [],
            errorCells: parsedData.errorCells || {},
            errorMessages: parsedData.errorMessages || {},
            hasValidated: parsedData.hasValidated || false,
            validationMessages: parsedData.validationMessages || [],
            timestamp: parsedData.timestamp || Date.now()
          };
          
          await redis.set(metadataKey, JSON.stringify(metadata));
          
          // Return paginated data
          if (page && limit) {
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit - 1;
            const pageData = await redis.lrange(redisKey, startIndex, endIndex);
            const rows = pageData.map(item => JSON.parse(item));
            
            return NextResponse.json({
              columns: metadata.columns,
              data: rows,
              pagination: {
                page,
                limit,
                total: metadata.totalRows,
                totalPages: Math.ceil(metadata.totalRows / limit)
              },
              entityName: metadata.entityName,
              datatableEditedCells: metadata.datatableEditedCells,
              errorRows: metadata.errorRows,
              errorCells: metadata.errorCells,
              errorMessages: metadata.errorMessages,
              hasValidated: metadata.hasValidated,
              validationMessages: metadata.validationMessages,
              timestamp: metadata.timestamp
            });
          }
        }
      }
      
      return NextResponse.json({ error: "Data not found" }, { status: 404 });
    }
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

    const redisKey = generateRedisKey(sessionId, entityName);
    const metadataKey = `${redisKey}:metadata`;

    // Clear existing data
    await redis.del(redisKey);
    await redis.del(metadataKey);

    // Store each row as a separate item in Redis List for efficient pagination
    if (data.length > 0) {
      // Use pipeline for better performance when storing multiple items
      const pipeline = redis.pipeline();
      
      // Push each row as a separate JSON item to the list
      for (const row of data) {
        pipeline.rpush(redisKey, JSON.stringify(row));
      }
      
      // Execute the pipeline
      await pipeline.exec();
    }

    // Store metadata separately for quick access
    const metadata = {
      columns: columns,
      entityName: entityName,
      totalRows: data.length,
      datatableEditedCells: datatableEditedCells || [],
      errorRows: errorRows || [],
      errorCells: errorCells || {},
      errorMessages: errorMessages || {},
      hasValidated: hasValidated || false,
      validationMessages: validationMessages || [],
      timestamp: timestamp || Date.now()
    };

    await redis.set(metadataKey, JSON.stringify(metadata));

    return NextResponse.json({ 
      success: true, 
      message: "Data stored as Redis Lists for efficient pagination",
      totalRows: data.length
    });
  } catch (error) {
    console.error("Error saving data to Redis:", error);
    return NextResponse.json(
      { error: "An error occurred while saving data." },
      { status: 500 }
    );
  }
}