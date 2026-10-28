import { publishFoundingCopy } from '@/shared/publicClaims';

export interface HomepageFaq {
  q: string;
  a: string;
}

export const HOMEPAGE_FAQS: HomepageFaq[] = [
  {
    q: "Can we live at home during the remodel?",
    a: "For most kitchen and bathroom projects, yes, with some daily inconvenience. We install dust barriers, protect floors, and schedule noisy work for reasonable hours. For whole-home renovations involving HVAC or electrical throughout the house, we give you an honest assessment at the free visit of whether staying is practical.",
  },
  {
    q: "Is design included in the planning range?",
    a: "Layout, design direction, and finish selections are coordinated with the written scope. Optional 3D visualizations are available as a design upgrade; their cost and timeline are discussed before we proceed.",
  },
  {
    q: "What is the payment schedule?",
    a: "You receive a written scope and price before any work. Nothing is due until that scope is signed. Draw timing for the remodel is set in the contract and confirmed at the free in-home visit.",
  },
  {
    q: "How long is the workmanship guarantee?",
    a: "Two years on remodeling workmanship. We also pass through manufacturer warranties on fixtures and cabinetry we install.",
  },
  {
    q: "Who does the work?",
    a: "A core in-house team handles project management, design coordination, and key trades. Plumbing, electrical and HVAC go to licensed trade partners we schedule and stand behind. Your project manager remains your single point of contact.",
  },
  {
    q: "What do home remodeling contractors typically handle?",
    a: "Kitchen and bath remodels, basement finishing, outdoor living, and whole-home renovations when scoped. Room additions and ADUs are referred to Boise Construction Co. Exact inclusions are in your written scope before construction.",
  },
  {
    q: "Do you serve areas near Boise?",
    a: "Yes. Dedicated pages cover Meridian, Eagle, Nampa, Caldwell, Kuna, Star, and Middleton, plus Boise. Use the city page that matches your address, then book the free visit.",
  },
  {
    q: "How are you different from other remodeling companies in the Treasure Valley?",
    a: publishFoundingCopy(
      "Boise Remodeling Co is a design-build remodeling contractor in Boise, founded in Colorado in 2020 and part of P5 Home Co. A free in-home visit includes a written scope and a two-year workmanship guarantee. Ada and Canyon permitting is part of the project. The first figures are planning ranges, not quotes.",
    ),
  },
  {
    q: "How do you help me understand project costs?",
    a: "We provide honest planning ranges based on your project type, size, finish level, and goals. After your in-home consultation, you receive a written scope with your project investment outlined clearly. We do not share itemized material costs or subcontractor costs. Instead, we focus on clear expectations, budget guidance, and proactive communication throughout your project.",
  },
  {
    q: "What does a typical project timeline look like?",
    a: "Kitchen remodels typically run 6 to 10 weeks from permit approval. Bathroom remodels are 3 to 6 weeks. Whole-home renovations range from 3 to 6 months depending on scope. We give you a week-by-week schedule at project kickoff and update it every Friday.",
  },
  {
    q: "Do you handle permits?",
    a: "Yes. Permits are included in our scope and handled entirely in-house. We know the Ada and Canyon County permit offices and build permit timelines into your project schedule from day one.",
  },
  {
    q: "What does the free in-home visit include?",
    a: "A 60 to 90 minute walkthrough with our lead designer and estimator. We look at your space, discuss your goals and wish list, share relevant design ideas, and give you a planning range on the spot. No pressure. You leave with information, not a sales pitch.",
  },
  {
    q: "What financing options do you offer?",
    a: "We partner with GreenSky and Mosaic to offer flexible financing options on qualifying projects. Applications take about five minutes and you can get a decision the same day. We can walk you through options at your free in-home consultation.",
  },
  {
    q: "Do you work with subcontractors or your own employees?",
    a: "We employ a core in-house team for project management, design coordination, and key trades. Specialized work is performed by vetted trade partners we have worked with repeatedly. Your project manager remains your single point of contact regardless of who is on site any given day.",
  },
];
