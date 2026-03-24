import React from "react";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const createServerSupabaseClientMock = vi.fn();
const createServiceRoleSupabaseClientMock = vi.fn();
const fetchProfileWithHostingAccessMock = vi.fn();
const getAccountAccessStateMock = vi.fn();
const syncPageHostingStateMock = vi.fn();
const isPubliclyAvailablePageMock = vi.fn();

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: (...args: unknown[]) => createServerSupabaseClientMock(...args),
  createServiceRoleSupabaseClient: (...args: unknown[]) =>
    createServiceRoleSupabaseClientMock(...args),
}));

vi.mock("@/lib/profile-access", () => ({
  fetchProfileWithHostingAccess: (...args: unknown[]) => fetchProfileWithHostingAccessMock(...args),
}));

vi.mock("@/lib/account-access", () => ({
  getAccountAccessState: (...args: unknown[]) => getAccountAccessStateMock(...args),
}));

vi.mock("@/lib/hosting-state", () => ({
  syncPageHostingState: (...args: unknown[]) => syncPageHostingStateMock(...args),
  isPubliclyAvailablePage: (...args: unknown[]) => isPubliclyAvailablePageMock(...args),
}));

vi.mock("@/lib/plans", () => ({
  MAX_PAGES_PER_ACCOUNT: 5,
}));

vi.mock("@/lib/billing", () => ({
  HOSTING_PLAN_PRICE: {
    displayLabel: "$9/mo",
  },
}));

vi.mock("@/components/DeletePageButton", () => ({
  default: ({ pageId }: { pageId: string }) => <button type="button">Delete {pageId}</button>,
}));

import DashboardPage from "./page";

const NOW = new Date("2026-03-24T12:00:00.000Z").getTime();

function makeServiceRoleClient() {
  const pages = [
    {
      id: "page-1",
      slug: "rachel",
      theme_id: "bastion",
      views: 12,
      status: "live",
      visibility: "public",
      resume_data: {
        name: "Rachel Gergely",
        headline: "Founder | Attorney | Product Architect",
      },
    },
    {
      id: "page-2",
      slug: "rachel",
      theme_id: "bastion",
      views: 4,
      status: "live",
      visibility: "public",
      resume_data: {
        name: "Rachel Gergely",
        headline: "Founder | Attorney | Product Architect",
      },
    },
  ];

  const pageViews = [
    {
      page_id: "page-1",
      viewed_at: "2026-03-23T14:05:00.000Z",
      user_agent: "Mozilla/5.0 (iPhone)",
      engaged_seconds: 44,
    },
    {
      page_id: "page-2",
      viewed_at: "2026-03-23T10:00:00.000Z",
      user_agent: "Mozilla/5.0",
      engaged_seconds: 91,
    },
  ];

  const events = [
    {
      event_name: "page.share.copy_link",
      created_at: "2026-03-23T14:00:00.000Z",
      metadata: {
        page_id: "page-1",
        scenario: "recruiter_reply",
      },
    },
  ];

  return {
    from(table: string) {
      if (table === "pages") {
        return {
          select() {
            return {
              or() {
                return {
                  order: vi.fn().mockResolvedValue({
                    data: pages,
                  }),
                };
              },
            };
          },
        };
      }

      if (table === "page_views") {
        return {
          select() {
            return {
              in() {
                return {
                  order: vi.fn().mockResolvedValue({
                    data: pageViews,
                  }),
                };
              },
            };
          },
        };
      }

      if (table === "events") {
        return {
          select() {
            return {
              eq() {
                return {
                  in() {
                    return {
                      order: vi.fn().mockResolvedValue({
                        data: events,
                      }),
                    };
                  },
                };
              },
            };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };
}

describe("dashboard page", () => {
  const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(NOW);

  beforeEach(() => {
    vi.clearAllMocks();
    createServerSupabaseClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "user-1",
            },
          },
        }),
      },
    });
    createServiceRoleSupabaseClientMock.mockReturnValue(makeServiceRoleClient());
    fetchProfileWithHostingAccessMock.mockResolvedValue({
      data: {
        full_name: null,
        username: "rachel",
        plan: "legacy",
        billing_cohort: null,
        hosting_trial_started_at: null,
      },
    });
    getAccountAccessStateMock.mockReturnValue({
      isLegacyAccount: true,
      hasPaidSubscription: false,
      requiresSubscription: false,
      isActiveFreeMonth: false,
      trialEndsAt: null,
    });
    syncPageHostingStateMock.mockImplementation(async (_supabase: unknown, page: unknown) => ({
      page,
    }));
    isPubliclyAvailablePageMock.mockReturnValue(true);
  });

  afterAll(() => {
    dateNowSpy.mockRestore();
  });

  it("uses only the row-level analytics action and keeps proof panels focused on status", async () => {
    const element = await DashboardPage();
    const markup = renderToStaticMarkup(element);

    expect(markup).not.toContain("See when people open your page and what happens next.");
    expect(markup).not.toContain("Open Page Analytics");
    expect(markup).toContain('href="/dashboard/analytics/page-1"');
    expect(markup).toContain('href="/dashboard/analytics/page-2"');
    expect((markup.match(/>Page Analytics<\/a>/g) ?? []).length).toBe(2);
    expect(markup).toContain(
      "Use the Page Analytics button on this page card to see device mix, referrers, and reading behavior.",
    );
    expect(markup).toContain(
      "Use the Page Analytics button on this page card to check whether your page is still getting looked at between follow-ups.",
    );
  });
});
