import type { ResumeData } from "@/types/resume";
import type { ThemeId } from "@/themes/types";

export interface DemoPage {
  themeId: ThemeId;
  data: ResumeData;
}

export const DEMO_PAGES: DemoPage[] = [
  {
    themeId: "ember",
    data: {
      name: "Avery Sample",
      headline: "Senior Full-Stack Engineer",
      location: "San Francisco, CA",
      email: "avery@sample.invalid",
      linkedin: null,
      github: null,
      website: null,
      avatar_url: null,
      summary:
        "Full-stack engineer with 8 years of experience building scalable web applications. Passionate about developer experience, performance optimization, and shipping products that users love.",
      experience: [
        {
          title: "Senior Software Engineer",
          company: "Example Systems",
          dates: "2022 - Present",
          highlights: [
            "Led migration from monolith to microservices serving 2M+ requests/day",
            "Built real-time collaboration workflows using WebSockets and CRDTs",
            "Mentored 4 junior engineers through structured growth plans",
          ],
          url: null,
        },
        {
          title: "Software Engineer",
          company: "Sample Analytics",
          dates: "2019 - 2022",
          highlights: [
            "Designed and shipped analytics dashboards used across enterprise teams",
            "Reduced API response times by 60% through query optimization",
          ],
          url: null,
        },
        {
          title: "Junior Developer",
          company: "DemoWorks Studio",
          dates: "2017 - 2019",
          highlights: [
            "Built responsive client sites using React and Node.js",
            "Introduced automated testing, bringing coverage from 15% to 80%",
          ],
          url: null,
        },
      ],
      education: [
        {
          degree: "B.S. Computer Science",
          school: "Example Institute of Technology",
          year: "2017",
        },
      ],
      projects: [
        {
          name: "TraceBoard",
          description:
            "Internal tracing toolkit for Node.js services with a low-friction setup for engineering teams.",
          tech: ["TypeScript", "gRPC", "OpenTelemetry"],
          url: null,
        },
        {
          name: "Pipeline Pulse",
          description:
            "Developer productivity tracker that surfaces bottlenecks in CI/CD pipelines.",
          tech: ["Next.js", "PostgreSQL", "GitHub API"],
          url: null,
        },
      ],
      skills: [
        {
          category: "Languages",
          items: ["TypeScript", "Python", "Go", "SQL"],
        },
        {
          category: "Frameworks",
          items: ["React", "Next.js", "Node.js", "FastAPI"],
        },
        {
          category: "Infrastructure",
          items: ["AWS", "Docker", "Kubernetes", "Terraform"],
        },
      ],
      certifications: [
        {
          name: "Cloud Architecture Certification",
          issuer: "Sample Cloud Board",
          date: "2023",
        },
      ],
      stats: [
        { value: "8+", label: "Years Exp." },
        { value: "2M+", label: "Req. / Day" },
        { value: "12", label: "Builds Shipped" },
        { value: "500+", label: "Team Users" },
      ],
    },
  },
  {
    themeId: "aurora",
    data: {
      name: "Morgan Sample",
      headline: "UX Design Lead",
      location: "New York, NY",
      email: "morgan@sample.invalid",
      linkedin: null,
      github: null,
      website: null,
      avatar_url: null,
      summary:
        "Design lead with a decade of experience shaping digital products used by large teams. I bridge user research, interaction design, and brand strategy to create experiences that feel effortless.",
      experience: [
        {
          title: "UX Design Lead",
          company: "Example Care Studio",
          dates: "2021 - Present",
          highlights: [
            "Redesigned a customer portal, increasing task completion by 40%",
            "Built and scaled a design system across 3 product teams",
            "Led research sprints with 200+ customer interviews",
          ],
          url: null,
        },
        {
          title: "Senior Product Designer",
          company: "Sample Product Co.",
          dates: "2018 - 2021",
          highlights: [
            "Designed onboarding flows that reduced churn by 25%",
            "Created a component library adopted across 4 product squads",
          ],
          url: null,
        },
        {
          title: "UX Designer",
          company: "DemoForge Agency",
          dates: "2015 - 2018",
          highlights: [
            "Delivered 30+ client projects across fintech, healthcare, and ecommerce",
            "Introduced usability testing practice for every engagement",
          ],
          url: null,
        },
      ],
      education: [
        {
          degree: "M.F.A. Interaction Design",
          school: "Sample School of Interaction",
          year: "2015",
        },
        {
          degree: "B.A. Psychology",
          school: "Example City University",
          year: "2013",
        },
      ],
      projects: [
        {
          name: "Accessibility Playbook",
          description:
            "Open resource for design teams adopting WCAG 2.1 AA standards with practical checklists and Figma templates.",
          tech: ["Figma", "WCAG", "Research"],
          url: null,
        },
      ],
      skills: [
        {
          category: "Design",
          items: [
            "Figma",
            "Prototyping",
            "Design Systems",
            "Interaction Design",
          ],
        },
        {
          category: "Research",
          items: [
            "User Interviews",
            "Usability Testing",
            "A/B Testing",
            "Journey Mapping",
          ],
        },
        {
          category: "Strategy",
          items: [
            "Product Strategy",
            "Stakeholder Alignment",
            "Workshop Facilitation",
          ],
        },
      ],
      certifications: [
        {
          name: "Experience Design Certificate",
          issuer: "Sample Design Guild",
          date: "2022",
        },
        {
          name: "Usability Analysis Certificate",
          issuer: "Example Usability Board",
          date: "2020",
        },
      ],
      stats: [
        { value: "10+", label: "Years Design" },
        { value: "40%", label: "Task Lift" },
        { value: "30+", label: "Projects" },
        { value: "200+", label: "Interviews" },
      ],
    },
  },
  {
    themeId: "matrix",
    data: {
      name: "Taylor Sample",
      headline: "Finance Director & Strategic Advisor",
      location: "London, UK",
      email: "taylor@sample.invalid",
      linkedin: null,
      github: null,
      website: null,
      avatar_url: null,
      summary:
        "Finance director with 12 years of experience in corporate strategy, M&A, and financial planning across growth-stage businesses. Track record of driving operational efficiency and leading complex transactions.",
      experience: [
        {
          title: "Finance Director",
          company: "Example Capital Group",
          dates: "2020 - Present",
          highlights: [
            "Oversee an $850M planning portfolio across 14 investments",
            "Led due diligence on 6 acquisitions totaling $320M",
            "Implemented forecasting models reducing variance by 35%",
          ],
          url: null,
        },
        {
          title: "Senior Financial Analyst",
          company: "Sample Investment Advisory",
          dates: "2016 - 2020",
          highlights: [
            "Advised on 8 technology transactions across mid-market clients",
            "Built financial models for deals ranging from $50M to $500M",
          ],
          url: null,
        },
        {
          title: "Financial Analyst",
          company: "Demo Audit Partners",
          dates: "2013 - 2016",
          highlights: [
            "Delivered financial audits for public-company clients",
            "Streamlined reporting workflows saving 200+ hours annually",
          ],
          url: null,
        },
      ],
      education: [
        {
          degree: "MBA, Finance",
          school: "Placeholder Business Academy",
          year: "2016",
        },
        {
          degree: "B.Sc. Economics",
          school: "Example State University",
          year: "2012",
        },
      ],
      projects: [],
      skills: [
        {
          category: "Finance",
          items: [
            "Financial Modeling",
            "M&A",
            "Due Diligence",
            "Valuation",
            "FP&A",
          ],
        },
        {
          category: "Strategy",
          items: [
            "Corporate Strategy",
            "Portfolio Management",
            "Investor Relations",
          ],
        },
        {
          category: "Tools",
          items: ["Excel/VBA", "Tableau", "SAP", "Planning Models"],
        },
      ],
      certifications: [
        {
          name: "Strategic Finance Credential",
          issuer: "Sample Finance Council",
          date: "2018",
        },
        {
          name: "Advanced Reporting Credential",
          issuer: "Example Accounting Board",
          date: "2015",
        },
      ],
      stats: [
        { value: "$850M", label: "Portfolio" },
        { value: "12+", label: "Years Finance" },
        { value: "6", label: "Deals Led" },
        { value: "35%", label: "Variance Cut" },
      ],
    },
  },
  {
    themeId: "luxe",
    data: {
      name: "Jordan Sample",
      headline: "Litigation Associate",
      location: "Chicago, IL",
      email: "jordan@sample.invalid",
      linkedin: null,
      github: null,
      website: null,
      avatar_url: null,
      summary:
        "Early-career attorney focused on commercial litigation, legal research, and clear client communication. Looking for a role where sharp writing, polished presence, and strong case preparation matter immediately.",
      experience: [
        {
          title: "Associate Attorney",
          company: "Example Counsel Group",
          dates: "2024 - Present",
          highlights: [
            "Drafted motions, discovery responses, and research memos for business disputes",
            "Prepared partners for hearings and client strategy calls under tight deadlines",
            "Managed document review and case timelines across multiple active matters",
          ],
          url: null,
        },
        {
          title: "Judicial Law Clerk",
          company: "Sample County Court",
          dates: "2023 - 2024",
          highlights: [
            "Researched precedent and prepared bench memoranda for civil matters",
            "Reviewed filings and proposed orders for docket management and hearings",
          ],
          url: null,
        },
        {
          title: "Summer Associate",
          company: "Demo Draft LLP",
          dates: "2022",
          highlights: [
            "Supported litigation and employment teams on research, due diligence, and writing assignments",
            "Delivered client-ready research summaries for partner review",
          ],
          url: null,
        },
      ],
      education: [
        {
          degree: "J.D.",
          school: "Example Law Center",
          year: "2023",
        },
        {
          degree: "B.A. Political Science",
          school: "Sample State University",
          year: "2020",
        },
      ],
      projects: [],
      skills: [
        {
          category: "Practice",
          items: ["Commercial Litigation", "Legal Research", "Motion Practice", "Discovery"],
        },
        {
          category: "Writing",
          items: ["Brief Drafting", "Case Strategy Memos", "Client Communication"],
        },
        {
          category: "Tools",
          items: ["Westlaw", "LexisNexis", "Relativity", "Clio"],
        },
      ],
      certifications: [
        {
          name: "Bar Admission Credential",
          issuer: "Sample Bar Board",
          date: "2023",
        },
      ],
      stats: [
        { value: "2", label: "Years Practice" },
        { value: "25+", label: "Motions Drafted" },
        { value: "40+", label: "Research Memos" },
        { value: "100%", label: "Bar Passed" },
      ],
    },
  },
];
