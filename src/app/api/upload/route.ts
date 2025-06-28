import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import * as xlsx from "xlsx";
import redis from "@/lib/redis";
import { processEntityDetection } from "@/ai/flows/chat-interface-updates/entity-processor";
import { resolveAIModel } from "@/ai/flows/chat-interface-updates/model-resolver";
import { authOptions } from "../auth/[...nextauth]/route";
import { generateRedisKey } from "@/utils/helpers";

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

    const workbook = xlsx.read(buffer, { type: "buffer" });
    const targetSheetName = sheetName || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[targetSheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
        return NextResponse.json({ error: "The selected sheet is empty." }, { status: 400 });
    }

    const parsedDataContext = { data: jsonData };
    const columns = Object.keys(jsonData[0] || {});

    // For entity detection
    const modelToUse = resolveAIModel("googleai", "gemini-1.5-flash"); 
    const { entityName } = await processEntityDetection(
      parsedDataContext,
      columns,
      [],
      modelToUse
    );
    
    if (!entityName) {
        return NextResponse.json({ error: "Could not determine entity from the data" }, { status: 400 });
    }
    
    const redisKey = generateRedisKey(sessionId, entityName);
    await redis.set(redisKey, JSON.stringify(parsedDataContext));

    return NextResponse.json({ entityName, fileName: file.name, sheetName: targetSheetName });
  } catch (error) {
    console.error("Error during file upload:", error);
    return NextResponse.json(
      { error: "An error occurred during file processing." },
      { status: 500 }
    );
  }
} 