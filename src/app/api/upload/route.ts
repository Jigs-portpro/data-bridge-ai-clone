import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import * as xlsx from "xlsx";
import redis from "@/lib/redis";
import { processEntityDetection } from "@/ai/flows/chat-interface-updates/entity-processor";
import { resolveAIModel } from "@/ai/flows/chat-interface-updates/model-resolver";
import { authOptions } from "../auth/[...nextauth]/route";
import { generateRedisKey, clearSessionData } from "@/utils/redis-helpers";
import { findActualDataStart } from "@/utils/file-parsing";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    const sessionId = session?.user?.sessionId;

    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.formData();
    const file: File | null = data.get("file") as unknown as File;
    const sheetName: string | null = data.get("sheetName") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let workbook: xlsx.WorkBook;
    let targetSheetName: string;
    let isCsv = false;

    if (file.name.toLowerCase().endsWith(".csv")) {
      isCsv = true;
      const fileContent = buffer.toString("utf8");
      workbook = xlsx.read(fileContent, { type: "string", raw: true });
      targetSheetName = workbook.SheetNames[0];
    } else {
      workbook = xlsx.read(buffer, { type: "buffer" });
      targetSheetName = sheetName || workbook.SheetNames[0];
    }

    const worksheet = workbook.Sheets[targetSheetName];

    // Manually parse to preserve headers
    const allSheetRowsMixedTypes: any[][] = xlsx.utils.sheet_to_json(
      worksheet,
      { header: 1, raw: false, blankrows: true }
    );
    const allSheetRowsAsStrings: string[][] = allSheetRowsMixedTypes.map(
      (row) =>
        row.map((cell) =>
          cell === null || cell === undefined ? "" : String(cell).trim()
        )
    );

    const { dataStartIndex, headers } = findActualDataStart(
      allSheetRowsAsStrings
    );
    let jsonData: Record<string, any>[] = [];

    if (headers.length > 0) {
      const dataContentRows = allSheetRowsAsStrings.slice(dataStartIndex + 1);
      jsonData = dataContentRows
        .map((rowArray) => {
          const row: Record<string, any> = {};
          headers.forEach((header, colIndex) => {
            row[header] = rowArray[colIndex] ?? "";
          });
          if (
            Object.values(row).every(
              (val) => val === "" || val === null || val === undefined
            )
          )
            return null;
          return row;
        })
        .filter((row) => row !== null) as Record<string, any>[];
    }

    if (jsonData.length === 0) {
      return NextResponse.json(
        { error: "The selected sheet is empty or contains no data." },
        { status: 400 }
      );
    }

    const parsedDataContext = { columns: headers, data: jsonData };

    // For entity detection with data samples
    const modelToUse = resolveAIModel("googleai", "gemini-2.5-flash");
    const { entityName } = await processEntityDetection(
      headers,
      [],
      modelToUse,
    );

    if (!entityName) {
      return NextResponse.json(
        { error: "Could not determine entity from the data" },
        { status: 400 }
      );
    }

    // Clear any existing data for this session before storing new data
    await clearSessionData(sessionId);
    
    const redisKey = generateRedisKey(sessionId, entityName);
    const metadataKey = `${redisKey}:metadata`;

    // Clear existing data
    await redis.del(redisKey);
    await redis.del(metadataKey);

    // Store each row as a separate item in Redis List for efficient pagination
    if (jsonData.length > 0) {
      // Use pipeline for better performance when storing multiple items
      const pipeline = redis.pipeline();
      
      // Push each row as a separate JSON item to the list
      for (const row of jsonData) {
        pipeline.rpush(redisKey, JSON.stringify(row));
      }
      
      // Execute the pipeline
      await pipeline.exec();
    }

    // Store metadata separately for quick access
    const metadata = {
      columns: headers,
      entityName: entityName,
      totalRows: jsonData.length,
      datatableEditedCells: [],
      errorRows: [],
      errorCells: {},
      errorMessages: {},
      hasValidated: false,
      validationMessages: [],
      timestamp: Date.now()
    };

    await redis.set(metadataKey, JSON.stringify(metadata));

    return NextResponse.json({
      entityName,
      fileName: file.name,
      sheetName: !isCsv ? targetSheetName : null,
      totalRows: jsonData.length,
    });
  } catch (error) {
    console.error("Error during file upload:", error);
    return NextResponse.json(
      { error: "An error occurred during file processing." },
      { status: 500 }
    );
  }
}