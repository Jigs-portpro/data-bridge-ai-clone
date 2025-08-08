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
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    
    // If page and limit are not provided, fetch all data
    const page = pageParam ? parseInt(pageParam) : undefined;
    const limit = limitParam ? parseInt(limitParam) : undefined;

    if (!carrierId) {
      return NextResponse.json({ error: "carrierId query parameter is required" }, { status: 400 });
    }

    console.log(`API /data: carrier=${carrierId}, page=${page}, limit=${limit}`);
    const data = await getDataWithMetadata(carrierId, page, limit);
    console.log(`API /data: returned ${data?.data?.length} rows, totalRows=${data?.totalRows}`);

    // Use MongoDB response directly, remove all Redis logic
    if (!data) {
      return NextResponse.json({ error: "Data not found" }, { status: 404 });
    }

    // If data is expired, return error (handled in getDataWithMetadata)
    // Otherwise, return the same response structure as before
    return NextResponse.json({
      entityName: data?.entityName,
      columns: data.columns || [],
      data: data.data || [],
      pagination: data.pagination,
      datatableEditedCells: data.datatableEditedCells || [],
      errorRows: data.errorRows || [],
      errorCells: data.errorCells || {},
      errorMessages: data.errorMessages || {},
      hasValidated: data.hasValidated || false,
      validationMessages: data.validationMessages || [],
      timestamp: data.timestamp
    });
  } catch (error) {
    console.error("Error fetching data from Redis:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching data." },
      { status: 500 }
    );
  }
}