// src/components/CreateSession.tsx
import React, { useState } from "react";

interface Props {
    onCreate: (adminName: string, teamName: string) => void;
}

const CreateSession: React.FC<Props> = ({ onCreate }) => {
    const [adminName, setAdminName] = useState<string>("");
    const [teamName, setTeamName] = useState<string>("");

    return (
        <div className="app-container">
            <h2>Create a New Session</h2>
            <input
                type="text"
                placeholder="Admin Name"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
            />
            <input
                type="text"
                placeholder="Team Name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
            />
            <button onClick={() => onCreate(adminName, teamName)}>
                Create Session
            </button>
        </div>
    );
};

export default CreateSession;
