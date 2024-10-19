// src/components/JoinSession.tsx
import React, { useState } from "react";

interface Props {
    onJoin: (displayName: string, sessionId: string) => void;
}

const JoinSession: React.FC<Props> = ({ onJoin }) => {
    const [displayName, setDisplayName] = useState<string>("");
    const [sessionId, setSessionId] = useState<string>("");

    return (
        <div className="app-container">
            <h2>Join a Session</h2>
            <input
                type="text"
                placeholder="Your Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
            />
            <input
                type="text"
                placeholder="Session ID"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
            />
            <button onClick={() => onJoin(displayName, sessionId)}>Join Session</button>
        </div>
    );
};

export default JoinSession;
