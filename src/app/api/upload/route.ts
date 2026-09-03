import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
  try {
    const { image, teamId } = await req.json();
    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Save with the exact Team ID (e.g. WEB-001_payment_screenshot)
    const cleanTeamId = (teamId || "WEB-001").trim().toUpperCase();
    const publicId = `${cleanTeamId}_payment_screenshot`;

    const uploadRes = await cloudinary.uploader.upload(image, {
      folder: "webx_payment_proofs",
      public_id: publicId,
      overwrite: true,
      resource_type: "image",
    });

    return NextResponse.json({ url: uploadRes.secure_url });
  } catch (err: any) {
    console.error("Cloudinary upload route error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to upload to Cloudinary" },
      { status: 500 }
    );
  }
}
