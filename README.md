# ✈️ Airline ChatBot with AI Agent, React UI, and API Gateway

This project implements an AI-powered Airline ChatBot system, consisting of three major components:

* **AI Agent** (Firebase Cloud Functions)
* **API Gateway** (Ocelot on .NET)
* **React UI** (frontend chat interface)

The system allows users to chat with a bot to:

* Search for flights
* Buy tickets for a given flight ID
* Check in with a seat assignment

All interactions are natural language-based and rely on OpenAI’s GPT-3.5 model to determine user intent. The intent is then passed to an API Gateway which forwards requests to an external mock airline API.

---

## 🔗 Project Links

* **AI Agent Source Code (Firebase)**: [GitHub Link](https://github.com/kozachad/airline-ai_agent)
* **React UI Source Code**: [GitHub Link](https://github.com/kozachad/airline-ui)
* **.NET API Gateway (Ocelot)**: [GitHub Link](https://github.com/kozachad/ocelot-gateway)
* **Demo Video**: [YouTube Presentation Video](https://youtu.be/O1WZ8DQaprM)

---

## 📁Simple Project Structure

```bash
├── flight-ai-agent/               # Firebase Functions project
│   ├── functions/
│   │   ├── index.js              # Main function: intent detection & API proxy
│   │   ├── .env                  # Contains API_KEY and OPENAI_API_KEY
│   └── firebase.json
│
├── flight-chat-ui/               # React app for chat interface
│   ├── src/
│   │   ├── App.js                # Core component
│   │   ├── FlightList.js        # Displays flight search results
│   │   ├── SimpleBotResponse.js # Displays simple bot responses
│   └── firebase.js              # Firebase config
│
├── flight-gateway-ocelot/        # .NET Ocelot Gateway
│   ├── Program.cs               # Main entry
│   ├── ocelot.json              # Route forwarding to backend
│   └── Dockerfile               # Render deployment
```

---

## 🧠 Design & Assumptions

* **OpenAI** is used for intent detection. It returns one of: `query`, `buy`, or `checkin`. And returns the structure for the selected intent.
* The user writes natural sentences like:

  * "I want to book flight 12 for Alice"
  * "Check in for flight 8, my name is Ahmet"
  * "Find a flight from Ankara to Berlin on June 10 for 2 people"
* Based on intent, the correct endpoint is selected (`/query`, `/buy`, `/checkin`) and forwarded to the mock airline backend API via the gateway.
* `FlightList` component handles array results.
* `SimpleBotResponse` handles string or success confirmation.
* Firebase Cloud Functions host the `processMessage` logic and watch the `messages` collection.

---

## ⚙️ Technologies

* **React.js** (UI)
* **Firebase Realtime Database & Cloud Functions** (AI Agent)
* **OpenAI GPT-3.5 Turbo** (intent detection)
* **.NET 9 + Ocelot** (API Gateway)
* **Render** (deployment for Gateway)

---

## 🧪 Issues Encountered

* Handling duplicate bot messages (solved with snapshot sender filtering)
* OpenAI API quota exceeded errors (rate-limiting and budget configuration added)
* Incorrect parsing of user input (updated prompt formatting for better intent recognition)
* Gateway sending full JSON as route (replaced with dynamic path extraction)
* Firebase function container health check issues (resolved .env structure and minimized runtime exceptions)

---

## 👨‍💻 Developer Info

**Name:** Kaan Mert Kozalı  
**Course:** SE4458 Assignment-2
**Project Theme:** Flight Reservation System – AI Agent
