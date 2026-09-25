import { ChartColumn, House, Receipt, Users, Wallet, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Overview", icon: House },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/money", label: "Money", icon: Wallet },
  { href: "/analytics", label: "Analytics", icon: ChartColumn },
  { href: "/groups", label: "Groups", icon: Users },
];

export const isActivePath = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
