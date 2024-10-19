// src/App.tsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import CreateSession from "./components/CreateSession";
import JoinSession from "./components/JoinSession";
import AdminView from "./components/AdminView";
import UserView from "./components/UserView";
import "./styles.css";

interface SessionResponse {
  session_id: string;
  admin_name: string;
  team_name: string;
  users: string[];
}

type View = "home" | "create" | "join";

const App: React.FC = () => {
  const [session, setSession] = useState<SessionResponse | null>(() => {
    const savedSession = localStorage.getItem("session");
    return savedSession ? JSON.parse(savedSession) : null;
  });

  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return localStorage.getItem("isAdmin") === "true";
  });

  const [view, setView] = useState<View>("home");

  // Save admin session to localStorage on change
  useEffect(() => {
    if (isAdmin && session) {
      localStorage.setItem("session", JSON.stringify(session));
      localStorage.setItem("isAdmin", "true");
    }
  }, [session, isAdmin]);

  // Use sessionStorage for users to isolate session per tab
  useEffect(() => {
    const savedUserSession = sessionStorage.getItem("session");
    if (!isAdmin && savedUserSession) {
      setSession(JSON.parse(savedUserSession));
    }
  }, [isAdmin]);

  useEffect(() => {
    if (session) {
      const interval = setInterval(async () => {
        try {
          const response = await axios.get<SessionResponse>(
              `https://estimation-tool-backend.onrender.com/get-session-state/${session.session_id}`
          );
          console.log(response.data);
          setSession(response.data);
        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.status === 404) {
            console.error("Session not found, ending session locally.");
            await handleEndSession(); // Gracefully end the session
          } else {
            console.error("Failed to fetch session users:", error);
          }
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [session]);

  const createSession = async (adminName: string, teamName: string) => {
    try {
      const response = await axios.post<SessionResponse>(
          "https://estimation-tool-backend.onrender.com/create-session/",
          { admin_name: adminName, team_name: teamName }
      );
      setSession(response.data);
      setIsAdmin(true);
      setView("home"); // Return to home view after creation
    } catch (error) {
      console.error("Failed to create session:", error);
    }
  };

  const joinSession = async (displayName: string, sessionId: string) => {
    try {
      const response = await axios.post<SessionResponse>(
          `https://estimation-tool-backend.onrender.com/join-session/${sessionId}`,
          { display_name: displayName }
      );
      setSession(response.data);
      sessionStorage.setItem("session", JSON.stringify(response.data)); // Store in sessionStorage for users
      sessionStorage.setItem("displayName", displayName);
      setIsAdmin(false);
    } catch (error) {
      console.error("Failed to join session:", error);
    }
  };

  const handleEndSession = async () => {
    if (session) {
      try {
        await axios.delete(`https://estimation-tool-backend.onrender.com/end-session/${session.session_id}`);
      } catch (error) {
        console.error("Failed to end session on backend, clearing local:", error);
      }
      // Clear session from frontend
      setSession(null);
      localStorage.removeItem("session");
      localStorage.removeItem("isAdmin");
      sessionStorage.removeItem("session");
      setView("home");
    }
  };

  const handleLeaveSession = async () => {
    if (session) {
      const displayName = sessionStorage.getItem("displayName");

      try {
        await axios.post(
            `https://estimation-tool-backend.onrender.com/leave-session/${session.session_id}`,
            { display_name: displayName }
        );
      } catch (error) {
        console.error("Failed to leave session:", error);
      } finally {
        // Clear session data from sessionStorage and state
        setSession(null);
        setView("home");
        sessionStorage.removeItem("session");
        sessionStorage.removeItem("displayName");
      }
    }
  };

  // Render appropriate form view
  if (!session) {
    if (view === "create") {
      return <CreateSession onCreate={createSession} />;
    } else if (view === "join") {
      return <JoinSession onJoin={joinSession} />;
    }

    // Default home view with buttons
    return (
        <div className="app-container">
          <h1>Estimation App</h1>
          <button onClick={() => setView("create")}>Create a Session</button>
          <button onClick={() => setView("join")}>Join a Session</button>
        </div>
    );
  }

  // Render Admin or User view based on role
  return isAdmin ? (
      <AdminView
          sessionId={session.session_id}
          adminName={session.admin_name}
          teamName={session.team_name}
          users={session.users}
          onEndSession={handleEndSession}

      />
  ) : (
      <UserView
          adminName={session.admin_name}
          teamName={session.team_name}
          users={session.users}
          onLeaveSession={handleLeaveSession}
          sessionId={session.session_id}
      />
  );
};

export default App;
