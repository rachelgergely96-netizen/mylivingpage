import Link from "next/link";
import type { ReactNode } from "react";
import AdminNavigation from "@/components/admin/AdminNavigation";
import styles from "./AdminExperience.module.css";

interface AdminShellProps {
  children: ReactNode;
  currentPath?: string;
  previewLabel?: string;
  showSignOut?: boolean;
}

export default function AdminShell({
  children,
  currentPath,
  previewLabel,
  showSignOut = true,
}: AdminShellProps) {
  return (
    <div className={styles.shell} data-admin-shell data-site-ui>
      <a href="#admin-content" className="site-skip-link">
        Skip to admin content
      </a>

      <aside className={styles.rail}>
        <div className={styles.railBrand}>
          <Link href="/" className="site-wordmark">
            my<span>living</span>page
          </Link>
          <span className="site-badge site-badge-danger">Admin</span>
        </div>

        <div className={styles.railIdentity}>
          <p className="site-eyebrow">Owner control room</p>
          <p className="mt-2 text-sm leading-6 text-site-secondary">
            Feedback, people, pages, and system health in one private workspace.
          </p>
          <span className={styles.railStatus} data-admin-status>
            {previewLabel ?? "Secure session"}
          </span>
        </div>

        <AdminNavigation
          currentPath={currentPath}
          mode="rail"
          showSignOut={showSignOut}
        />
      </aside>

      <div className={styles.workspace}>
        <header className={styles.mobileHeader}>
          <div className="flex items-center gap-2">
            <Link href="/" className="site-wordmark">
              my<span>living</span>page
            </Link>
            <span className="site-badge site-badge-danger">Admin</span>
          </div>
          <AdminNavigation
            currentPath={currentPath}
            mode="mobile"
            showSignOut={showSignOut}
          />
        </header>

        <div id="admin-content" tabIndex={-1}>
          {children}
        </div>
      </div>
    </div>
  );
}
