import { useState, useEffect } from "react"
import { VscSignOut, VscMenu } from "react-icons/vsc"
import { FiMoon } from "react-icons/fi"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"

import { sidebarLinks } from "../../../data/dashboard-links"
import { logout } from "../../../services/operations/authAPI"
import ConfirmationModal from "../../common/ConfirmationModal"
import SidebarLink from "./SidebarLink"

export default function Sidebar() {
  const { user, loading: profileLoading } = useSelector(
    (state) => state.profile
  )
  const { loading: authLoading } = useSelector((state) => state.auth)
  const enrolledCourseCount = Array.isArray(user?.courses) ? user.courses.length : 0

  const dispatch = useDispatch()
  const navigate = useNavigate()

  const [confirmationModal, setConfirmationModal] = useState(null)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // 🔥 AUTO RESPONSIVE (Laptop Collapse)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setCollapsed(true)
      } else {
        setCollapsed(false)
      }
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  if (profileLoading || authLoading) {
    return (
      <div className="grid h-[calc(100vh-3.5rem)] min-w-[240px] place-items-center bg-richblack-800">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <>
      {/* 🔥 MOBILE MENU BUTTON */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-20 left-4 z-[300] bg-richblack-800 p-2 rounded-lg text-white"
      >
        <VscMenu size={22} />
      </button>

      {/* 🔥 SIDEBAR */}
      <AnimatePresence>
        {(mobileOpen || window.innerWidth >= 768) && (
          <motion.div
            initial={{ x: -80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -80, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`
              fixed md:static z-50
              ${mobileOpen ? "left-0" : "-left-[300px] md:left-0"}
              ${collapsed ? "w-[80px]" : "w-[260px]"}
              transition-all duration-300
              flex h-[calc(100vh-3.5rem)] flex-col
              border-r border-yellow-500/20
              bg-richblack-800/90 backdrop-blur-xl
              py-6 shadow-xl
            `}
          >

            {/* 🔥 TOP BAR */}
            <div className="flex items-center justify-between px-4 mb-6">

              {/* TOGGLE BUTTON */}
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="text-white"
              >
                <VscMenu size={22} />
              </button>

              {/* CLOSE (MOBILE) */}
              <button
                onClick={() => setMobileOpen(false)}
                className="md:hidden text-white"
              >
                ✕
              </button>

              {/* ICON */}
              {!collapsed && <FiMoon className="text-yellow-50 hidden md:block" />}

            </div>

            {/* 🔥 USER */}
            {!collapsed && (
              <div className="flex items-center gap-3 px-5 mb-8">
                <img
                  src={user?.image}
                  alt="user"
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div className="min-w-0">
                  <p className="text-white text-sm font-semibold truncate">
                    {user.firstName}
                  </p>
                  <p className="text-xs text-richblack-300 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            )}

            {/* 🔥 LINKS */}
            <div className="flex flex-col gap-2 px-3">

              {sidebarLinks.map((link) => {
                if (link.type && user?.accountType !== link.type) return null

                return (
                  <SidebarLink
                    key={link.id}
                    link={link}
                    iconName={link.icon}
                    collapsed={collapsed}
                    badgeCount={link.name === "Enrolled Courses" ? enrolledCourseCount : undefined}
                  />
                )
              })}

            </div>

            {/* 🔥 DIVIDER */}
            <div className="mx-auto my-6 h-[1px] w-10/12 bg-richblack-700" />

            {/* 🔥 SETTINGS + LOGOUT */}
            <div className="flex flex-col gap-2 px-3 mt-auto">

              <SidebarLink
                link={{ name: "Settings", path: "/dashboard/settings" }}
                iconName="VscSettingsGear"
                collapsed={collapsed}
              />

              <button
                onClick={() =>
                  setConfirmationModal({
                    text1: "Are you sure?",
                    text2: "You will be logged out of your account.",
                    btn1Text: "Logout",
                    btn2Text: "Cancel",
                    btn1Handler: () => dispatch(logout(navigate)),
                    btn2Handler: () => setConfirmationModal(null),
                  })
                }
                className="flex items-center gap-x-3 px-4 py-3 text-sm text-richblack-300 hover:text-red-400"
              >
                <VscSignOut />
                {!collapsed && <span>Logout</span>}
              </button>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {confirmationModal && (
        <ConfirmationModal modalData={confirmationModal} />
      )}
    </>
  )
}