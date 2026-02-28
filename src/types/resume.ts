export interface ResumeData {
  name: string;
  headline: string;
  location: string;
  email: string | null;
  linkedin: string | null;
  github: string | null;
  website: string | null;
  avatar_url: string | null;
  summary: string;
  experience: Array<{
    title: string;
    company: string;
    dates: string;
    highlights: string[];
  }>;
  education: Array<{
    degree: string;
    school: string;
    year: string;
  }>;
  projects: Array<{
    name: string;
    description: string;
    tech: string[];
    url: string | null;
  }>;
  skills: Array<{
    category: string;
    items: string[];
  }>;
  certifications: Array<{
    name: string;
    issuer: string | null;
    date: string | null;
  }>;
  stats: Array<{ value: string; label: string }>;
}

export interface PageRecord {
  id: string;
  user_id?: string;
  owner_id?: string;
  slug: string;
  status?: "draft" | "live" | "archived";
  visibility?: "private" | "link" | "public";
  title?: string;
  theme_id: string;
  resume_data: ResumeData;
  raw_resume: string | null;
  portfolio_url: string | null;
  page_config: Record<string, unknown> | null;
  views: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}
