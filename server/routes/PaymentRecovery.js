const express = require("express")
const router = express.Router()

const {
  recordFailedPayment,
  recordRecoveryResult,
  getRecoveryAnalytics,
} = require("../controllers/PaymentRecovery")

router.post("/failed-payment", recordFailedPayment)
router.post("/recovery-result", recordRecoveryResult)
router.get("/analytics", getRecoveryAnalytics)

module.exports = router
