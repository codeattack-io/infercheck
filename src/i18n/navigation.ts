import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Locale-aware navigation utilities.
 * Import Link, redirect, useRouter, usePathname from here instead of next/link
 * or next/navigation — these versions automatically prefix links with the active locale.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
