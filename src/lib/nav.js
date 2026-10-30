// Navigation per role. Icons are lucide-react component names, resolved in the shell.

export const nav = {
  student: {
    main: [
      { href: "/browse", label: "Dashboard", icon: "LayoutDashboard" },
      { href: "/courses", label: "My Courses", icon: "BookOpen" },
      { href: "/live", label: "Live Classes", icon: "Radio" },
      { href: "/planner", label: "Study Planner", icon: "CalendarDays" },
      { href: "/assignments", label: "Assignments", icon: "ClipboardList" },
      { href: "/challenges", label: "Challenges", icon: "Swords" },
    ],
    more: [
      { href: "/progress", label: "Progress", icon: "ChartLine" },
      { href: "/leaderboard", label: "Leaderboard", icon: "Trophy" },
      { href: "/achievements", label: "Achievements", icon: "Award" },
      { href: "/certificates", label: "Certificates", icon: "BadgeCheck" },
    ],
    mobile: [
      { href: "/browse", label: "Home", icon: "House" },
      { href: "/courses", label: "Courses", icon: "BookOpen" },
      { href: "/planner", label: "Planner", icon: "CalendarDays" },
      { href: "/progress", label: "Progress", icon: "ChartLine" },
      { href: "/profile", label: "Profile", icon: "User" },
    ],
  },
  parent: {
    main: [
      { href: "/parent", label: "Overview", icon: "LayoutDashboard" },
      { href: "/parent#screen-time", label: "Screen time", icon: "Smartphone" },
      { href: "/parent#courses", label: "Courses", icon: "BookOpen" },
    ],
    more: [],
    mobile: [
      { href: "/parent", label: "Overview", icon: "House" },
      { href: "/profile", label: "Profile", icon: "User" },
    ],
  },
  teacher: {
    main: [
      { href: "/teacher", label: "My Class", icon: "Users" },
      { href: "/courses", label: "Courses", icon: "BookOpen" },
      { href: "/live", label: "Live Classes", icon: "Radio" },
    ],
    more: [],
    mobile: [
      { href: "/teacher", label: "Class", icon: "Users" },
      { href: "/courses", label: "Courses", icon: "BookOpen" },
      { href: "/profile", label: "Profile", icon: "User" },
    ],
  },
  admin: {
    main: [
      { href: "/admin", label: "Overview", icon: "LayoutDashboard" },
      { href: "/admin#content", label: "Content", icon: "Clapperboard" },
      { href: "/admin#integrations", label: "Integrations", icon: "Plug" },
      { href: "/admin#automations", label: "Automations", icon: "Workflow" },
    ],
    more: [
      { href: "/browse", label: "Student view", icon: "GraduationCap" },
      { href: "/teacher", label: "Teacher view", icon: "Users" },
      { href: "/parent", label: "Parent view", icon: "House" },
    ],
    mobile: [
      { href: "/admin", label: "Overview", icon: "LayoutDashboard" },
      { href: "/browse", label: "Student", icon: "GraduationCap" },
      { href: "/profile", label: "Profile", icon: "User" },
    ],
  },
};
