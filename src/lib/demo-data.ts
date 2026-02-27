import type { ResumeData } from "@/types/resume";
import type { ThemeId } from "@/themes/types";

export interface DemoPage {
  themeId: ThemeId;
  data: ResumeData;
}

export const DEMO_PAGES: DemoPage[] = [
  {
    themeId: "cosmic",
    data: {
      name: "Alex Chen",
      headline: "Senior Full-Stack Engineer",
      location: "San Francisco, CA",
      email: "alex@example.com",
      linkedin: "linkedin.com/in/alexchen",
      github: "alexchen",
      website: null,
      avatar_url: null,
      summary:
        "Full-stack engineer with 8 years of experience building scalable web applications. Passionate about developer experience, performance optimization, and shipping products that users love.",
      experience: [
        {
          title: "Senior Software Engineer",
          company: "Streamline",
          dates: "2022 – Present",
          highlights: [
            "Led migration from monolith to microservices serving 2M+ requests/day",
            "Built real-time collaboration engine using WebSockets and CRDTs",
            "Mentored 4 junior engineers through structured growth plans",
          ],
        },
        {
          title: "Software Engineer",
          company: "DataVault",
          dates: "2019 – 2022",
          highlights: [
            "Designed and shipped analytics dashboard used by 500+ enterprise clients",
            "Reduced API response times by 60% through query optimization",
          ],
        },
        {
          title: "Junior Developer",
          company: "WebCraft Studios",
          dates: "2017 – 2019",
          highlights: [
            "Built responsive client sites using React and Node.js",
            "Introduced automated testing, bringing coverage from 15% to 80%",
          ],
        },
      ],
      education: [
        {
          degree: "B.S. Computer Science",
          school: "UC Berkeley",
          year: "2017",
        },
      ],
      projects: [
        {
          name: "OpenTrace",
          description:
            "Open-source distributed tracing library for Node.js microservices with zero-config setup.",
          tech: ["TypeScript", "gRPC", "OpenTelemetry"],
          url: null,
        },
        {
          name: "DevPulse",
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
          name: "AWS Solutions Architect – Associate",
          issuer: "Amazon Web Services",
          date: "2023",
        },
      ],
      stats: [
        { value: "8+", label: "Years Experience" },
        { value: "2M+", label: "Requests / Day" },
        { value: "12", label: "Open Source Projects" },
        { value: "500+", label: "Enterprise Clients" },
      ],
    },
  },
  {
    themeId: "aurora",
    data: {
      name: "Maya Rodriguez",
      headline: "UX Design Lead",
      location: "New York, NY",
      email: "maya@example.com",
      linkedin: "linkedin.com/in/mayarodriguez",
      github: null,
      website: "mayarodriguez.design",
      avatar_url: null,
      summary:
        "Design lead with a decade of experience shaping digital products used by millions. I bridge user research, interaction design, and brand strategy to create experiences that feel effortless.",
      experience: [
        {
          title: "UX Design Lead",
          company: "Prism Health",
          dates: "2021 – Present",
          highlights: [
            "Redesigned patient portal, increasing task completion by 40%",
            "Built and scaled design system across 3 product teams",
            "Led research sprints with 200+ patient interviews",
          ],
        },
        {
          title: "Senior Product Designer",
          company: "Canopy",
          dates: "2018 – 2021",
          highlights: [
            "Designed onboarding flow that reduced churn by 25%",
            "Created component library adopted across 4 product squads",
          ],
        },
        {
          title: "UX Designer",
          company: "PixelForge Agency",
          dates: "2015 – 2018",
          highlights: [
            "Delivered 30+ client projects across fintech, healthcare, and e-commerce",
            "Introduced usability testing practice, winning 2 industry awards",
          ],
        },
      ],
      education: [
        {
          degree: "M.F.A. Interaction Design",
          school: "School of Visual Arts",
          year: "2015",
        },
        {
          degree: "B.A. Psychology",
          school: "NYU",
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
          name: "Google UX Design Certificate",
          issuer: "Google",
          date: "2022",
        },
        {
          name: "Certified Usability Analyst",
          issuer: "Human Factors International",
          date: "2020",
        },
      ],
      stats: [
        { value: "10+", label: "Years in Design" },
        { value: "40%", label: "Task Completion Lift" },
        { value: "30+", label: "Client Projects" },
        { value: "200+", label: "User Interviews" },
      ],
    },
  },
  {
    themeId: "monolith",
    data: {
      name: "James Okafor",
      headline: "Finance Director & Strategic Advisor",
      location: "London, UK",
      email: "james@example.com",
      linkedin: "linkedin.com/in/jamesokafor",
      github: null,
      website: null,
      avatar_url: null,
      summary:
        "Finance director with 12 years of experience in corporate strategy, M&A, and financial planning across technology and financial services. Track record of driving operational efficiency and closing complex transactions.",
      experience: [
        {
          title: "Finance Director",
          company: "Nexus Capital Partners",
          dates: "2020 – Present",
          highlights: [
            "Oversee $850M portfolio across 14 technology investments",
            "Led due diligence on 6 acquisitions totaling $320M",
            "Implemented forecasting model reducing variance by 35%",
          ],
        },
        {
          title: "Senior Financial Analyst",
          company: "Barclays Investment Bank",
          dates: "2016 – 2020",
          highlights: [
            "Advised on 8 M&A transactions in technology sector",
            "Built financial models for deals ranging $50M – $500M",
          ],
        },
        {
          title: "Financial Analyst",
          company: "Deloitte",
          dates: "2013 – 2016",
          highlights: [
            "Delivered financial audits for FTSE 100 clients",
            "Streamlined reporting workflows saving 200+ hours annually",
          ],
        },
      ],
      education: [
        {
          degree: "MBA, Finance",
          school: "London Business School",
          year: "2016",
        },
        {
          degree: "B.Sc. Economics",
          school: "University of Lagos",
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
          items: ["Bloomberg Terminal", "Excel/VBA", "Tableau", "SAP"],
        },
      ],
      certifications: [
        {
          name: "CFA Charterholder",
          issuer: "CFA Institute",
          date: "2018",
        },
        {
          name: "ACCA Qualified",
          issuer: "ACCA",
          date: "2015",
        },
      ],
      stats: [
        { value: "$850M", label: "Portfolio Managed" },
        { value: "12+", label: "Years in Finance" },
        { value: "6", label: "Acquisitions Led" },
        { value: "35%", label: "Forecast Variance Cut" },
      ],
    },
  },
];
