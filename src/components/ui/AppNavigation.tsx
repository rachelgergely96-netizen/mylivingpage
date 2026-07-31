"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import SignOutButton from "@/components/ui/SignOutButton";

interface AppNavigationProps {
  variant?: "product";
  showAdmin?: boolean;
}

interface NavigationItem {
  href: string;
  label: string;
  emphasis?: "danger";
  exact?: boolean;
}

const PRODUCT_LINKS: NavigationItem[] = [
  { href: "/dashboard", label: "Your page" },
  { href: "/create", label: "Create" },
  { href: "/dashboard/settings", label: "Settings" },
];

function linkIsCurrent(pathname: string, item: NavigationItem) {
  return pathname === item.href || (!item.exact && pathname.startsWith(`${item.href}/`));
}

export default function AppNavigation({ showAdmin = false }: AppNavigationProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const mobileToggleRef = useRef<HTMLButtonElement | null>(null);
  const mobileMenuRef = useRef<HTMLElement | null>(null);
  const links = [
    ...(showAdmin
      ? [{ href: "/admin", label: "Admin", emphasis: "danger" as const }]
      : []),
    ...PRODUCT_LINKS,
  ];
  const currentHref = links
    .filter((item) => linkIsCurrent(pathname, item))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        window.requestAnimationFrame(() => mobileToggleRef.current?.focus());
      }
    };

    const firstControl = mobileMenuRef.current?.querySelector<HTMLElement>(
      "a[href], button:not([disabled])",
    );
    firstControl?.focus();
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const renderLinks = (mobile: boolean) => (
    <>
      {links.map((item) => {
        const current = currentHref === item.href;
        const className = item.emphasis === "danger"
          ? "site-nav-link site-badge-danger min-h-11"
          : "site-nav-link min-h-11";

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className={`${className} ${mobile ? "w-full justify-start" : "shrink-0"}`}
            onClick={mobile ? () => setOpen(false) : undefined}
          >
            {item.label}
          </Link>
        );
      })}
      <SignOutButton className={mobile ? "w-full justify-start" : ""} />
    </>
  );

  return (
    <>
      <nav className="hidden items-center gap-1 md:flex" aria-label="Product navigation">
        {renderLinks(false)}
      </nav>
      <button
        ref={mobileToggleRef}
        type="button"
        className="site-icon-button md:hidden"
        aria-expanded={open}
        aria-controls="product-mobile-navigation"
        aria-label={open ? "Close navigation" : "Open navigation"}
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true" className="text-xl leading-none">{open ? "×" : "≡"}</span>
      </button>
      {open ? (
        <nav
          ref={mobileMenuRef}
          id="product-mobile-navigation"
          className="absolute left-0 right-0 top-full grid gap-2 border-b border-site-border bg-site-canvas p-4 shadow-[var(--site-shadow-overlay)] md:hidden"
          aria-label="Product mobile navigation"
        >
          {renderLinks(true)}
        </nav>
      ) : null}
    </>
  );
}
