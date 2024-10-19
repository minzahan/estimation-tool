import React, { useEffect, useState } from "react";
import axios from "axios";

interface Props {
    sessionId: string;
    adminName: string;
    teamName: string;
    users: string[];
    onEndSession: () => void;
}

const AdminView: React.FC<Props> = ({
                                        sessionId,
                                        adminName,
                                        teamName,
                                        users,
                                        onEndSession,
                                    }) => {
    const [estimates, setEstimates] = useState<{ [key: string]: number }>({});
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [taskName, setTaskName] = useState<string>("");
    const [revealed, setRevealed] = useState(false);

    // Poll backend every 5 seconds for session state
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const response = await axios.get(
                    `https://estimation-tool-backend.onrender.com/get-session-state/${sessionId}`
                );
                setEstimates(response.data.estimates);
                setRevealed(response.data.revealed);
            } catch (error) {
                console.error("Failed to fetch session state:", error);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [sessionId]);

    const startEstimation = async () => {
        try {
            // Send the task name to the backend to notify users
            await axios.post(`https://estimation-tool-backend.onrender.com/set-task/${sessionId}`, {
                task_name: taskName,
            });
            setIsModalOpen(false); // Close the modal after task starts
        } catch (error) {
            console.error("Failed to start estimation:", error);
        }
    };

    const revealEstimates = async () => {
        try {
            await axios.post(`https://estimation-tool-backend.onrender.com/reveal-estimates/${sessionId}`);
            setRevealed(true); // Set revealed to true locally
        } catch (error) {
            console.error("Failed to reveal estimates:", error);
        }
    };

    const nonAdminUsers = users.filter(user => user !== adminName);
    const allUsersSubmitted =
        nonAdminUsers.length > 0 &&
        nonAdminUsers.length === Object.keys(estimates).length;
    const getUpdatedUsers = (users: string[]) =>
        users.map((user) =>
            estimates[user] !== undefined ? `${user} *` : user
        );

    const clearSessionState = async () => {
        try {
            await axios.post(`https://estimation-tool-backend.onrender.com/clear-session-state/${sessionId}`);
            setTaskName(""); // Reset task name
            setEstimates({}); // Clear estimates
            setRevealed(false); // Reset reveal state
            setIsModalOpen(false); // Ensure modal is closed
        } catch (error) {
            console.error("Failed to clear session state:", error);
        }
    };

    return (
        <div className="admin-container">
            <h2>Team: {teamName}</h2>
            <p>Admin: {adminName}</p>
            <p>Session ID: {sessionId}</p>

            <h3>Users in Session:</h3>
            <ul>
                {getUpdatedUsers(users).map((user, index) => (
                    <li key={index}>{user}</li>
                ))}
            </ul>

            <button onClick={() => setIsModalOpen(true)}>Estimate a Task</button>

            <button className="end-session" onClick={onEndSession}>
                End Session
            </button>

            {isModalOpen && (
                <div className="modal">
                    <h3>Start Task Estimation</h3>
                    <input
                        type="text"
                        placeholder="Optional Task Name"
                        value={taskName}
                        onChange={(e) => setTaskName(e.target.value)}
                    />
                    <button onClick={startEstimation}>Get Estimates</button>
                    <button onClick={() => setIsModalOpen(false)}>Cancel</button>
                </div>
            )}

            {allUsersSubmitted && !revealed && (
                <button onClick={() => revealEstimates()}>
                    Reveal Estimates
                </button>
            )}

            {revealed && (
                <div className="estimates-list">
                    <h3>All Estimates</h3>
                    <ul>
                        {Object.entries(estimates).map(([user, estimate], index) => (
                            <li key={index}>
                                {user}: {estimate}
                            </li>
                        ))}
                    </ul>
                    <button onClick={clearSessionState}>Start New Task</button>
                </div>
            )}
        </div>
    );
};

export default AdminView;
