import { NavLink } from "react-router-dom"
import * as Icons from "react-icons/vsc"
import { motion } from "framer-motion"

export default function SidebarLink({
  link,
  iconName,
  collapsed,
  badgeCount,
}) {
  const Icon = Icons[iconName]

  return (
    <NavLink
      to={link.path}
      title={collapsed ? link.name : ""}
      className={({ isActive }) =>
        `relative flex items-center rounded-lg px-3 py-3 transition-all duration-300 group
        ${collapsed ? "justify-center" : "gap-3"}
        ${
          isActive
            ? "bg-yellow-500/20 text-yellow-50"
            : "text-richblack-200 hover:bg-richblack-700 hover:text-yellow-50"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.div
              layoutId="activeBar"
              className="absolute left-0 top-0 h-full w-[4px] rounded-r-lg bg-yellow-400"
            />
          )}

          <Icon
            className={`text-lg transition-transform duration-300 ${
              collapsed ? "scale-110" : ""
            }`}
          />

          {!collapsed && (
            <span className="min-w-0 flex-1 text-sm font-medium whitespace-nowrap">
              {link.name}
            </span>
          )}

          {collapsed && (
            <span className="absolute left-14 z-50 whitespace-nowrap rounded-md bg-richblack-900 px-2 py-1 text-xs text-white opacity-0 transition duration-200 group-hover:opacity-100">
              {link.name}
            </span>
          )}

          {link.name === "Enrolled Courses" &&
            !collapsed &&
            Number.isFinite(Number(badgeCount)) && (
              <span
                aria-label={`${badgeCount} enrolled courses`}
                className="ml-auto min-w-[24px] rounded-full bg-pink-500 px-2 py-[2px] text-center text-[10px] font-bold text-white"
              >
                {badgeCount}
              </span>
            )}
        </>
      )}
    </NavLink>
  )
}
