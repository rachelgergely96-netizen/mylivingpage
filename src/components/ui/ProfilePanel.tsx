import React from "react";

interface ProfilePanelProps {
  title: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  as?: "section" | "article" | "div" | "aside";
}

export function ProfilePanel({
  title,
  meta,
  children,
  className = "",
  contentClassName = "p-4",
  as: Component = "section",
}: ProfilePanelProps) {
  return (
    <Component className={`profile-panel ${className}`.trim()}>
      <div className="profile-panel-heading">
        <span>{title}</span>
        {meta ? <span className="text-[rgba(239,246,255,0.58)]">{meta}</span> : null}
      </div>
      <div className={contentClassName}>{children}</div>
    </Component>
  );
}

interface ProfileWindowProps {
  title: string;
  status?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  as?: "section" | "article" | "div" | "aside";
}

export function ProfileWindow({
  title,
  status,
  children,
  className = "",
  contentClassName = "p-4 sm:p-5",
  as: Component = "section",
}: ProfileWindowProps) {
  return (
    <Component className={`profile-window ${className}`.trim()}>
      <div className="profile-titlebar">
        <span>{title}</span>
        {status ? <span>{status}</span> : null}
      </div>
      <div className={contentClassName}>{children}</div>
    </Component>
  );
}
