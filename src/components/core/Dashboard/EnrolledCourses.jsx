import { useEffect, useState } from "react"
import ProgressBar from "@ramonak/react-progress-bar"
import { useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"

import { getUserEnrolledCourses } from "../../../services/operations/profileAPI"

export default function EnrolledCourses() {
  const { token } = useSelector((state) => state.auth)
  const navigate = useNavigate()

  const [enrolledCourses, setEnrolledCourses] = useState(null)

  useEffect(() => {
    const getEnrolledCourses = async () => {
      try {
        const res = await getUserEnrolledCourses(token)
        setEnrolledCourses(Array.isArray(res) ? res : [])
      } catch (error) {
        console.log("Could not fetch enrolled courses.", error)
        setEnrolledCourses([])
      }
    }

    getEnrolledCourses()
  }, [token])

  if (!enrolledCourses) {
    return (
      <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <section className="w-full text-richblack-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-richblack-50">Enrolled Courses</h1>
          <p className="mt-1 text-sm text-richblack-300">
            {enrolledCourses.length} {enrolledCourses.length === 1 ? "course" : "courses"} currently enrolled
          </p>
        </div>
      </div>

      {!enrolledCourses.length ? (
        <div className="mt-8 rounded-xl border border-richblack-700 bg-richblack-800 px-6 py-12 text-center">
          <p className="text-richblack-100">You have not enrolled in any course yet.</p>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-xl border border-richblack-700 bg-richblack-800">
          <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(110px,0.45fr)_minmax(180px,0.7fr)] gap-6 border-b border-richblack-700 bg-richblack-700/70 px-6 py-4 text-sm font-semibold text-richblack-100 md:grid">
            <p>Course Name</p>
            <p>Duration</p>
            <p>Progress</p>
          </div>

          <div>
            {enrolledCourses.map((course, index) => {
              const progress = Number(course?.progressPercentage) || 0
              const firstSection = course?.courseContent?.[0]
              const firstSubSection = firstSection?.subSection?.[0]
              const canOpenCourse = firstSection?._id && firstSubSection?._id

              return (
                <article
                  key={course?._id || index}
                  className={`grid gap-5 px-5 py-5 md:grid-cols-[minmax(0,1.5fr)_minmax(110px,0.45fr)_minmax(180px,0.7fr)] md:items-center md:px-6 ${
                    index !== enrolledCourses.length - 1
                      ? "border-b border-richblack-700"
                      : ""
                  }`}
                >
                  <button
                    type="button"
                    disabled={!canOpenCourse}
                    onClick={() => {
                      if (canOpenCourse) {
                        navigate(
                          `/view-course/${course._id}/section/${firstSection._id}/sub-section/${firstSubSection._id}`
                        )
                      }
                    }}
                    className="flex min-w-0 items-center gap-4 text-left disabled:cursor-default"
                  >
                    <img
                      src={course?.thumbnail}
                      alt={course?.courseName || "Course thumbnail"}
                      className="h-16 w-16 shrink-0 rounded-lg object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-richblack-5">
                        {course?.courseName}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-richblack-300">
                        {course?.courseDescription || "No course description available."}
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center gap-2 text-sm text-richblack-200 md:block">
                    <span className="text-richblack-400 md:hidden">Duration:</span>
                    <span>{course?.totalDuration || "—"}</span>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="text-richblack-300">Progress</span>
                      <span className="font-medium text-richblack-50">{progress}%</span>
                    </div>
                    <ProgressBar
                      completed={Math.min(100, Math.max(0, progress))}
                      height="8px"
                      isLabelVisible={false}
                      borderRadius="999px"
                    />
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
