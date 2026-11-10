// Navigation per role. Icons are lucide-react component names, resolved in the shell.

export const nav = {
  student: {
    main: [
      { href: "/browse", label: "Dashboard", icon: "LayoutDashboard" },
      { href: "/course", label: "Course", icon: "BookOpen" },
      { href: "/activities", label: "Study Kit", icon: "ClipboardList" },
      { href: "/progress", label: "Progress", icon: "ChartLine" },
      { href: "/certificates", label: "Certificate", icon: "BadgeCheck" },
    ],
    more: [],
    mobile: [
      { href: "/browse", label: "Home", icon: "House" },
      { href: "/course", label: "Course", icon: "BookOpen" },
      { href: "/activities", label: "Study Kit", icon: "ClipboardList" },
      { href: "/progress", label: "Progress", icon: "ChartLine" },
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
  // Studio: only accounts on the studio_admins allowlist ever get this role.
  admin: {
    // `group` starts a new headed section in the sidebar, so 13 links read as 4 short lists.
    main: [
      { href: "/admin/today", label: "Today", icon: "CalendarCheck" },
      { href: "/admin", label: "Studio home", icon: "LayoutDashboard" },
      { href: "/admin/content", label: "Content", icon: "Clapperboard", group: "Teach" },
      { href: "/admin/quizzes", label: "Quizzes", icon: "ListChecks" },
      { href: "/admin/assignments", label: "Assignments", icon: "ClipboardCheck" },
      { href: "/admin/enrollments", label: "Enrollments", icon: "UserCheck", group: "Students and payments" },
      { href: "/admin/reconcile", label: "Reconciliation", icon: "ReceiptText" },
      { href: "/admin/people", label: "Schools & people", icon: "Users" },
      { href: "/admin/access", label: "School keys", icon: "KeyRound" },
      { href: "/admin/pipeline", label: "Pipeline", icon: "Contact", group: "Grow" },
      { href: "/admin/outreach", label: "School outreach", icon: "School" },
      { href: "/admin/analytics", label: "Analytics", icon: "ChartLine" },
      { href: "/admin/automations", label: "Automations", icon: "Workflow" },
    ],
    more: [
      { href: "/browse", label: "Student view", icon: "GraduationCap" },
      { href: "/course", label: "Course page", icon: "BookOpen" },
    ],
    mobile: [
      { href: "/admin/today", label: "Today", icon: "CalendarCheck" },
      { href: "/admin", label: "Studio", icon: "LayoutDashboard" },
      { href: "/admin/assignments", label: "Review", icon: "ClipboardCheck" },
      { href: "/admin/enrollments", label: "Enrolled", icon: "UserCheck" },
      { href: "/profile", label: "Profile", icon: "User" },
    ],
  },
};
