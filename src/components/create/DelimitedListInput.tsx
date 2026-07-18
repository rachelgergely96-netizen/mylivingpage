"use client";

import React, { useEffect, useState } from "react";
import { normalizeDelimitedList } from "@/lib/delimited-list";

interface DelimitedListInputProps {
  id: string;
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
}

export default function DelimitedListInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  className,
}: DelimitedListInputProps) {
  const canonicalValue = value.join(", ");
  const [draft, setDraft] = useState(canonicalValue);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) {
      setDraft(canonicalValue);
    }
  }, [canonicalValue, editing]);

  return (
    <input
      id={id}
      aria-label={label}
      type="text"
      value={draft}
      onFocus={() => setEditing(true)}
      onChange={(event) => {
        const nextDraft = event.target.value;
        setDraft(nextDraft);
        onChange(normalizeDelimitedList(nextDraft));
      }}
      onBlur={() => {
        const normalized = normalizeDelimitedList(draft);
        setEditing(false);
        setDraft(normalized.join(", "));
        onChange(normalized);
      }}
      placeholder={placeholder}
      className={className}
    />
  );
}
