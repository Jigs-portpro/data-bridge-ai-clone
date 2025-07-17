import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { getDataWithMetadata } from "@/utils/mongodb-helpers";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    const sessionId = session?.user?.sessionId;

    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const carrierId = searchParams.get("carrier");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "500");

    if (!carrierId) {
      return NextResponse.json({ error: "carrierId query parameter is required" }, { status: 400 });
    }

    const data = await getDataWithMetadata(carrierId, page, limit);

    // Use MongoDB response directly, remove all Redis logic
    if (!data) {
      return NextResponse.json({ error: "Data not found" }, { status: 404 });
    }

    // If data is expired, return error (handled in getDataWithMetadata)
    // Otherwise, return the same response structure as before
    const _doc = data?._doc;
    return NextResponse.json({
      entityName: _doc?.entityName,
      columns: _doc.columns || [],
      data: _doc.data || [],
      pagination: _doc.pagination,
      datatableEditedCells: _doc.datatableEditedCells || [],
      errorRows: _doc.errorRows || [],
      errorCells: _doc.errorCells || {},
      errorMessages: _doc.errorMessages || {},
      hasValidated: _doc.hasValidated || false,
      validationMessages: _doc.validationMessages || [],
      timestamp: _doc.timestamp
    });
  } catch (error) {
    console.error("Error fetching data from Redis:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching data." },
      { status: 500 }
    );
  }
}