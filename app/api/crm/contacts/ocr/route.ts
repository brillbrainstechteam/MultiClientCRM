import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { extractContacts } from '@/lib/crm/ocr';

// Base64 of ~8MB — enough for a high-res card/register photo or a small PDF.
const MAX_BASE64 = 11_000_000;

/**
 * OCR a business card / register photo / PDF into contact candidates. Returns
 * the extracted rows for the client to review before importing (req 15: human
 * review before saving). Does not write to the DB.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { fileBase64?: string; mimeType?: string } | null;
  const base64 = typeof body?.fileBase64 === 'string' ? body.fileBase64 : '';
  const mimeType = typeof body?.mimeType === 'string' ? body.mimeType : '';
  if (!base64 || !mimeType) return NextResponse.json({ error: 'Missing file.' }, { status: 400 });
  if (base64.length > MAX_BASE64) return NextResponse.json({ error: 'File too large — keep it under ~8MB.' }, { status: 400 });
  if (!/^image\/(jpeg|png|webp|heic|heif)$|^application\/pdf$/.test(mimeType)) {
    return NextResponse.json({ error: 'Upload a JPG, PNG, WEBP or PDF.' }, { status: 400 });
  }

  try {
    const { contacts, provider } = await extractContacts(base64, mimeType);
    return NextResponse.json({ contacts, provider });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Scan failed.' }, { status: 502 });
  }
}
