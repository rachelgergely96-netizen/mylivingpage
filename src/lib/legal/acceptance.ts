import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { getClientIp } from "@/lib/security/request";
import {
  PRIVACY_VERSION,
  TERMS_VERSION,
  type LegalAcceptanceSource,
} from "@/lib/legal/legal-version";

export { getClientIp };

export interface LegalAcceptanceRecord {
  user_id: string;
  terms_version: string;
  privacy_version: string;
  source: LegalAcceptanceSource;
  accepted_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

interface RecordLegalAcceptanceInput {
  userId: string;
  source: LegalAcceptanceSource;
  acceptedAt?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  termsVersion?: string;
  privacyVersion?: string;
}

export async function recordLegalAcceptance({
  userId,
  source,
  acceptedAt,
  ipAddress,
  userAgent,
  termsVersion = TERMS_VERSION,
  privacyVersion = PRIVACY_VERSION,
}: RecordLegalAcceptanceInput): Promise<void> {
  const supabase = createServiceRoleSupabaseClient();

  const payload: LegalAcceptanceRecord = {
    user_id: userId,
    terms_version: termsVersion,
    privacy_version: privacyVersion,
    source,
    accepted_at: acceptedAt ?? new Date().toISOString(),
    ip_address: ipAddress ?? null,
    user_agent: userAgent ?? null,
  };

  const { error } = await supabase
    .from("legal_acceptances")
    .upsert(payload, {
      onConflict: "user_id,source,terms_version,privacy_version",
      ignoreDuplicates: false,
    });

  if (error) {
    throw new Error(`Failed to record legal acceptance: ${error.message}`);
  }
}
