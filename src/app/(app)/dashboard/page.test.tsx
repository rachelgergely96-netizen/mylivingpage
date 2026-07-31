import React from "react";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const createServerSupabaseClientMock = vi.fn();
const createServiceRoleSupabaseClientMock = vi.fn();
const fetchProfileWithHostingAccessMock = vi.fn();
const getAccountAccessStateMock = vi.fn();
const syncPageHostingStateMock = vi.fn();
const isPubliclyAvailablePageMock = vi.fn();

// The live-page preview mounts a client ThemeCanvas island; this desk test
// exercises the proof/action/copy logic, not canvas rendering, so stub it.
vi.mock("@/components/dashboard/DashboardPagePreview", () => ({
  default: () => <div data-dashboard-page-preview />,
}));

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
  createServerSupabaseClient: (...args: unknown[]) =>
    createServerSupabaseClientMock(...args),
  createServiceRoleSupabaseClient: (...args: unknown[]) =>
    createServiceRoleSupabaseClientMock(...args),
}));

vi.mock("@/lib/profile-access", () => ({
  fetchProfileWithHostingAccess: (...args: unknown[]) =>
    fetchProfileWithHostingAccessMock(...args),
}));

vi.mock("@/lib/account-access", () => ({
  getAccountAccessState: (...args: unknown[]) =>
    getAccountAccessStateMock(...args),
}));

vi.mock("@/lib/hosting-state", () => ({
  syncPageHostingState: (...args: unknown[]) =>
    syncPageHostingStateMock(...args),
  isPubliclyAvailablePage: (...args: unknown[]) =>
    isPubliclyAvailablePageMock(...args),
}));

vi.mock("@/lib/plans", () => ({
  MAX_PAGES_PER_ACCOUNT: 5,
}));

vi.mock("@/lib/billing", () => ({
  HOSTING_PLAN_PRICE: {
    displayLabel: "$9/mo",
  },
  STARTER_PLAN_PRICE: {
    displayLabel: "$4.99/mo",
  },
  PRO_PLAN_PRICE: {
    displayLabel: "$9.99/mo",
  },
}));

vi.mock("@/components/DeletePageButton", () => ({
  default: ({ pageId }: { pageId: string }) => (
    <button type="button">Delete {pageId}</button>
  ),
}));

vi.mock("@/components/PublishPageButton", () => ({
  default: ({
    label = "Publish",
    pageId,
  }: {
    label?: string;
    pageId: string;
  }) => (
    <button type="button">
      {label} {pageId}
    </button>
  ),
}));

import DashboardPage from "./page";

function makeServiceRoleClient(overrides?: {
  events?: Array<{
    event_name: string;
    created_at: string;
    metadata: Record<string, unknown> | null;
  }>;
}) {
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

  const events = overrides?.events ?? [
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
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-24T12:00:00.000Z"));
  });

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
    createServiceRoleSupabaseClientMock.mockReturnValue(
      makeServiceRoleClient(),
    );
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
      analyticsTier: "full",
      publicPlanLabel: "Free",
      requiresCheckoutToPublish: false,
      isTrialingSubscription: false,
    });
    syncPageHostingStateMock.mockImplementation(
      async (_supabase: unknown, page: unknown) => ({
        page,
      }),
    );
    isPubliclyAvailablePageMock.mockReturnValue(true);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("turns page activity into one clear primary action without losing page tools", async () => {
    const element = await DashboardPage({});
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain(
      "Check if your page is live, then edit, share, or review recent views.",
    );
    expect(markup).toContain('href="/dashboard/analytics/page-1"');
    expect(markup).toContain('href="/dashboard/analytics/page-2"');
    expect(markup).toContain(
      'href="/dashboard/edit/page-1/living-page#ats-readiness"',
    );
    expect(markup).toContain(
      'href="/dashboard/edit/page-2/living-page#ats-readiness"',
    );
    expect((markup.match(/>ATS check<\/a>/g) ?? []).length).toBe(2);
    expect((markup.match(/>View activity<\/a>/g) ?? []).length).toBe(2);
    expect((markup.match(/>Copy link<\/button>/g) ?? []).length).toBe(2);
    expect((markup.match(/data-dashboard-primary-action/g) ?? []).length).toBe(
      2,
    );
    expect((markup.match(/>Live<\/span>/g) ?? []).length).toBe(2);
    expect(markup).toContain(
      "Open activity for device, referrer, and reading time.",
    );
    expect(markup).toContain("Open activity for the full picture.");
    expect(markup).not.toContain("Signal Studio");
    expect(markup).not.toContain("Proof landed");
    expect(markup).not.toContain("Visual world");
  });

  it("renders the themed returning-user reveal only when login requests it", async () => {
    const element = await DashboardPage({
      searchParams: Promise.resolve({ welcome: "1" }),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("data-dashboard-welcome");
    expect(markup).toContain("Welcome back · page reconnected");
    expect(markup).toContain("your page kept living.");
    expect(markup).toContain("Someone viewed it after your last share.");
    expect(markup).toContain("Bastion theme");
  });

  it("surfaces an offline-page reactivation banner when a public link gets opened while hosting is inactive", async () => {
    createServiceRoleSupabaseClientMock.mockReturnValue(
      makeServiceRoleClient({
        events: [
          {
            event_name: "page.offline_view_attempted",
            created_at: "2026-03-24T11:15:00.000Z",
            metadata: {
              page_id: "page-1",
            },
          },
        ],
      }),
    );
    isPubliclyAvailablePageMock.mockReturnValue(false);

    const element = await DashboardPage({});
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain(
      "Someone opened this link while the page was offline",
    );
    expect(markup).toContain('href="/dashboard/settings"');
    expect(markup).toContain("Publish below to put it back online");
    expect(markup).toContain("Publish page page-1");
    expect((markup.match(/>Offline<\/span>/g) ?? []).length).toBe(1);
    expect((markup.match(/>Draft<\/span>/g) ?? []).length).toBe(1);
    expect(markup).toContain("Put your page back online.");
    expect(markup).toContain("Private draft");
  });

  it("describes an unpublished page as a private draft", async () => {
    isPubliclyAvailablePageMock.mockReturnValue(false);

    const element = await DashboardPage({});
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain(">Draft</span>");
    expect(markup).toContain("Private draft");
    expect(markup).toContain("Your page is ready when you are.");
    expect(markup).toContain("Until then, only you can open it.");
    expect(markup).toContain("Publish page page-1");
  });
});
