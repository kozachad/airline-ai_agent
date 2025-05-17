require("dotenv").config();
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const axios = require("axios");

initializeApp();

const apiKey = process.env.API_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

// 🔍 Intent Detection
async function detectIntent(text) {
  const prompt = `You are a flight assistant bot. Given a user's message, identify the intent and extract the relevant structured data. Only respond with a valid JSON object.

Possible intents:
- "query" — searching for flights
- "buy" — booking a ticket
- "checkin" — checking in for a flight

---

🛫 If the intent is "query", include:
{
  "intent": "query",
  "airportFrom": "IST",
  "airportTo": "BER",
  "dateFrom": "2025-05-20T00:00:00Z",
  "dateTo": "2025-05-21T00:00:00Z",
  "numberOfPeople": 2,
  "isRoundTrip": false
}

🧾 If the intent is "buy", include:
{
  "intent": "buy",
  "flightId": 8,
  "passengerName": "John Smith"
}

🧳 If the intent is "checkin", include:
{
  "intent": "checkin",
  "flightId": 8,
  "passengerName": "John Smith"
}

---

💡 Examples:

Input: "Find me a flight from Istanbul to Berlin on May 20 for 2 people"
Output:
{
  "intent": "query",
  "airportFrom": "IST",
  "airportTo": "BER",
  "dateFrom": "2025-05-20T00:00:00Z",
  "dateTo": "2025-05-21T00:00:00Z",
  "numberOfPeople": 2,
  "isRoundTrip": false
}

Input: "I want to book ticket for flight 12, my name is John Smith"
Output:
{
  "intent": "buy",
  "flightId": 12,
  "passengerName": "John Smith"
}

Input: "Check in for flight 8. My name is Alice."
Output:
{
  "intent": "checkin",
  "flightId": 8,
  "passengerName": "Alice"
}

---

Now respond only with a text(intent) for the following message:
" ${text}`;

  const res = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 10,
      temperature: 0,
    },
    {
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  return res.data.choices[0].message.content.trim().toLowerCase();
}

exports.processMessage = onDocumentCreated(
  {
    document: "messages/{msgId}",
    region: "europe-west1",
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    if(snapshot.data().response){
      console.log("Already Responded. Skipping.");
      return;
    }

    const data = snapshot.data();

    // ❗ Bot mesajlarıysa atla — sonsuz döngü engeli
    if (data.sender !== "user") return;

    const text = data.text || "";

    let intent = "unknown";
    try {
      intent = JSON.parse( await detectIntent(text)).intent
      console.log("🎯 Detected intent:", intent);
    } catch (err) {
      console.error("❌ OpenAI intent detection failed:", err.message);
    }

    const apiUrl = `https://ocelot-gateway.onrender.com/api/flight/${intent}`;
    console.log("🎯 API URL ???:", apiUrl);
    let requestBody;

    if (intent === "buy" || intent === "checkin") {
      const flightIdMatch = text.match(/flight\s*(id)?\s*(\d+)/);
      const nameMatch =
        text.match(/name\s*(is\s*)?([a-zA-Z\s]+)/i) ||
        text.match(/for\s+([a-zA-Z\s]+)/i);

      const flightId = flightIdMatch ? parseInt(flightIdMatch[2]) : 0;
      const passengerName = nameMatch?.[2]?.trim() || nameMatch?.[1]?.trim() || "John Doe";

      requestBody = { flightId, passengerName };
    } else {
      requestBody = {
        ...parseFlightQuery(text),
        isRoundTrip: false,
        pageNumber: 1,
        pageSize: 10,
      };
    }

    console.log("📦 Request Body:", requestBody);

    try {
      const res = await axios.post(apiUrl, requestBody, {
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
      });

      await snapshot.ref.update({
        response: JSON.stringify(res.data),
        sender: "bot", // 🔁 Bu mesajlar artık tekrar tetiklenmez
      });

    } catch (err) {
      console.error("❌ Axios API error:", err.message);
      console.error("❌ API Response:", err.response?.data);

      await snapshot.ref.update({
        response: JSON.stringify({
          error: "Server error",
          status: err.response?.status || 500,
          details: err.response?.data || err.message,
        }),
        sender: "bot",
      });
    }
  }
);

// 🧠 Query Parsing Function
function parseFlightQuery(text) {
  const airports = { istanbul: "IST", berlin: "BER", ankara: "ESB", izmir: "ADB" };
  const lowercase = text.toLowerCase();

  let airportFrom = "", airportTo = "";

  for (const [name, code] of Object.entries(airports)) {
    if (lowercase.includes(`from ${name}`)) airportFrom = code;
    if (lowercase.includes(`to ${name}`)) airportTo = code;
  }

  const peopleMatch = lowercase.match(/(\d+)\s*(people|person|passenger)/);
  const numberOfPeople = peopleMatch ? parseInt(peopleMatch[1]) : 1;

  const dateMatch = lowercase.match(/(\d{1,2})\s*(january|february|march|april|may|june|july|august|september|october|november|december)/);
  const months = {
    january: "01", february: "02", march: "03", april: "04",
    may: "05", june: "06", july: "07", august: "08",
    september: "09", october: "10", november: "11", december: "12"
  };

  let dateFrom = new Date("2025-01-01T00:00:00Z");
  let dateTo = new Date("2025-12-31T23:59:59Z");

  if (dateMatch) {
    const day = dateMatch[1].padStart(2, "0");
    const month = months[dateMatch[2]];
    const year = new Date().getFullYear();
    dateFrom = new Date(`${year}-${month}-${day}T00:00:00Z`);
    dateTo = new Date(dateFrom.getTime() + 24 * 60 * 60 * 1000);
  }

  return {
    airportFrom: airportFrom || "IST",
    airportTo: airportTo || "BER",
    numberOfPeople,
    dateFrom: dateFrom.toISOString(),
    dateTo: dateTo.toISOString(),
  };
}
