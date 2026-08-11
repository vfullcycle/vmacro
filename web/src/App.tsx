import { useEffect, useState } from "react";
import { API_BASE_URL } from "./config";
import "./App.css";

type HealthState =
  | { status: "loading" }
  | { status: "ok" }
  | { status: "error"; message: string };

function App() {
  const [health, setHealth] = useState<HealthState>({ status: "loading" });

  useEffect(() => {
    fetch(`${API_BASE_URL}/health`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(() => setHealth({ status: "ok" }))
      .catch((err) => setHealth({ status: "error", message: String(err) }));
  }, []);

  return (
    <main className="health-check">
      <h1>Vmacro</h1>
      <p>Proxy: {API_BASE_URL}</p>
      {health.status === "loading" && <p>กำลังเช็ค /health...</p>}
      {health.status === "ok" && <p className="ok">✓ proxy เชื่อมต่อสำเร็จ</p>}
      {health.status === "error" && <p className="error">✗ เชื่อมต่อไม่สำเร็จ: {health.message}</p>}
    </main>
  );
}

export default App;
