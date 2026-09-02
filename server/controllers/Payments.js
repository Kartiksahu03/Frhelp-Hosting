// const { instance } = require("../config/razorpay");
// const Course = require("../models/Course");
// const User = require("../models/User");
// const mailSender = require("../utils/mailSender");
// const { courseEnrollmentEmail } = require("../mail/templates/courseEnrollmentEmail");
// const mongoose = require("mongoose");

// // capture the payment and initiate the Razorpay order
// exports.capturePayment = async (req, res) => {
//     // get courseId and UserID
//     const { course_id } = req.body;
//     const userId = req.user.id;

//     // validation
//     if (!course_id) {
//         return res.json({ 
//         success: false,
//         message: "Please provide valid course ID",
//         });
//     }

//     let course;

//     try {
//         course = await Course.findById(course_id);

//         if (!course) {
//         return res.json({
//             success: false,
//             message: "Could not find the course",
//         });
//         }

//         // user already paid for the same course
//         const uid = new mongoose.Types.ObjectId(userId);

//         const isAlreadyEnrolled = course.studentsEnrolled.some(function (id) {
//         return id.equals(uid);
//         });

//         if (isAlreadyEnrolled) {
//         return res.status(200).json({
//             success: false,
//             message: "Student is already enrolled",
//         });
//         }

//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({
//         success: false,
//         message: error.message,
//         });
//     }

//     // order create
//     const amount = course.price;
//     const currency = "INR";

//     const options = {
//         amount: amount * 100,
//         currency: currency,
//         receipt: Math.random().toString(),
//         notes: {
//         courseId: course_id,
//         userId: userId,
//         },
//     };

//     try {
//         // initiate the payment using razorpay
//         const paymentResponse = await instance.orders.create(options);

//         return res.status(200).json({
//         success: true,
//         courseName: course.courseName,
//         courseDescription: course.courseDescription,
//         thumbnail: course.thumbnail,
//         orderId: paymentResponse.id,
//         currency: paymentResponse.currency,
//         amount: paymentResponse.amount,
//         });
//     } catch (error) {
//         console.error(error);
//         return res.json({
//         success: false,
//         message: "Could not initiate order",
//         });
//     }
// };

// // verify signature of razorpay and server

// exports.verifySignature = async (req, res) => {
    
//     const webhookSecret = "12345678";
//     // when razorpay hit webhook header ke andar yeh signatue key pass kiya hai
//     const signature = req.header["x-razorpay-signature"];

//     const shasum = crypto.createHmac("sha256", webhookSecret);
//     shasum.update(JSON.stringify(req.body));
//     const digest = shasum.digest("hex");


//     if(signature === digest ) {
//         console.log("Payment is authorized")

//         const {courseId, userId} = req.body.payload.entity.notes;

//         try {
//             // find course and enroll the student in it

//             const enrolledCourse = Course.findOneAndUpdate(
//                                         {_id:courseId},
//                                         {
//                                             $push: {
//                                                 studentsEnrolled:userId,
//                                             }
//                                         },
//                                         {new:true},
//             )

//             if(!enrolledCourse) {
//                     return res.status(500).json({
//                         success:false,
//                         message:'Course not Found',
//                     });
//                 }

//                 console.log(enrolledCourse);

//                 //find the student andadd the course to their list enrolled courses me 
//                 const enrolledStudent = await User.findOneAndUpdate(
//                                                 {_id:userId},
//                                                 {$push:{courses:courseId}},
//                                                 {new:true},
//                 );

//                 console.log(enrolledStudent);

//                 //mail send krdo confirmation wala 
//                 const emailResponse = await mailSender(
//                                         enrolledStudent.email,
//                                         "Congratulations from CodeHelp",
//                                         "Congratulations, you are onboarded into new CodeHelp Course",
//                 );

//                 console.log(emailResponse);
//                 return res.status(200).json({
//                     success:true,
//                     message:"Signature Verified and COurse Added",
//                 });
//         } catch (error) {
//             return res.status(500).json({
//                         success:false,
//                         message:'Course not Found',
//                     });
//         }
//     }
// }
// const {instance} = require("../config/razorpay");
// const Course = require("../models/Course");
// const User = require("../models/User");
// const mailSender = require("../utils/mailSender");
// const {courseEnrollmentEmail} = require("../mail/templates/courseEnrollmentEmail");
// const { default: mongoose } = require("mongoose");
// const { paymentSuccessEmail } = require("../mail/templates/paymentSuccessEmail");
// const crypto = require("crypto");

// //initiate the razorpay order
// exports.capturePayment = async(req, res) => {

