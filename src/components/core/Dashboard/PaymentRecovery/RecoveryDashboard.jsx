import { useEffect, useState } from "react"
import { paymentRecoveryEndpoints } from "../../../../services/apis"
import { apiConnector } from "../../../../services/apiconnector"

const DEFAULT_EXPERIMENT_ID = "comparison-demo-001"

function MetricCard({ title, baseline, ai, difference }) {
  return (
    <div className="rounded-xl border border-richblack-700 bg-richblack-800 p-5">
      <p className="text-sm text-richblack-300">{title}</p>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-richblack-400">Baseline</p>
          <p className="mt-1 text-xl font-semibold text-white">{baseline}</p>
        </div>
        <div>
          <p className="text-xs text-richblack-400">AI Strategy</p>
          <p className="mt-1 text-xl font-semibold text-yellow-50">{ai}</p>
        </div>
      </div>
      {difference !== undefined && (
        <p className="mt-4 border-t border-richblack-700 pt-3 text-sm text-richblack-200">
          Difference: <span className="font-semibold text-white">{difference}</span>
        </p>
      )}
    </div>
  )
}

function RecoveryDashboard() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const getAnalytics = async () => {
      try {
        const response = await apiConnector(
          "GET",
          `${paymentRecoveryEndpoints.GET_RECOVERY_ANALYTICS_API}?experimentId=${encodeURIComponent(DEFAULT_EXPERIMENT_ID)}`
        )

        if (!response.data.success) {
          throw new Error(response.data.message)
        }

        setAnalytics(response.data.data)
      } catch (error) {
        console.log("RECOVERY DASHBOARD ERROR:", error)
        setError("Could not load recovery analytics")
      }

      setLoading(false)
    }

    getAnalytics()
  }, [])

  if (loading) {
    return <div className="mt-10 text-white">Loading recovery analytics...</div>
  }

  if (error) {
    return <div className="mt-10 text-red-400">{error}</div>
  }

  const baseline = analytics?.baseline || {}
  const ai = analytics?.ai || {}

  const formatAmount = (amount) => `₹${Number(amount || 0).toFixed(2)}`
  const formatPercent = (amount) => `${Number(amount || 0).toFixed(2)}%`

  return (
    <div className="space-y-6 text-white">
      <div>
        <h1 className="text-3xl font-semibold">Payment Recovery Analytics</h1>
        <p className="mt-2 text-richblack-300">
          Experiment: <span className="font-medium text-white">{DEFAULT_EXPERIMENT_ID}</span>. Results are calculated only from records belonging to this experiment.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <MetricCard
          title="Failed Payments"
          baseline={baseline.totalFailedPayments || 0}
          ai={ai.totalFailedPayments || 0}
        />
        <MetricCard
          title="Recovery Attempts"
          baseline={baseline.recoveryAttempts || 0}
          ai={ai.recoveryAttempts || 0}
        />
        <MetricCard
          title="Successful Recoveries"
          baseline={baseline.successfulRecoveries || 0}
          ai={ai.successfulRecoveries || 0}
        />
        <MetricCard
          title="Recovery Rate"
          baseline={formatPercent(baseline.recoveryRate)}
          ai={formatPercent(ai.recoveryRate)}
          difference={formatPercent((ai.recoveryRate || 0) - (baseline.recoveryRate || 0))}
        />
        <MetricCard
          title="Recovered Amount"
          baseline={formatAmount(baseline.recoveredAmount)}
          ai={formatAmount(ai.recoveredAmount)}
          difference={formatAmount(analytics?.incrementalRecoveredRevenue)}
        />
      </div>

      <div className="rounded-xl border border-yellow-500/30 bg-richblack-800 p-6">
        <p className="text-sm text-richblack-300">Incremental Recovered Revenue</p>
        <p className="mt-2 text-4xl font-bold text-white">
          {formatAmount(analytics?.incrementalRecoveredRevenue)}
        </p>
        <p className="mt-2 text-sm text-richblack-300">
          AI recovered amount minus baseline recovered amount.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-richblack-700 bg-richblack-800">
        <div className="p-5">
          <h2 className="text-xl font-semibold">Decision Log</h2>
          <p className="mt-1 text-sm text-richblack-300">
            Every row comes from the payment experiment records.
          </p>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <colgroup>
              <col className="w-[10%]" />
              <col className="w-[14%]" />
              <col className="w-[21%]" />
              <col className="w-[26%]" />
              <col className="w-[16%]" />
              <col className="w-[13%]" />
            </colgroup>

            <thead className="border-t border-richblack-700 text-richblack-300">
              <tr>
                <th className="px-3 py-3 font-semibold sm:px-4">Strategy</th>
                <th className="px-3 py-3 font-semibold sm:px-4">Scenario</th>
                <th className="px-3 py-3 font-semibold sm:px-4">Error Code</th>
                <th className="px-3 py-3 font-semibold sm:px-4">Error Reason</th>
                <th className="px-3 py-3 font-semibold sm:px-4">Action</th>
                <th className="px-3 py-3 font-semibold sm:px-4">Status</th>
              </tr>
            </thead>

            <tbody>
              {(analytics?.records || []).map((record) => (
                <tr
                  key={`${record.experimentId}-${record.paymentId}`}
                  className="border-t border-richblack-700 align-top"
                >
                  <td className="break-words px-3 py-4 sm:px-4">{record.strategy}</td>
                  <td className="break-all px-3 py-4 sm:px-4">{record.scenarioId}</td>
                  <td className="break-all px-3 py-4 sm:px-4">{record.error_code}</td>
                  <td className="break-all px-3 py-4 sm:px-4">{record.error_reason}</td>
                  <td className="break-words px-3 py-4 font-medium text-yellow-50 sm:px-4">
                    {record.chosenAction}
                  </td>
                  <td className="break-all px-3 py-4 sm:px-4">{record.recoveryStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default RecoveryDashboard
