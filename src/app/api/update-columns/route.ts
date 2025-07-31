import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { updateSessionData } from "@/utils/mongodb-helpers";

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    const sessionId = session?.user?.sessionId;

    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const carrierId = searchParams.get("carrier");
    const columns = searchParams.get("columns");

    if (!carrierId) {
      return NextResponse.json({ error: "carrierId query parameter is required" }, { status: 400 });
    }

    if (!columns) {
      return NextResponse.json({ error: "columns query parameter is required" }, { status: 400 });
    }

    // Parse the columns array from the query parameter
    const columnsArray = JSON.parse(decodeURIComponent(columns));

    // Update the session data with the new column names
    // This will also transform the data structure to match the new column names
    const result = await updateSessionData(carrierId, 1, 500, { columns: columnsArray });
    
    if (!result) {
      return NextResponse.json({ error: "Failed to update columns" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      columns: columnsArray,
      message: "Column names updated and data structure transformed successfully"
    });
  } catch (error) {
    console.error("Error updating columns:", error);
    return NextResponse.json(
      { error: "An error occurred while updating columns." },
      { status: 500 }
    );
  }
} 