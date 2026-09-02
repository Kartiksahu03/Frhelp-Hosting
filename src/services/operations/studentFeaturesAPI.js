import { toast } from "react-hot-toast";
import { studentEndpoints, paymentRecoveryEndpoints } from "../apis";
import { apiConnector } from "../apiconnector";
import rzpLogo from "../../assets/Logo/rzp_logo.png";
import { setPaymentLoading } from "../../slices/courseSlice";
import { resetCart } from "../../slices/cartSlice";

const {
  COURSE_PAYMENT_API,
  COURSE_VERIFY_API,
  SEND_PAYMENT_SUCCESS_EMAIL_API,
} = studentEndpoints;

const {
  RECORD_FAILED_PAYMENT_API,
  RECORD_RECOVERY_RESULT_API,
} = paymentRecoveryEndpoints;

const PAYMENT_EXPERIMENT_CONFIG_KEY = "paymentExperimentConfig";
const PENDING_RECOVERY_KEY = "pendingPaymentRecovery";

function loadScript(src) {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function getPaymentExperimentConfig() {
  try {
    const config = localStorage.getItem(PAYMENT_EXPERIMENT_CONFIG_KEY);

    if (!config) {
      return null;
    }

    return JSON.parse(config);
  } catch (error) {
    console.log("PAYMENT EXPERIMENT CONFIG ERROR:", error);
    return null;
  }
}

function getPendingRecovery() {
  try {
    const pendingRecovery = localStorage.getItem(PENDING_RECOVERY_KEY);

    if (!pendingRecovery) {
      return null;
    }

    return JSON.parse(pendingRecovery);
  } catch (error) {
    console.log("PENDING PAYMENT RECOVERY ERROR:", error);
    localStorage.removeItem(PENDING_RECOVERY_KEY);
    return null;
  }
}

function savePendingRecovery(recoveryRecord) {
  if (!recoveryRecord?.experimentId || !recoveryRecord?.paymentId) {
    return;
  }

  localStorage.setItem(
    PENDING_RECOVERY_KEY,
    JSON.stringify({
      experimentId: recoveryRecord.experimentId,
      paymentId: recoveryRecord.paymentId,
      amount: recoveryRecord.amount || 0,
      createdAt: Date.now(),
    })
  );
}

function clearPendingRecovery() {
  localStorage.removeItem(PENDING_RECOVERY_KEY);
}

function getAmountInRupees(amountInPaise) {
  return Number((Number(amountInPaise || 0) / 100).toFixed(2));
}

async function recordFailedPayment(response, orderData, userDetails) {
  try {
    const experimentConfig = getPaymentExperimentConfig();

    // Normal FrHelp payments should continue without experiment tracking
    if (!experimentConfig) {
      return null;
    }

    const error = response?.error;

    if (!error?.code || !error?.reason) {
      console.log("RAZORPAY FAILURE DATA MISSING:", response);
      return null;
    }

    const recoveryResponse = await apiConnector(
      "POST",
      RECORD_FAILED_PAYMENT_API,
      {
        experimentId: experimentConfig.experimentId,
        strategy: experimentConfig.strategy,
        scenarioId: experimentConfig.scenarioId,
        amount: getAmountInRupees(orderData.amount),
        currency: orderData.currency,
        customerName: `${userDetails?.firstName || ""} ${userDetails?.lastName || ""}`.trim(),
        customerEmail: userDetails?.email || "",
        orderId: error.metadata?.order_id || orderData.id,
        paymentId: error.metadata?.payment_id || "",
        error: {
          code: error.code,
          description: error.description,
          source: error.source,
          step: error.step,
          reason: error.reason,
        },
      }
    );

    return recoveryResponse.data?.data || null;
  } catch (error) {
    console.log("FAILED PAYMENT TRACKING ERROR:", error);
    return null;
  }
}

async function recordSuccessfulRecovery(response, orderData) {
  try {
    const experimentConfig = getPaymentExperimentConfig();
    const pendingRecovery = getPendingRecovery();

    if (!experimentConfig || !pendingRecovery) {
      return null;
    }

    // Prevent a later normal payment from being attached to an old experiment.
    if (pendingRecovery.experimentId !== experimentConfig.experimentId) {
      return null;
    }

    const recoveryResponse = await apiConnector(
      "POST",
      RECORD_RECOVERY_RESULT_API,
      {
        experimentId: pendingRecovery.experimentId,
        paymentId: pendingRecovery.paymentId,
        recoveryPaymentId: response.razorpay_payment_id,
        recoveryStatus: "recovered",
        recoveredAmount: getAmountInRupees(orderData.amount),
      }
    );

    if (recoveryResponse.data?.success) {
      clearPendingRecovery();
    }

    return recoveryResponse.data?.data || null;
  } catch (error) {
    console.log("SUCCESSFUL RECOVERY TRACKING ERROR:", error);
    return null;
  }
}

export async function buyCourse(token, courses, userDetails, navigate, dispatch) {
  const toastId = toast.loading("Loading...");
  try {
    const res = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
    if (!res) {
      toast.error("Razorpay SDK failed to load");
      return;
    }

    const orderResponse = await apiConnector(
      "POST",
      COURSE_PAYMENT_API,
      { courses }
    );

    if (!orderResponse.data.success) {
      throw new Error(orderResponse.data.message);
    }

    const orderData = orderResponse.data.data;

    const options = {
      key: process.env.REACT_APP_RAZORPAY_KEY,
      currency: orderData.currency,
      amount: `${orderData.amount}`,
      order_id: orderData.id,
      name: "FrHelp",
      description: "Thank you for purchasing the course",
      image: rzpLogo,
      prefill: {
        name: userDetails.firstName,
        email: userDetails.email,
      },
      handler: async function (response) {
        await sendPaymentSuccessEmail(response, orderData.amount);

        const recoveredRecord = await recordSuccessfulRecovery(
          response,
          orderData
        );

        if (recoveredRecord) {
          console.log("PAYMENT RECOVERY COMPLETED:", {
            experimentId: recoveredRecord.experimentId,
            originalPaymentId: recoveredRecord.paymentId,
            recoveryPaymentId: recoveredRecord.recoveryPaymentId,
            recoveredAmount: recoveredRecord.recoveredAmount,
          });
        }

        verifyPayment(
          { ...response, courses },
          navigate,
          dispatch
        );
      },
    };

    const paymentObject = new window.Razorpay(options);
    paymentObject.open();

    paymentObject.on("payment.failed", async function (response) {
      console.log("RAZORPAY PAYMENT FAILED:", response);

      const recoveryDecision = await recordFailedPayment(
        response,
        orderData,
        userDetails
      );

      if (recoveryDecision) {
        savePendingRecovery(recoveryDecision);

        console.log("PAYMENT RECOVERY DECISION:", {
          action: recoveryDecision.chosenAction,
          executionStatus: recoveryDecision.executionStatus,
          executionNote: recoveryDecision.executionNote,
        });
      }

      toast.error("Payment failed");
    });

  } catch (error) {
    console.log("PAYMENT API ERROR:", error);
    toast.error("Could not make payment");
  }
  toast.dismiss(toastId);
}

async function sendPaymentSuccessEmail(response, amount) {
  try {
    await apiConnector("POST", SEND_PAYMENT_SUCCESS_EMAIL_API, {
      orderId: response.razorpay_order_id,
      paymentId: response.razorpay_payment_id,
      amount,
    });
  } catch (error) {
    console.log("EMAIL ERROR:", error);
  }
}

async function verifyPayment(bodyData, navigate, dispatch) {
  const toastId = toast.loading("Verifying payment...")
  dispatch(setPaymentLoading(true))

  try {
    const response = await apiConnector(
      "POST",
      COURSE_VERIFY_API,
      bodyData
    )

    console.log("VERIFY RESPONSE:", response)

    if (!response.data.success) {
      throw new Error(response.data.message)
    }

    toast.success("Payment successful 🎉")

    dispatch(resetCart())

    window.location.href = "/dashboard/enrolled-courses"

  } catch (error) {
    console.log("VERIFY ERROR:", error)
    toast.error("Payment verification failed")
  }

  toast.dismiss(toastId)
  dispatch(setPaymentLoading(false))
}
