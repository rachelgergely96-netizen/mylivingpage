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
      name: "Avery Chen",
      headline: "Senior Full-Stack Engineer",
      location: "San Francisco, CA",
      email: "avery.chen@sample.invalid",
      linkedin: "https://linkedin.sample.invalid/in/avery-chen",
      github: "https://github.sample.invalid/averychen",
      website: "https://averychen.sample.invalid",
      avatar_url: null,
      summary:
        "I'm a full-stack engineer who likes turning complicated systems into dependable products. Over the past eight years, I've focused on developer experience, performance, and tools that help teams ship with confidence.",
      experience: [
        {
          title: "Senior Software Engineer",
          company: "Northstar Systems",
          dates: "2022 - Present",
          highlights: [
            "Led migration from monolith to microservices serving 2M+ requests/day",
            "Built real-time collaboration workflows using WebSockets and CRDTs",
            "Mentored 4 junior engineers through structured growth plans",
          ],
          url: "https://northstar-systems.sample.invalid",
        },
        {
          title: "Software Engineer",
          company: "Lattice Analytics",
          dates: "2019 - 2022",
          highlights: [
            "Designed and shipped analytics dashboards used across enterprise teams",
            "Reduced API response times by 60% through query optimization",
          ],
          url: null,
        },
        {
          title: "Junior Developer",
          company: "Cedarline Studio",
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
          school: "North Coast Institute of Technology",
          year: "2017",
        },
      ],
      projects: [
        {
          name: "TraceBoard",
          description:
            "Internal tracing toolkit for Node.js services with a low-friction setup for engineering teams.",
          tech: ["TypeScript", "gRPC", "OpenTelemetry"],
          url: "https://averychen.sample.invalid/work/traceboard",
        },
        {
          name: "Pipeline Pulse",
          description:
            "Developer productivity tracker that surfaces bottlenecks in CI/CD pipelines.",
          tech: ["Next.js", "PostgreSQL", "GitHub API"],
          url: "https://averychen.sample.invalid/work/pipeline-pulse",
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
          issuer: "Cloud Engineering Council",
          date: "2023",
        },
      ],
      stats: [
        { value: "8+", label: "Years Exp." },
        { value: "2M+", label: "Req. / Day" },
        { value: "12", label: "Builds Shipped" },
        { value: "500+", label: "Team Users" },
      ],
      proofs: [
        {
          id: "avery-realtime-collaboration",
          type: "quantified_result",
          title: "Realtime collaboration launch",
          summary:
            "Architecture notes and rollout plan for a shared workspace used by distributed product teams.",
          outcome: "Supported 500+ daily team users while reducing sync-related support tickets by 32%.",
          url: "https://averychen.sample.invalid/proof/realtime-collaboration",
          source_label: "Northstar Systems",
        },
      ],
      testimonials: [
        {
          id: "avery-testimonial-priya",
          name: "Priya Raman",
          role: "Director of Engineering",
          company: "Northstar Systems",
          relationship: "Manager",
          quote:
            "Avery brings calm structure to ambiguous technical work and leaves the team with a system they can actually maintain.",
          status: "approved",
          requested_at: "2026-04-18",
          approved_at: "2026-04-22",
        },
      ],
    },
  },
  {
    themeId: "aurora",
    data: {
      name: "Morgan Ellis",
      headline: "UX Design Lead",
      location: "New York, NY",
      email: "morgan.ellis@sample.invalid",
      linkedin: "https://linkedin.sample.invalid/in/morgan-ellis",
      github: null,
      website: "https://morganellis.sample.invalid",
      avatar_url: null,
      summary:
        "I'm a design lead who connects user research, interaction design, and brand strategy. I care about making complex products feel understandable, especially when the people using them are already under pressure.",
      experience: [
        {
          title: "UX Design Lead",
          company: "Kindred Care",
          dates: "2021 - Present",
          highlights: [
            "Redesigned a customer portal, increasing task completion by 40%",
            "Built and scaled a design system across 3 product teams",
            "Led research sprints with 200+ customer interviews",
          ],
          url: "https://kindred-care.sample.invalid",
        },
        {
          title: "Senior Product Designer",
          company: "Fieldnote Product Co.",
          dates: "2018 - 2021",
          highlights: [
            "Designed onboarding flows that reduced churn by 25%",
            "Created a component library adopted across 4 product squads",
          ],
          url: null,
        },
        {
          title: "UX Designer",
          company: "Studio Lantern",
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
          school: "Metropolitan School of Design",
          year: "2015",
        },
        {
          degree: "B.A. Psychology",
          school: "Hudson City University",
          year: "2013",
        },
      ],
      projects: [
        {
          name: "Accessibility Playbook",
          description:
            "Open resource for design teams adopting WCAG 2.1 AA standards with practical checklists and Figma templates.",
          tech: ["Figma", "WCAG", "Research"],
          url: "https://morganellis.sample.invalid/work/accessibility-playbook",
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
          issuer: "Interaction Design Guild",
          date: "2022",
        },
        {
          name: "Usability Analysis Certificate",
          issuer: "Usability Professionals Council",
          date: "2020",
        },
      ],
      stats: [
        { value: "10+", label: "Years Design" },
        { value: "40%", label: "Task Lift" },
        { value: "30+", label: "Projects" },
        { value: "200+", label: "Interviews" },
      ],
      proofs: [
        {
          id: "morgan-care-portal",
          type: "case_study",
          title: "Customer care portal redesign",
          summary:
            "A research-led redesign covering navigation, service requests, account tasks, and accessible interaction patterns.",
          outcome: "Increased successful task completion by 40% in moderated testing and post-launch analytics.",
          url: "https://morganellis.sample.invalid/case-study/care-portal",
          source_label: "Kindred Care",
        },
      ],
      testimonials: [
        {
          id: "morgan-testimonial-daniel",
          name: "Daniel Cho",
          role: "VP, Product",
          company: "Kindred Care",
          relationship: "Cross-functional partner",
          quote:
            "Morgan makes research useful. The team always understands what we learned, what decision it changes, and what to do next.",
          status: "approved",
          requested_at: "2026-03-08",
          approved_at: "2026-03-11",
        },
      ],
    },
  },
  {
    themeId: "matrix",
    data: {
      name: "Taylor Okafor",
      headline: "Finance Director & Strategic Advisor",
      location: "London, UK",
      email: "taylor.okafor@sample.invalid",
      linkedin: "https://linkedin.sample.invalid/in/taylor-okafor",
      github: null,
      website: "https://taylorokafor.sample.invalid",
      avatar_url: null,
      summary:
        "I'm a finance leader with 12 years of experience across corporate strategy, M&A, and planning for growth-stage businesses. My work turns complex financial questions into clear operating decisions for boards and leadership teams.",
      experience: [
        {
          title: "Finance Director",
          company: "Alderbridge Capital",
          dates: "2020 - Present",
          highlights: [
            "Oversee an $850M planning portfolio across 14 investments",
            "Led due diligence on 6 acquisitions totaling $320M",
            "Implemented forecasting models reducing variance by 35%",
          ],
          url: "https://alderbridge-capital.sample.invalid",
        },
        {
          title: "Senior Financial Analyst",
          company: "Meridian Investment Advisory",
          dates: "2016 - 2020",
          highlights: [
            "Advised on 8 technology transactions across mid-market clients",
            "Built financial models for deals ranging from $50M to $500M",
          ],
          url: null,
        },
        {
          title: "Financial Analyst",
          company: "Park & Vale Audit",
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
          school: "Westbridge Business School",
          year: "2016",
        },
        {
          degree: "B.Sc. Economics",
          school: "Northshore University",
          year: "2012",
        },
      ],
      projects: [
        {
          name: "Board Forecasting Pack",
          description:
            "A scenario-planning model and executive reporting format used to connect portfolio forecasts with operating decisions.",
          tech: ["Financial Modeling", "Scenario Planning", "Tableau"],
          url: "https://taylorokafor.sample.invalid/work/forecasting-pack",
        },
      ],
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
          issuer: "Strategic Finance Council",
          date: "2018",
        },
        {
          name: "Advanced Reporting Credential",
          issuer: "Financial Reporting Institute",
          date: "2015",
        },
      ],
      stats: [
        { value: "$850M", label: "Portfolio" },
        { value: "12+", label: "Years Finance" },
        { value: "6", label: "Deals Led" },
        { value: "35%", label: "Variance Cut" },
      ],
      proofs: [
        {
          id: "taylor-forecasting-model",
          type: "quantified_result",
          title: "Portfolio forecasting model",
          summary:
            "A standardized planning model that aligned investment, finance, and operating teams around one forecast.",
          outcome: "Reduced quarterly forecast variance by 35% and shortened the planning cycle by nine business days.",
          url: "https://taylorokafor.sample.invalid/proof/portfolio-forecasting",
          source_label: "Alderbridge Capital",
        },
      ],
      testimonials: [
        {
          id: "taylor-testimonial-helen",
          name: "Helen Ward",
          role: "Operating Partner",
          company: "Alderbridge Capital",
          relationship: "Executive partner",
          quote:
            "Taylor gives leaders a financial view they can act on—clear assumptions, honest tradeoffs, and no unnecessary theater.",
          status: "approved",
          requested_at: "2026-02-15",
          approved_at: "2026-02-19",
        },
      ],
    },
  },
  {
    themeId: "luxe",
    data: {
      name: "Jordan Rivera",
      headline: "Litigation Associate",
      location: "Chicago, IL",
      email: "jordan.rivera@sample.invalid",
      linkedin: "https://linkedin.sample.invalid/in/jordan-rivera",
      github: null,
      website: "https://jordanrivera.sample.invalid",
      avatar_url: null,
      summary:
        "I'm a litigation associate focused on commercial disputes, careful research, and clear client communication. I do my best work when the record is complicated, the deadline is real, and the writing has to make the next decision easier.",
      experience: [
        {
          title: "Associate Attorney",
          company: "Halstead Counsel Group",
          dates: "2024 - Present",
          highlights: [
            "Drafted motions, discovery responses, and research memos for business disputes",
            "Prepared partners for hearings and client strategy calls under tight deadlines",
            "Managed document review and case timelines across multiple active matters",
          ],
          url: "https://halstead-counsel.sample.invalid",
        },
        {
          title: "Judicial Law Clerk",
          company: "Lakeview County Court",
          dates: "2023 - 2024",
          highlights: [
            "Researched precedent and prepared bench memoranda for civil matters",
            "Reviewed filings and proposed orders for docket management and hearings",
          ],
          url: null,
        },
        {
          title: "Summer Associate",
          company: "Keane & Mercer LLP",
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
          school: "Lakeshore University College of Law",
          year: "2023",
        },
        {
          degree: "B.A. Political Science",
          school: "Midwest State University",
          year: "2020",
        },
      ],
      projects: [
        {
          name: "Case Timeline Toolkit",
          description:
            "A repeatable chronology and source-index workflow for organizing dense commercial-litigation records before briefing.",
          tech: ["Case Strategy", "Fact Development", "Legal Writing"],
          url: "https://jordanrivera.sample.invalid/work/case-timeline-toolkit",
        },
      ],
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
          issuer: "State Attorney Registration Council",
          date: "2023",
        },
      ],
      stats: [
        { value: "2", label: "Years Practice" },
        { value: "25+", label: "Motions Drafted" },
        { value: "40+", label: "Research Memos" },
        { value: "100%", label: "Bar Passed" },
      ],
      proofs: [
        {
          id: "jordan-writing-sample",
          type: "writing_sample",
          title: "Commercial litigation writing sample",
          summary:
            "A redacted motion excerpt showing issue framing, authority synthesis, and a clear requested ruling.",
          outcome: "Demonstrates concise legal analysis without exposing client or matter information.",
          url: "https://jordanrivera.sample.invalid/proof/writing-sample",
          source_label: "Redacted sample",
        },
      ],
      testimonials: [
        {
          id: "jordan-testimonial-maya",
          name: "Maya Bennett",
          role: "Partner",
          company: "Halstead Counsel Group",
          relationship: "Supervising attorney",
          quote:
            "Jordan is unusually good at finding the clean argument inside a messy record and communicating it without overstating the case.",
          status: "approved",
          requested_at: "2026-05-02",
          approved_at: "2026-05-05",
        },
      ],
    },
  },
];
