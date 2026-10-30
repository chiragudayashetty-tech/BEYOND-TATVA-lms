// Navigation per role. Icons are lucide-react component names, resolved in the shell.

export const nav = {
  student: {
    main: [
      { href: "/browse", label: "Dashboard", icon: "LayoutDashboard" },
      { href: "/course", label: "Course", icon: "BookOpen" },
      { href: "/planner", label: "Study Planner", icon: "CalendarDays" },
      { href: "/progress", label: "Progress", icon: "ChartLine" },
      { href: "/certificates", label: "Certificate", icon: "BadgeCheck" },
    ],
    more: [],
    mobile: [
      { href: "/browse", label: "Home", icon: "House" },
      { href: "/course", label: "Course", icon: "BookOpen" },
      { href: "/planner", label: "Planner", icon: "CalendarDays" },
      { href: "/progress", label: "Progress", icon: "ChartLine" },
      { href: "/profile", label: "Profile", icon: "User" },
    ],
  },
  parent: {
    main: [{ href: "/parent", label: "Overview", icon: "LayoutDashboard" }],
    more: [],
    mobile: [
      { href: "/parent", label: "Overview", icon: "House" },
      { href: "/profile", label: "Profile", icon: "User" },
    ],
  },
  teacher: {
    main: [
      { href: "/teacher", label: "My Class", icon: "Users" },
      { href: "/course", label: "Course", icon: "BookOpen" },
    ],
    more: [],
    mobile: [
      { href: "/teacher", label: "Class", icon: "Users" },
      { href: "/course", label: "Course", icon: "BookOpen" },
      { href: "/profile", label: "Profile", icon: "User" },
    ],
  },
  admin: {
    main: [
      { href: "/admin", label: "Overview", icon: "LayoutDashboard" },
      { href: "/admin/content", label: "Content", icon: "Clapperboard" },
      { href: "/admin/access", label: "Access keys", icon: "KeyRound" },
      { href: "/admin/people", label: "Schools & people", icon: "Users" },
      { href: "/admin/crm", label: "CRM", icon: "Contact" },
      { href: "/admin/automations", label: "Automations", icon: "Workflow" },
    ],
    more: [
      { href: "/browse", label: "Student view", icon: "GraduationCap" },
      { href: "/course", label: "Course page", icon: "BookOpen" },
    ],
    mobile: [
      { href: "/admin", label: "Overview", icon: "LayoutDashboard" },
      { href: "/admin/content", label: "Content", icon: "Clapperboard" },
      { href: "/admin/access", label: "Keys", icon: "KeyRound" },
      { href: "/profile", label: "Profile", icon: "User" },
    ],
  },
};
