import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { deleteRowsFromMongoDB } from "@/utils/mongodb-helpers";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    const sessionId = session?.user?.sessionId;
    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { carrier, entityName, rowsToDelete, deletionType } = await req.json();

    if (!carrier || !entityName || !rowsToDelete || !Array.isArray(rowsToDelete)) {
      return NextResponse.json(
        { error: "Missing required fields: carrier, entityName, rowsToDelete" },
        { status: 400 }
      );
    }

    const result = await deleteRowsFromMongoDB(carrier, entityName, rowsToDelete, deletionType);

    if (result.success) {
      return NextResponse.json({
        message: `Successfully deleted ${rowsToDelete.length} rows for entity: ${entityName}`,
        sessionId,
        carrier,
        entityName,
        deletedRowsCount: rowsToDelete.length,
        result
      });
    } else {
      return NextResponse.json(
        { error: result.message || "Failed to delete rows from database" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error deleting rows:", error);
    return NextResponse.json(
      { error: "An error occurred while deleting rows." },
      { status: 500 }
    );
  }
} 