import React, { useState } from "react";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  return token ? (
    <Dashboard
      token={token}
      onLogout={() => {
        localStorage.removeItem("token");
        setToken(null);
      }}
    />
  ) : (
    <Login
      onLogin={(t) => {
        localStorage.setItem("token", t);
        setToken(t);
      }}
    />
  );
}

export default App;
