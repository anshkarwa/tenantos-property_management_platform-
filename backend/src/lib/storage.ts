/**
 * Supabase Storage helper — uses REST API directly, no SDK needed.
 *
 * Setup:
 *   1. Go to Supabase Dashboard → Storage → Create two buckets:
 *      - "property-photos"  (public)
 *      - "tenant-docs"      (private)
 *   2. Copy your Service Role Key from Project Settings → API
 *   3. Add to backend/.env: SUPABASE_SERVICE_ROLE_KEY="eyJ..."
 */

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function isConfigured() {
  return (
    SUPABASE_URL &&
    SERVICE_ROLE_KEY &&
    SERVICE_ROLE_KEY !== 'your-service-role-key'
  );
}

/**
 * Upload a file buffer to Supabase Storage.
 * Returns the public URL (for public buckets) or storage path (for private).
 */
export async function uploadFile(opts: {
  bucket: string;       // e.g. "property-photos" | "tenant-docs"
  path: string;         // e.g. "landlord-abc/unit-xyz/photo-1.jpg"
  buffer: Buffer;
  mimeType: string;
}): Promise<string> {
  if (!isConfigured()) {
    throw new Error('Supabase Storage not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  }

  const { bucket, path, buffer, mimeType } = opts;
  const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': mimeType,
      'x-upsert': 'true', // overwrite if same path
    },
    body: buffer,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase Storage upload failed: ${err}`);
  }

  // Return public URL for public buckets
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

/**
 * Delete a file from Supabase Storage.
 */
export async function deleteFile(bucket: string, path: string): Promise<void> {
  if (!isConfigured()) return;

  const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;
  await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
  });
}

/**
 * Get a signed URL for a private file (tenant docs).
 * Expires in 1 hour by default.
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 3600
): Promise<string> {
  if (!isConfigured()) throw new Error('Supabase Storage not configured');

  const url = `${SUPABASE_URL}/storage/v1/object/sign/${bucket}/${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expiresIn: expiresInSeconds }),
  });

  if (!res.ok) throw new Error('Failed to generate signed URL');
  const json = (await res.json()) as any;
  return `${SUPABASE_URL}/storage/v1${json.signedURL}`;
}
