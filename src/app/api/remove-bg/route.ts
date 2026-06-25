import { NextRequest, NextResponse } from "next/server";
import { removeBackground } from "@imgly/background-removal-node";

export const maxDuration = 60; // Set higher timeout for Next.js in case it's deployed somewhere supporting it

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as Blob;

    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // removeBackground in node takes a buffer or blob and returns a Blob
    const resultBlob = await removeBackground(file);
    
    // We can return the blob directly as an image response
    const buffer = Buffer.from(await resultBlob.arrayBuffer());

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
      },
    });

  } catch (error) {
    console.error("BG Removal Error:", error);
    return NextResponse.json({ error: "Failed to remove background" }, { status: 500 });
  }
}
