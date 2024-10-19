import React, { useEffect, useState } from "react";
import axios from "axios";

interface Props {
    adminName: string;
    teamName: string;
    users: string[];
    sessionId: string;
    onLeaveSession: () => void;
}

const UserView: React.FC<Props> = ({
                                       adminName,
                                       teamName,
                                       users,
                                       sessionId,
                                       onLeaveSession,
                                   }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [taskName, setTaskName] = useState<string | null>(null);
    const [estimate, setEstimate] = useState<number | "">("");
    const [estimates, setEstimates] = useState<{ [key: string]: number }>({});
    const [revealed, setRevealed] = useState(false);

    const displayName = sessionStorage.getItem("displayName");

    // Poll backend every 5 seconds for the task, estimates, and reveal status
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const response = await axios.get(
                    `https://estimation-tool-backend.onrender.com/get-session-state/${sessionId}`
                );
                const { task_name, estimates, revealed } = response.data;

                // If the task name has changed, open the modal
                if (task_name && task_name !== taskName) {
                    setTaskName(task_name);
                    setIsModalOpen(true);
                }

                setEstimates(estimates); // Update estimates
                setRevealed(revealed);   // Update reveal status
            } catch (error) {
                console.error("Failed to fetch session state:", error);
            }
        }, 5000);

        return () => clearInterval(interval); // Cleanup on unmount
    }, [sessionId, taskName]);

    const handleSubmit = async () => {
        if (!displayName || estimate === "") return; // Ensure valid input

        try {
            // Submit the user's estimate to the backend
            await axios.post(`https://estimation-tool-backend.onrender.com/submit-estimate/${sessionId}`, {
                display_name: displayName,
                estimate: Number(estimate),
            });
            setIsModalOpen(false); // Close the modal after submission
        } catch (error) {
            console.error("Failed to submit estimate:", error);
        }
    };

    return (
        <div className="user-container">
            <h2>Team: {teamName}</h2>
            <p>Admin: {adminName}</p>
            <p>Estimator: {displayName}</p>

            <h3>Users in Session:</h3>
            <ul>
                {users.map((user, index) => (
                    <li key={index}>
                        {user} {estimates[user] !== undefined ? `*` : ""}
                    </li>
                ))}
            </ul>

            <button className="leave-session" onClick={onLeaveSession}>
                Leave Session
            </button>

            {isModalOpen && (
                <div className="modal">
                    <h3>Task: {taskName}</h3>
                    <input
                        type="string"
                        placeholder="Your Estimate"
                        value={estimate}
                        onChange={(e) => setEstimate(Number(e.target.value))}
                    />
                    <button onClick={handleSubmit}>Submit</button>
                </div>
            )}

            {revealed && (
                <div className="estimates-list">
                    <h3>All Estimates</h3>
                    <ul>
                        {Object.entries(estimates).map(([user, userEstimate], index) => (
                            <li key={index}>
                                {user}: {userEstimate}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default UserView;