//     const {courses} = req.body;
//     const userId = req.user.id;

//     if(courses.length === 0) {
//         return res.json({success:false, message:"Please provide Course Id"});
//     }

//     let totalAmount = 0;

//     for(const course_id of courses) {
//         let course;
//         try{
           
//             course = await Course.findById(course_id);
//             if(!course) {
//                 return res.status(200).json({success:false, message:"Could not find the course"});
//             }

//             const uid  = new mongoose.Types.ObjectId(userId);
//             if(course.studentsEnrolled.includes(uid)) {
//                 return res.status(200).json({success:false, message:"Student is already Enrolled"});
//             }

//             totalAmount += course.price;
//         }
//         catch(error) {
//             console.log(error);
//             return res.status(500).json({success:false, message:error.message});
//         }
//     }
//     const currency = "INR";
//     const options = {
//         amount: totalAmount * 100,
//         currency,
//         receipt: Math.random(Date.now()).toString(),
//     }

//     try{
//         const paymentResponse = await instance.orders.create(options);
//         res.json({
//             success:true,
//             message:paymentResponse,
//         })
//     }
//     catch(error) {
//         console.log(error);
//         return res.status(500).json({success:false, mesage:"Could not Initiate Order"});
//     }

// }


// //verify the payment
// exports.verifyPayment = async(req, res) => {
//     const razorpay_order_id = req.body?.razorpay_order_id;
//     const razorpay_payment_id = req.body?.razorpay_payment_id;
//     const razorpay_signature = req.body?.razorpay_signature;
//     const courses = req.body?.courses;
//     const userId = req.user.id;

//     if(!razorpay_order_id ||
//         !razorpay_payment_id ||
//         !razorpay_signature || !courses || !userId) {
//             return res.status(200).json({success:false, message:"Payment Failed"});
//     }

//     let body = razorpay_order_id + "|" + razorpay_payment_id;
//     const expectedSignature = crypto
//         .createHmac("sha256", process.env.RAZORPAY_SECRET)
//         .update(body.toString())
//         .digest("hex");

//         if(expectedSignature === razorpay_signature) {
//             //enroll karwao student ko
//             await enrollStudents(courses, userId, res);
//             //return res
//             return res.status(200).json({success:true, message:"Payment Verified"});
//         }
//         return res.status(200).json({success:"false", message:"Payment Failed"});

// }


// const enrollStudents = async(courses, userId, res) => {

//     if(!courses || !userId) {
//         return res.status(400).json({success:false,message:"Please Provide data for Courses or UserId"});
//     }

//     for(const courseId of courses) {
//         try{
//             //find the course and enroll the student in it
//         const enrolledCourse = await Course.findOneAndUpdate(
//             {_id:courseId},
//             {$push:{studentsEnrolled:userId}},
//             {new:true},
//         )

//         if(!enrolledCourse) {
//             return res.status(500).json({success:false,message:"Course not Found"});
//         }

//         const courseProgress = await CourseProgress.create({
//             courseID:courseId,
//             userId:userId,
//             completedVideos: [],
//         })

//         //find the student and add the course to their list of enrolledCOurses
//         const enrolledStudent = await User.findByIdAndUpdate(userId,
//             {$push:{
//                 courses: courseId,
//                 courseProgress: courseProgress._id,
//             }},{new:true})
            
//         ///bachhe ko mail send kardo
//         const emailResponse = await mailSender(
//             enrollStudents.email,
//             `Successfully Enrolled into ${enrolledCourse.courseName}`,
//             courseEnrollmentEmail(enrolledCourse.courseName, `${enrolledStudent.firstName}`)
//         )    
//         //console.log("Email Sent Successfully", emailResponse.response);
//         }
//         catch(error) {
//             console.log(error);
//             return res.status(500).json({success:false, message:error.message});
//         }
//     }

// }

// exports.sendPaymentSuccessEmail = async(req, res) => {
//     const {orderId, paymentId, amount} = req.body;

//     const userId = req.user.id;

//     if(!orderId || !paymentId || !amount || !userId) {
//         return res.status(400).json({success:false, message:"Please provide all the fields"});
//     }

//     try{
//         //student ko dhundo
//         const enrolledStudent = await User.findById(userId);
//         await mailSender(
//             enrolledStudent.email,
//             `Payment Recieved`,
//              paymentSuccessEmail(`${enrolledStudent.firstName}`,
//              amount/100,orderId, paymentId)
//         )
//     }
//     catch(error) {
//         console.log("error in sending mail", error)
//         return res.status(500).json({success:false, message:"Could not send email"})
//     }
// }

