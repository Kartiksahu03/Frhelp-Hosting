import { toast } from "react-hot-toast"

import { setLoading, setToken } from "../../slices/authSlice"
import { resetCart } from "../../slices/cartSlice"
import { setUser } from "../../slices/profileSlice"
import { apiConnector } from "../apiconnector"
import { endpoints } from "../apis"

const {
  SENDOTP_API,
  SIGNUP_API,
  LOGIN_API,
  RESETPASSTOKEN_API,
  RESETPASSWORD_API,
} = endpoints

export function sendOtp(email, navigate) {
  return async (dispatch) => {
    const toastId = toast.loading("Sending Email...")
    dispatch(setLoading(true))

    try {
      const response = await apiConnector("POST", SENDOTP_API, {
        email,
        checkUserPresent: true,
      })

      if (!response.data.success) {
        throw new Error(response.data.message)
      }

      const otp = response.data.otp

      toast.custom((t) => (
        <div className={`${t.visible ? "animate-enter" : "animate-leave"} max-w-md w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-2xl rounded-xl pointer-events-auto flex flex-col p-5 text-white`}>
          <div className="flex justify-between items-center">
            <p className="text-sm font-semibold opacity-80">🔐 OTP Verification</p>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-2xl font-bold tracking-widest">{otp}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(otp)
                toast.success("OTP Copied ✅")
              }}
              className="bg-white text-purple-600 px-3 py-1 rounded-md text-sm font-semibold hover:bg-gray-200 transition"
            >
              Copy
            </button>
          </div>
          <p className="text-xs mt-2 opacity-80">Valid for a few minutes. Do not share.</p>
        </div>
      ), { duration: 15000 })

      navigate("/verify-email")
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to send email")
    }

    dispatch(setLoading(false))
    toast.dismiss(toastId)
  }
}

export function signUp(accountType, firstName, lastName, email, password, confirmPassword, otp, navigate) {
  return async (dispatch) => {
    const toastId = toast.loading("Creating Account...")
    dispatch(setLoading(true))

    try {
      const response = await apiConnector("POST", SIGNUP_API, {
        accountType, firstName, lastName, email, password, confirmPassword, otp,
      })

      if (!response.data.success) throw new Error(response.data.message)

      toast.success("Signup Successful 🎉")
      navigate("/login")
    } catch (error) {
      toast.error(error?.response?.data?.message || "Signup Failed")
      navigate("/signup")
    }

    dispatch(setLoading(false))
    toast.dismiss(toastId)
  }
}

export function login(email, password, navigate) {
  return async (dispatch) => {
    const toastId = toast.loading("Logging in...")
    dispatch(setLoading(true))

    try {
      const response = await apiConnector("POST", LOGIN_API, { email, password })

      if (!response.data.success) throw new Error(response.data.message)

      toast.success("Login Successful")

      const token = response.data.token
      dispatch(setToken(token))
      localStorage.setItem("token", token)

      const userImage = response.data?.user?.image
        ? response.data.user.image
        : `https://api.dicebear.com/5.x/initials/svg?seed=${response.data.user.firstName} ${response.data.user.lastName}`

      dispatch(setUser({ ...response.data.user, image: userImage }))
      localStorage.setItem("user", JSON.stringify(response.data.user))

      navigate("/dashboard/my-profile")
    } catch (error) {
      toast.error(error?.response?.data?.message || "Login Failed")
    }

    dispatch(setLoading(false))
    toast.dismiss(toastId)
  }
}

export function logout(navigate) {
  return (dispatch) => {
    dispatch(setToken(null))
    dispatch(setUser(null))
    dispatch(resetCart())

    localStorage.removeItem("token")
    localStorage.removeItem("user")

    toast.success("Logged Out")
    navigate("/")
  }
}

export function getPasswordResetToken(email, setEmailSent) {
  return async (dispatch) => {
    dispatch(setLoading(true))
    const toastId = toast.loading("Sending reset email...")

    try {
      const response = await apiConnector("POST", RESETPASSTOKEN_API, { email })

      if (!response.data.success) {
        throw new Error(response.data.message)
      }

      setEmailSent(true)
      toast.success("Reset link sent to your email")
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to send reset email")
    }

    dispatch(setLoading(false))
    toast.dismiss(toastId)
  }
}

export function resetPassword(password, confirmPassword, token, navigate) {
  return async (dispatch) => {
    dispatch(setLoading(true))
    const toastId = toast.loading("Resetting password...")

    try {
      const response = await apiConnector("POST", RESETPASSWORD_API, {
        password,
        confirmPassword,
        token,
      })

      if (!response.data.success) {
        throw new Error(response.data.message)
      }

      toast.success("Password reset successful")
      navigate("/login")
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to reset password")
    }

    dispatch(setLoading(false))
    toast.dismiss(toastId)
  }
}