/**
 * content.js
 * Profile content for Muhammad Jundi Assabiq.
 */

window.portfolioData = {
  user: {
    // Small WebP for the 72px avatar; the full JPG stays for SEO/social previews.
    avatar: "assets/images/pfp-160.webp",
    avatarFallback: "assets/images/pfp.jpg",
    name: "Muhammad Jundi Assabiq",
    shortName: "Jundi",
    bio: "What's good?",
    status: "Open for collaborations",
    socials: [
      { type: "github", label: "GitHub", url: "https://github.com/jundiassabiq" },
      { type: "linkedin", label: "LinkedIn", url: "https://id.linkedin.com/in/muhammad-jundi-assabiq-913575368" }
    ],
    hero: {
      subtitle: "An undergraduate informatics student that is passionate about automation and software development."
    },
    stats: [
      { val: "5", lbl: "Projects done" },
      { val: "3", lbl: "Years of learning" },
      { val: "10+", lbl: "Tools mastered" }
    ],
    expHeader: {
      solid: "Academic &",
      ghost: "organization."
    },
    experiences: [
      {
        company: "MAN Purbalingga",
        role: "Senior high school",
        desc: "Where I first got into programming and started building small projects.",
        period: "2022 — 2025"
      },
      {
        company: "Universitas Jenderal Soedirman (Unsoed)",
        role: "Undergraduate, Informatics",
        desc: "Studying Informatics with a focus on automation and software development.",
        period: "2025 — Present"
      },
      {
        company: "Soedirman Robotic Team (SRT)",
        role: "Programmer",
        desc: "Developing robot control algorithms and automation systems for robotics competitions.",
        period: "2026 — Present"
      },
      {
        company: "Lab Assistant, Algorithms & Programming",
        role: "Informatics, Unsoed",
        desc: "Teaching and mentoring first-year students in the Algorithms and Programming course.",
        period: "2026"
      }
    ],
    projects: [
      {
        title: "Portfolio",
        category: "Personal website with a 3D Earth",
        badge: "Live",
        url: "https://jundiaiq.my.id",
        host: "jundiaiq.my.id",
        image: "mockup/portofolio.webp"
      },
      {
        title: "Soedkost",
        category: "Boarding house finder for Unsoed students",
        badge: "Live",
        url: "https://soedkost.jundiaiq.my.id",
        host: "soedkost.jundiaiq.my.id",
        image: "mockup/soedkost.webp"
      },
      {
        title: "Picis",
        category: "Web application & finance",
        badge: "Ongoing",
        ongoing: true
      }
    ]
  }
};
