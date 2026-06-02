import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdmin } from "@/lib/db";

function safeFilename(value: string): string {
  return (value || "contact")
    .replace(/[^\w.-]+/g, "-")
    .slice(0, 64);
}

function escapeVCard(value: unknown): string {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).end("Method not allowed");
    return;
  }

  const slugParam = req.query.slug;
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam;

  if (!slug) {
    res.status(400).end("Missing slug");
    return;
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error || !profile) {
      res.status(404).end("Profile not found");
      return;
    }

    const vcf = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${escapeVCard(profile.name)}`,
      profile.company ? `ORG:${escapeVCard(profile.company)}` : "",
      profile.title ? `TITLE:${escapeVCard(profile.title)}` : "",
      profile.phone ? `TEL;TYPE=CELL:${escapeVCard(profile.phone)}` : "",
      profile.email ? `EMAIL;TYPE=INTERNET:${escapeVCard(profile.email)}` : "",
      profile.website ? `URL:${escapeVCard(profile.website)}` : "",
      "END:VCARD",
    ]
      .filter(Boolean)
      .join("\r\n");

    res.setHeader("Content-Type", "text/vcard; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeFilename(slug)}.vcf"`
    );

    res.status(200).send(vcf);
    return;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    res.status(500).end(message);
    return;
  }
}