const express = require("express")
const router = express.Router()

const {
  recordFailedPayment,
  recordRecoveryResult,
  getRecoveryAnalytics,
} = require("../controllers/PaymentRecovery")

const { auth, isInstructor } = require("../middlewares/auth")

router.post("/failed-payment", auth, recordFailedPayment)
router.post("/recovery-result", auth, recordRecoveryResult)
router.get("/analytics", auth, isInstructor, getRecoveryAnalytics)

module.exports = router
