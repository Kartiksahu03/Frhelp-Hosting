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

const { RECORD_FAILED_PAYMENT_API } = paymentRecoveryEndpoints;

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
    const config = localStorage.getItem("paymentExperimentConfig");

    if (!config) {
      return null;
    }

    return JSON.parse(config);
  } catch (error) {
    console.log("PAYMENT EXPERIMENT CONFIG ERROR:", error);
    return null;
  }
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
        amount: orderData.amount,
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

export async function buyCourse(token, courses, userDetails, navigate, dispatch) {
  const toastId = toast.loading("Loading...");
  try {
    const res = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
    if (!res) {
      toast.error("Razorpay SDK failed to load");
      return;
    }

    // 🔥 NO AUTH HEADER HERE (interceptor handles it)
    const orderResponse = await apiConnector(
      "POST",
      COURSE_PAYMENT_API,
      { courses }
    );

    if (!orderResponse.data.success) {
      throw new Error(orderResponse.data.message);
    }

    const options = {
      key: process.env.REACT_APP_RAZORPAY_KEY,
      currency: orderResponse.data.data.currency,
      amount: `${orderResponse.data.data.amount}`,
      order_id: orderResponse.data.data.id,
      name: "FrHelp",
      description: "Thank you for purchasing the course",
      image: rzpLogo,
      prefill: {
        name: userDetails.firstName,
        email: userDetails.email,
      },
      handler: function (response) {
        sendPaymentSuccessEmail(response, orderResponse.data.data.amount);
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
        orderResponse.data.data,
        userDetails
      );

      if (recoveryDecision) {
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
