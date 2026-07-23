import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin";
import {
  assessBotRisk,
  type BotDisposition,
  type BotRiskSignal,
} from "@/lib/bot-risk";

export interface AdminProfileRow {
  id: string;
  username: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  plan: string;
  created_at: string;
  auth_provider: string | null;
  last_sign_in_at: string | null;
  sign_in_count: number | null;
  signup_referrer: string | null;
}

export interface AdminPageStatsRow {
  owner_id: string | null;
  user_id: string | null;
  views: number | null;
}

export interface AdminUserRow {
  id: string;
  username: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  plan: string;
  created_at: string;
  auth_provider: string | null;
  last_sign_in_at: string | null;
  sign_in_count: number;
  signup_referrer: string | null;
  pageCount: number;
  totalViews: number;
  isAdmin: boolean;
  emailConfirmedAt: string | null;
  botRiskScore: number;
  botSignals: BotRiskSignal[];
  botDisposition: BotDisposition;
  isUnconfirmedPastGrace: boolean;
}

export interface AdminUserRiskSummary {
  suspiciousSignupsLast7Days: number;
  suspiciousTotal: number;
  watchTotal: number;
  unconfirmedTotal: number;
  unconfirmedPastGrace: number;
}

interface BuildAdminUserRowsInput {
  profiles: AdminProfileRow[];
  pages: AdminPageStatsRow[];
  authUsers: User[];
  now?: Date;
}

export async function listAllAuthUsers(
  supabase: SupabaseClient,
  perPage = 200,
): Promise<User[]> {
  const users: User[] = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw error;
    }

    users.push(...data.users);

    if (!data.nextPage || data.users.length === 0) {
      break;
    }

    page = data.nextPage;
  }

  return users;
}

function buildUserStats(pages: AdminPageStatsRow[]) {
  const stats = new Map<string, { pageCount: number; totalViews: number }>();

  for (const page of pages) {
    const userId = page.owner_id ?? page.user_id;
    if (!userId) {
      continue;
    }

    const existing = stats.get(userId) ?? { pageCount: 0, totalViews: 0 };
    existing.pageCount += 1;
    existing.totalViews += page.views ?? 0;
    stats.set(userId, existing);
  }

  return stats;
}

function getEmailConfirmedAt(user: User | undefined) {
  return user?.email_confirmed_at ?? user?.confirmed_at ?? null;
}

export function buildAdminUserRows({
  profiles,
  pages,
  authUsers,
  now = new Date(),
}: BuildAdminUserRowsInput): AdminUserRow[] {
  const authUsersById = new Map(authUsers.map((user) => [user.id, user]));
  const userStats = buildUserStats(pages);

  return profiles.map((profile) => {
    const authUser = authUsersById.get(profile.id);
    const emailConfirmedAt = getEmailConfirmedAt(authUser);
    const userEmail = profile.email ?? authUser?.email ?? null;
    const lastSignInAt = profile.last_sign_in_at ?? authUser?.last_sign_in_at ?? null;
    const signInCount = profile.sign_in_count ?? 0;
    const pageStats = userStats.get(profile.id) ?? { pageCount: 0, totalViews: 0 };
    const botRisk = assessBotRisk(
      {
        email: userEmail,
        fullName: profile.full_name,
        username: profile.username,
        createdAt: authUser?.created_at ?? profile.created_at,
        emailConfirmedAt,
        signInCount,
        lastSignInAt,
      },
      now,
    );

    return {
      id: profile.id,
      username: profile.username,
      full_name: profile.full_name,
      email: userEmail,
      avatar_url: profile.avatar_url,
      plan: profile.plan,
      created_at: profile.created_at,
      auth_provider: profile.auth_provider,
      last_sign_in_at: lastSignInAt,
      sign_in_count: signInCount,
      signup_referrer: profile.signup_referrer,
      pageCount: pageStats.pageCount,
      totalViews: pageStats.totalViews,
      isAdmin: isAdminEmail(userEmail),
      emailConfirmedAt: botRisk.emailConfirmedAt,
      botRiskScore: botRisk.botRiskScore,
      botSignals: botRisk.botSignals,
      botDisposition: botRisk.botDisposition,
      isUnconfirmedPastGrace: botRisk.isUnconfirmedPastGrace,
    };
  });
}

function isWithinLastDays(value: string, days: number, now: Date) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return false;
  }

  return now.getTime() - timestamp <= days * 24 * 60 * 60 * 1000;
}

export function summarizeAdminUserRisk(
  users: AdminUserRow[],
  now: Date = new Date(),
): AdminUserRiskSummary {
  return {
    suspiciousSignupsLast7Days: users.filter(
      (user) =>
        user.botDisposition === "suspicious" &&
        isWithinLastDays(user.created_at, 7, now),
    ).length,
    suspiciousTotal: users.filter((user) => user.botDisposition === "suspicious").length,
    watchTotal: users.filter((user) => user.botDisposition === "watch").length,
    unconfirmedTotal: users.filter((user) => !user.emailConfirmedAt).length,
    unconfirmedPastGrace: users.filter((user) => user.isUnconfirmedPastGrace).length,
  };
}
