import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { clearSessionData, clearEntityData } from "@/utils/redis-helpers";

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    const sessionId = session?.user?.sessionId;

    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const entityName = searchParams.get("entityName");

    if (entityName) {
      // Clear data for specific entity
      await clearEntityData(sessionId, entityName);
      return NextResponse.json({ 
        message: `Data cleared for entity: ${entityName}`,
        sessionId,
        entityName 
      });
    } else {
      // Clear all data for session
      await clearSessionData(sessionId);
      return NextResponse.json({ 
        message: "All session data cleared",
        sessionId 
      });
    }
  } catch (error) {
    console.error("Error clearing data:", error);
    return NextResponse.json(
      { error: "An error occurred while clearing data." },
      { status: 500 }
    );
  }
} 