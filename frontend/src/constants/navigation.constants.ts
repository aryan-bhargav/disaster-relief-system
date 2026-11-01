import type { UserRole } from "@/types";

export interface NavItem {
  name: string;
  href: string;
  iconName: "LayoutDashboard" | "FileText" | "Package" | "Building2" | "Share2" | "MapPin" | "BarChart3" | "Users";
  roles: UserRole[];
  description?: string;
}

export const NAVIGATION_ITEMS: NavItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    iconName: "LayoutDashboard",
    roles: ["admin", "coordinator", "field_user"],
    description: "Operational overview and metrics",
  },
  {
    name: "Relief Requests",
    href: "/requests",
    iconName: "FileText",
    roles: ["admin", "coordinator", "field_user"],
    description: "Submit and monitor disaster aid requests",
  },
  {
    name: "Resources",
    href: "/resources",
    iconName: "Package",
    roles: ["admin", "coordinator"],
    description: "Inventory stockpiles and distribution goods",
  },
  {
    name: "Relief Centres",
    href: "/centres",
    iconName: "Building2",
    roles: ["admin", "coordinator"],
    description: "Warehouses and distribution facilities",
  },
  {
    name: "Allocations",
    href: "/allocations",
    iconName: "Share2",
    roles: ["admin", "coordinator"],
    description: "Resource dispatch and delivery workflow",
  },
  {
    name: "Operations Map",
    href: "/map",
    iconName: "MapPin",
    roles: ["admin", "coordinator", "field_user"],
    description: "Geospatial view & road navigation",
  },
  {
    name: "Reports & Analytics",
    href: "/analytics",
    iconName: "BarChart3",
    roles: ["admin", "coordinator"],
    description: "Aggregated performance & distribution reports",
  },
  {
    name: "User Management",
    href: "/users",
    iconName: "Users",
    roles: ["admin"],
    description: "Master user roles and account statuses",
  },
];
