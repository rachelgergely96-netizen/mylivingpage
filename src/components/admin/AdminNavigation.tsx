"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import SignOutButton from "@/components/ui/SignOutButton";
import styles from "./AdminExperience.module.css";

interface AdminNavigationProps {
  currentPath?: string;
  mode: "rail" | "mobile";
  showSignOut?: boolean;
}

interface AdminNavigationItem {
  href: string;
  index: string;
  label: string;
  exact?: boolean;
}

const ADMIN_GROUPS: Array<{
  label: string;
  items: AdminNavigationItem[];
}> = [
  {
    label: "Work queue",
    items: [
      { href: "/admin", index: "01", label: "Overview", exact: true },
      { href: "/admin/feedback", index: "02", label: "Feedback" },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/admin/users", index: "03", label: "Users" },
      { href: "/admin/pages", index: "04", label: "Pages" },
      { href: "/admin/ops", index: "05", label: "System health" },
    ],
  },
];

function itemIsCurrent(pathname: string, item: AdminNavigationItem) {
  return pathname === item.href || (!item.exact && pathname.startsWith(`${item.href}/`));
}

export default function AdminNavigation({
  currentPath,
  mode,
  showSignOut = true,
}: AdminNavigationProps) {
  const actualPathname = usePathname();
  const pathname = currentPath ?? actualPathname;
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mode !== "mobile" || !open) {
      return;
    }

    const firstLink = panelRef.current?.querySelector<HTMLElement>("a[href]");
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        window.requestAnimationFrame(() => toggleRef.current?.focus());
      }
    };
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !panelRef.current?.contains(target) &&
        !toggleRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstLink?.focus();
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
    };
  }, [mode, open]);

  const navigation = (
    <nav className={styles.navigation} aria-label="Admin navigation">
      {ADMIN_GROUPS.map((group) => (
        <div key={group.label} className={styles.navGroup}>
          <p className={styles.navGroupLabel}>{group.label}</p>
          <div className={styles.navLinks}>
            {group.items.map((item) => {
              const current = itemIsCurrent(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={current ? "page" : undefined}
                  className={styles.navLink}
                  data-current={current}
                  onClick={mode === "mobile" ? () => setOpen(false) : undefined}
                >
                  <span className={styles.navIndex}>{item.index}</span>
                  <span>{item.label}</span>
                  <span className={styles.navArrow} aria-hidden="true">
                    {current ? "●" : "→"}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      <div className={styles.navFooter}>
        <Link href="/dashboard" className="site-button site-button-secondary w-full justify-start">
          Back to app
        </Link>
        {showSignOut ? <SignOutButton className="w-full justify-start" /> : null}
      </div>
    </nav>
  );

  if (mode === "rail") {
    return navigation;
  }

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        className="site-icon-button"
        aria-expanded={open}
        aria-controls="admin-mobile-navigation"
        aria-label={open ? "Close admin navigation" : "Open admin navigation"}
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true" className="text-xl leading-none">
          {open ? "×" : "≡"}
        </span>
      </button>
      {open ? (
        <div
          ref={panelRef}
          id="admin-mobile-navigation"
          className={styles.mobilePanel}
        >
          {navigation}
        </div>
      ) : null}
    </>
  );
}
