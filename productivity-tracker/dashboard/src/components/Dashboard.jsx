import React, { useEffect, useState } from "react";
export default function Dashboard({ token, onLogout }) {
  const [report, setReport] = useState(null);
  const backend = process.env.REACT_APP_BACKEND || "http://localhost:4000";
  useEffect(() => {
    async function load() {
      const res = await fetch(`${backend}/api/data/report/weekly`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setReport(await res.json());
      } else {
        alert("Failed to load report");
      }
    }
    load();
  }, [token]);

  if (!report) return <div>Loading...</div>;
  return (
    <div style={{ padding: 20 }}>
      <h2>Weekly Productivity</h2>
      <div>Total minutes: {report.total_minutes}</div>
      <div>Productive: {report.productive_minutes} min</div>
      <div>Unproductive: {report.unproductive_minutes} min</div>
      <h4>Top domains</h4>
      <ul>
        {report.byDomain.map((d) => (
          <li key={d.domain}>
            {d.domain}: {d.minutes} min
          </li>
        ))}
      </ul>
      <button onClick={onLogout}>Logout</button>
    </div>
  );
}