const { instance } = require("../config/razorpay")
const Course = require("../models/Course")
const User = require("../models/User")
const CourseProgress = require("../models/CourseProgress")
const mailSender = require("../utils/mailSender")
const { courseEnrollmentEmail } = require("../mail/templates/courseEnrollmentEmail")
const { paymentSuccessEmail } = require("../mail/templates/paymentSuccessEmail")
const { default: mongoose } = require("mongoose")
const crypto = require("crypto")

// ===============================
// CAPTURE PAYMENT
// ===============================
exports.capturePayment = async (req, res) => {
  try {
    const { courses } = req.body
    const userId = req.user.id

    if (!Array.isArray(courses) || courses.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please add at least one course to the cart",
      })
    }

    let totalAmount = 0
    const payableCourses = []

    for (const courseId of courses) {
      const course = await Course.findById(courseId)

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "One of the selected courses was not found",
        })
      }

      // Ignore courses already purchased by this student instead of blocking
      // the entire checkout when an old item remains in the cart.
      const alreadyEnrolled = course.studentsEnrolled.some(
        (studentId) => studentId.toString() === userId.toString()
      )

      if (alreadyEnrolled) {
        continue
      }

      const price = Number(course.price)
      if (!Number.isFinite(price) || price <= 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid price for course: ${course.courseName}`,
        })
      }

      totalAmount += price
      payableCourses.push(courseId)
    }

    if (payableCourses.length === 0) {
      return res.status(400).json({
        success: false,
        message: "All courses in your cart are already enrolled",
      })
    }

    const options = {
      amount: Math.round(totalAmount * 100),
      currency: "INR",
      receipt: `receipt_${Date.now()}`.slice(0, 40),
      notes: {
        userId: userId.toString(),
        courses: payableCourses.join(","),
      },
    }

    const paymentResponse = await instance.orders.create(options)

    return res.status(200).json({
      success: true,
      data: {
        ...paymentResponse,
        courses: payableCourses,
      },
    })
  } catch (error) {
    console.error("CAPTURE PAYMENT ERROR:", error)
    return res.status(500).json({
      success: false,
      message: error?.error?.description || error.message || "Could not initiate order",
    })
  }
}

// ===============================
// VERIFY PAYMENT
// ===============================
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      courses,
    } = req.body

    const userId = req.user.id

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !courses ||
      !userId
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment data missing",
      })
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(body.toString())
      .digest("hex")

    // ❌ if signature mismatch
    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      })
    }

    // ✅ enroll user
    await enrollStudents(courses, userId)

    return res.status(200).json({
      success: true,
      message: "Payment verified & user enrolled",
    })

  } catch (error) {
    console.error(error)
    return res.status(500).json({
      success: false,
      message: "Payment verification error",
    })
  }
}

// ===============================
// ENROLL STUDENTS
// ===============================
const enrollStudents = async (courses, userId) => {
  if (!courses || !userId) return

  for (const courseId of courses) {
    try {
      // add user to course
      const enrolledCourse = await Course.findByIdAndUpdate(
        courseId,
        { $addToSet: { studentsEnrolled: userId } },
        { new: true }
      )

      if (!enrolledCourse) continue

      // create course progress
      const courseProgress = await CourseProgress.create({
        courseID: courseId,
        userId: userId,
        completedVideos: [],
      })

      // add course to user
      const enrolledStudent = await User.findByIdAndUpdate(
        userId,
        {
          $addToSet: {
            courses: courseId,
            courseProgress: courseProgress._id,
          },
        },
        { new: true }
      )

      // send email
      await mailSender(
        enrolledStudent.email,
        `Successfully Enrolled into ${enrolledCourse.courseName}`,
        courseEnrollmentEmail(
          enrolledCourse.courseName,
          enrolledStudent.firstName
        )
      )

    } catch (error) {
      console.log("Enrollment Error:", error)
    }
  }
}

// ===============================
// SEND PAYMENT SUCCESS EMAIL
// ===============================
exports.sendPaymentSuccessEmail = async (req, res) => {
  try {
    const { orderId, paymentId, amount } = req.body
    const userId = req.user.id

    if (!orderId || !paymentId || !amount || !userId) {
      return res.status(400).json({
        success: false,
        message: "Missing fields",
      })
    }

    const user = await User.findById(userId)

    await mailSender(
      user.email,
      "Payment Successful",
      paymentSuccessEmail(
        user.firstName,
        amount / 100,
        orderId,
        paymentId
      )
    )

    return res.status(200).json({
      success: true,
      message: "Email sent",
    })

  } catch (error) {
    console.error(error)
    return res.status(500).json({
      success: false,
      message: "Email sending failed",
    })
  }
}