const Groq = require("groq-sdk")

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

exports.chatWithAI = async (req, res) => {
  try {
    const { message, history, userContext } = req.body

    // Keep last 6 messages for context
    const formattedHistory = (history || [])
      .filter((msg) => msg.text && msg.text.trim() !== "")
      .slice(-6)
      .map((msg) => ({
        role: msg.from === "user" ? "user" : "assistant",
        content: msg.text,
      }))

    const isLoggedIn = userContext?.isLoggedIn === true
    const accountType = userContext?.accountType || "guest"
    const userName = userContext?.userName || "there"
    const courses = userContext?.courses || []

    // Build enrolled courses string for the prompt
    const courseList = courses.length
      ? courses
          .map((c) => `"${c.name}" (progress: ${c.progress}%, id: ${c.id})`)
          .join(", ")
      : "none"

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `
You are FrHelp AI, a smart assistant for an online learning platform called FrHelp.
You MUST always respond in valid JSON with this exact shape:
{
  "reply": "string",
  "action": "string",
  "category": "string",
  "courseId": "string"
}

USER STATE
isLoggedIn: ${isLoggedIn}
accountType: ${accountType}
userName: ${userName}
enrolledCourses: ${courseList}

COMPLETE ACTION LIST — use EXACTLY these strings

PUBLIC:
open_login, open_signup, open_contact, open_about, open_catalog, open_course_details

PRIVATE:
open_profile, open_cart, open_courses, open_settings

SPECIAL:
list_courses, none

ROUTING RULES
1. If isLoggedIn is false, public routes are always accessible.
2. If a guest asks for cart, profile or enrolled courses, action must be open_login.
3. If logged in, open_courses and list_courses navigate to enrolled courses.
4. For login status questions, answer using the supplied user state.

COURSE RULES
- Never make up course names not in the enrolled courses list.
- For "show my courses" or similar, use action list_courses and list enrolled courses.
- For recommendations, use real progress from the enrolled courses list.
- For "open [course name]", match an enrolled course and use open_course_details with its courseId.
- If no enrolled courses exist, suggest exploring the catalog.

CATALOG RULES
- Extract category slug from the message.
- web dev / frontend / html / css / javascript → web-development
- backend / node / express / server → backend-development
- python / data science / ml / ai → data-science
- react / next.js → web-development

GENERAL BEHAVIOUR
- Be friendly, concise and helpful.
- If you don't know, use action none.
- Always return valid JSON only. No markdown or backticks.
`,
        },
        ...formattedHistory,
        {
          role: "user",
          content: message,
        },
      ],
    })

    const raw = completion.choices[0].message.content

    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      // Fallback if JSON parse fails
      parsed = { reply: raw, action: "none", category: "", courseId: "" }
    }

    // Safety: ensure all fields exist
    return res.status(200).json({
      success: true,
      reply: parsed.reply || "I'm here to help!",
      action: parsed.action || "none",
      category: parsed.category || "",
      courseId: parsed.courseId || "",
    })
  } catch (error) {
    console.error("AI Controller Error:", error)
    return res.status(500).json({
      success: false,
      message: "AI failed",
    })
  }
}
