const ALLOWED_ACTIONS = ["retry_now", "retry_later", "send_upi_link", "send_reminder", "do_nothing"]

const validateRecoveryAction = (action) => {
  return ALLOWED_ACTIONS.includes(action) ? action : "do_nothing"
}

const getBaselineAction = () => {
  return "send_reminder"
}

module.exports = { ALLOWED_ACTIONS, validateRecoveryAction, getBaselineAction }
