import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import * as xlsx from "xlsx";
import { authOptions } from "../auth/[...nextauth]/route";
import { findActualDataStart } from "@/utils/file-parsing";
import { storeSessionData } from "@/utils/mongodb-helpers";
import { clearSessionData } from "@/utils/redis-helpers";

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
    const entityName: string | null = data.get("entityName") as string;
    const carrierId: string | null = data.get("carrierId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!carrierId) {
      return NextResponse.json({ error: "No carrierId provided" }, { status: 400 });
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

    // clear old data
    await clearSessionData(carrierId);
    
    // store the new data in mongodb
    await storeSessionData(sessionId, entityName, jsonData, headers, file.name, !isCsv ? targetSheetName : undefined, carrierId);

    return NextResponse.json({
      entityName: entityName || null,
      fileName: file.name,
      sheetName: !isCsv ? targetSheetName : null,
      totalRows: jsonData.length,
      columns: headers,
    });
  } catch (error) {
    console.error("Error during file upload:", error);
    return NextResponse.json(
      { error: "An error occurred during file processing." },
      { status: 500 }
    );
  }
}