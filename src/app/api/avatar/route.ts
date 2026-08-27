import { NextResponse } from "next/server";
import { detectAvatarMimeType } from "@/lib/security/avatar-file";
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/track-event";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const MAX_MULTIPART_BODY_SIZE = MAX_FILE_SIZE + 128 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const AVATAR_PATH_BASENAME = "headshot";
const ENABLE_E2E_FAILURE_INJECTION = process.env.ENABLE_E2E_FAILURE_INJECTION === "1";
const routeTrustLevel = "authenticated_user";

type LimitedBodyResult =
  | { ok: true; body: ArrayBuffer }
  | { ok: false; tooLarge: boolean };

async function readBodyWithLimit(
  request: Request,
  maxBytes: number,
): Promise<LimitedBodyResult> {
  if (!request.body) {
    return { ok: true, body: new ArrayBuffer(0) };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, tooLarge: true };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, tooLarge: false };
  }

  const body = new ArrayBuffer(totalBytes);
  const bytes = new Uint8Array(body);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, body };
}

/** POST /api/avatar — upload a headshot */
export async function POST(request: Request) {
  const authSupabase = await createServerSupabaseClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Your session has expired. Sign in again to continue." },
      { status: 401 },
    );
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_MULTIPART_BODY_SIZE
  ) {
    return NextResponse.json({ error: "File must be under 2 MB." }, { status: 413 });
  }

  const body = await readBodyWithLimit(request, MAX_MULTIPART_BODY_SIZE);
  if (!body.ok) {
    if (body.tooLarge) {
      return NextResponse.json({ error: "File must be under 2 MB." }, { status: 413 });
    }
    return NextResponse.json({ error: "Unable to read the upload." }, { status: 400 });
  }

  const multipartHeaders = new Headers(request.headers);
  multipartHeaders.delete("content-length");
  const formData = await new Request(request.url, {
    method: request.method,
    headers: multipartHeaders,
    body: body.body,
  }).formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Unable to read the upload." }, { status: 400 });
  }
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, and WebP images are allowed." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File must be under 2 MB." }, { status: 413 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "The selected file is empty." }, { status: 400 });
  }

  const supabase = createServiceRoleSupabaseClient();
  const { data: existing, error: listError } = await supabase.storage
    .from("avatars")
    .list(user.id);
  if (listError) {
    await trackEvent(user.id, "avatar.upload.failed", {
      error: listError.message,
      stage: "storage-list",
    });
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detectedType = detectAvatarMimeType(buffer);
  if (!detectedType || detectedType !== file.type) {
    return NextResponse.json(
      { error: "The file contents do not match a supported image type." },
      { status: 400 },
    );
  }
  if (ENABLE_E2E_FAILURE_INJECTION && request.headers.get("x-test-avatar-failure") === "before-upload") {
    await trackEvent(user.id, "avatar.upload.failed", {
      injected: true,
      stage: "before-upload",
    });
    return NextResponse.json({ error: "Injected avatar upload failure." }, { status: 500 });
  }

  const objectName = `${AVATAR_PATH_BASENAME}-${crypto.randomUUID()}`;
  const path = `${user.id}/${objectName}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    await trackEvent(user.id, "avatar.upload.failed", {
      error: uploadError.message,
      stage: "storage-upload",
    });
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);

  // Bust cache by appending timestamp
  const url = `${urlData.publicUrl}?t=${Date.now()}`;

  // Persist avatar URL to profiles
  const { data: updatedProfile, error: profileUpdateError } = await supabase
    .from("profiles")
    .update({ avatar_url: url })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();
  if (profileUpdateError || !updatedProfile) {
    await supabase.storage.from("avatars").remove([path]);
    await trackEvent(user.id, "avatar.upload.failed", {
      error: profileUpdateError?.message ?? "Profile was not found.",
      stage: "profile-update",
    });
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }

  const previousPaths = (existing ?? []).map(
    (entry) => `${user.id}/${entry.name}`,
  );
  if (previousPaths.length) {
    const { error: cleanupError } = await supabase.storage
      .from("avatars")
      .remove(previousPaths);
    if (cleanupError) {
      await trackEvent(user.id, "avatar.cleanup.failed", {
        error: cleanupError.message,
      });
    }
  }

  await trackEvent(user.id, "avatar.upload");

  return NextResponse.json({ url });
}

/** DELETE /api/avatar — remove headshot */
export async function DELETE() {
  const authSupabase = await createServerSupabaseClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Your session has expired. Sign in again to continue." },
      { status: 401 },
    );
  }

  const supabase = createServiceRoleSupabaseClient();

  const { data: existing, error: listError } = await supabase.storage
    .from("avatars")
    .list(user.id);
  if (listError) {
    await trackEvent(user.id, "avatar.remove.failed", {
      error: listError.message,
      stage: "storage-list",
    });
    return NextResponse.json({ error: "Unable to remove avatar." }, { status: 500 });
  }

  // Hide the avatar from the profile before removing the public object.
  const { data: updatedProfile, error: profileUpdateError } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();
  if (profileUpdateError || !updatedProfile) {
    await trackEvent(user.id, "avatar.remove.failed", {
      error: profileUpdateError?.message ?? "Profile was not found.",
      stage: "profile-update",
    });
    return NextResponse.json({ error: "Unable to remove avatar." }, { status: 500 });
  }

  if (existing?.length) {
    const { error: removeError } = await supabase.storage
      .from("avatars")
      .remove(existing.map((file) => `${user.id}/${file.name}`));
    if (removeError) {
      await trackEvent(user.id, "avatar.cleanup.failed", {
        error: removeError.message,
        stage: "storage-cleanup",
      });
    }
  }

  await trackEvent(user.id, "avatar.remove");

  return NextResponse.json({ success: true });
}
