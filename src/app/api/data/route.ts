import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import redis from "@/lib/redis";
import { authOptions } from "../auth/[...nextauth]/route";
import { generateRedisKey } from "@/utils/helpers";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    const sessionId = session?.user?.sessionId;

    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const entityName = searchParams.get("entityName");

    if (!entityName) {
      return NextResponse.json(
        { error: "entityName query parameter is required" },
        { status: 400 }
      );
    }

    const redisKey = generateRedisKey(sessionId, entityName);
    const data = await redis.get(redisKey);

    if (!data) {
      return NextResponse.json({ error: "Data not found" }, { status: 404 });
    }

    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    console.error("Error fetching data from Redis:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching data." },
      { status: 500 }
    );
  }
}