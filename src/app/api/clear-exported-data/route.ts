import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { clearExportedDataFromMongoDB } from "@/utils/mongodb-helpers";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    const sessionId = session?.user?.sessionId;

    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { carrier, entityName, successfulRows } = await req.json();
    
    if (!carrier) {
      return NextResponse.json({ error: "Carrier is required" }, { status: 400 });
    }

    if (!entityName) {
      return NextResponse.json({ error: "Entity name is required" }, { status: 400 });
    }

    if (!successfulRows || !Array.isArray(successfulRows)) {
      return NextResponse.json({ error: "Successful rows array is required" }, { status: 400 });
    }

    // Clear successful rows from MongoDB
    const result = await clearExportedDataFromMongoDB(carrier, entityName, successfulRows);

    return NextResponse.json({
      message: `Successfully cleared ${successfulRows.length} exported rows for entity: ${entityName}`,
      sessionId,
      carrier,
      entityName,
      clearedRowsCount: successfulRows.length,
      result
    });
  } catch (error) {
    console.error("Error clearing exported data:", error);
    return NextResponse.json(
      { error: "An error occurred while clearing exported data." },
      { status: 500 }
    );
  }
} 