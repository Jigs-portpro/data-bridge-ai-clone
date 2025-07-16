import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { clearSessionData } from "@/utils/mongodb-helpers";

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    const sessionId = session?.user?.sessionId;

    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const carrier = searchParams.get("carrier");
    
    if(!carrier) {
      return NextResponse.json({ error: "Carrier is required" }, { status: 400 });
    }

    // Clear data for specific entity
    await clearSessionData(carrier);

    return NextResponse.json({
      message: `Data cleared for entity: ${carrier}`,
      sessionId,
      carrier
    });
  } catch (error) {
    console.error("Error clearing data:", error);
    return NextResponse.json(
      { error: "An error occurred while clearing data." },
      { status: 500 }
    );
  }
} 