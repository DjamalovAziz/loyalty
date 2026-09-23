import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadBusinessLogo } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const businessId = formData.get("businessId") as string | null;

    if (!file || !businessId) {
      return NextResponse.json({ error: "file and businessId are required" }, { status: 400 });
    }

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const logoUrl = await uploadBusinessLogo(businessId, file);

    const updated = await prisma.business.update({
      where: { id: businessId },
      data: { logoUrl },
    });

    return NextResponse.json({ success: true, logoUrl: updated.logoUrl });
  } catch (err) {
    console.error("Logo upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
