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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "500");

    if (!carrierId) {
      return NextResponse.json({ error: "carrierId query parameter is required" }, { status: 400 });
    }

    const data = await updateSessionData(carrierId, page, limit);

    return NextResponse.json({
      data: data || [],
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