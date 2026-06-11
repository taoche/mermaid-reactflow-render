import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { MermaidFlow, type FlowDirection } from "../src/index.js";

const SAMPLE = `flowchart TD
    Start([User runs the pre-departure document check]) --> Announce[Tell user the departure window:<br/>today through tomorrow]
    Announce --> Fetch[Step 1: Run find-air-export-missing-docs<br/>AIR · 24h window · monitored countries<br/>paginate 50/page · dedupe by dbid]
    Fetch --> Empty{Any shipments<br/>returned?}
    Empty -->|No| NoneMsg[Tell user: no air exports<br/>departing in next 24h] --> Stop([Stop])
    Empty -->|Yes| PerShip[For each shipment]
    PerShip --> Freight{Flexport<br/>freight?}
    Freight -->|false / empty| Discard[Discard — customs-only]
    Freight -->|true| Slots[Evaluate 4 document slots<br/>MAWB · HAWB · CI-or-PL · Cargo Manifest]
    Slots --> Compliant{All 4 slots<br/>satisfied?}
    Compliant -->|Yes| Skip[Compliant — skip]
    Compliant -->|No| Flag[Add to flagged list<br/>record missing slots]
    Discard --> Done1((next))
    Skip --> Done1
    Flag --> Done1
    Done1 --> AnyFlagged{Any shipment<br/>flagged?}
    AnyFlagged -->|No| AllClear[Step 3: Show all-clear message] --> End([Done])
    AnyFlagged -->|Yes| MidTable[Show two-column table:<br/>FLEX-ID · Missing Documents]
    MidTable --> Chase[Step 2: For each flagged shipment,<br/>one at a time — NOT in parallel]
    Chase --> Contact{Origin-country<br/>contact found?}
    Contact -->|No| NoContact[Mark: No contact on file]
    Contact -->|Yes| Compose[Compose body from template<br/>to primary contact · CC the rest]
    Compose --> SendEmail[Send a system email<br/>about this shipment]
    SendEmail --> MarkSent[Mark: Message sent]
    NoContact --> NextFlagged((next flagged))
    MarkSent --> NextFlagged
    NextFlagged --> Report[Step 3: Display report<br/>metric cards + flagged table]
    Report --> End`;

const DIRECTIONS: Array<{ label: string; value: FlowDirection | "" }> = [
  { label: "From source", value: "" },
  { label: "Top → Bottom (TB)", value: "TB" },
  { label: "Bottom → Top (BT)", value: "BT" },
  { label: "Left → Right (LR)", value: "LR" },
  { label: "Right → Left (RL)", value: "RL" },
];

function App() {
  const [code, setCode] = useState(SAMPLE);
  const [direction, setDirection] = useState<FlowDirection | "">("");
  return (
    <div style={{ display: "flex", height: "100%" }}>
      <div style={{ display: "flex", flexDirection: "column", width: 360, borderRight: "1px solid #e5e7eb" }}>
        <div style={{ padding: 8, borderBottom: "1px solid #e5e7eb", display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
          <label htmlFor="dir">Direction</label>
          <select
            id="dir"
            data-testid="direction"
            value={direction}
            onChange={(e) => setDirection(e.target.value as FlowDirection | "")}
            style={{ flex: 1, padding: 4 }}
          >
            {DIRECTIONS.map((d) => (
              <option key={d.value || "src"} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          style={{
            flex: 1,
            border: "none",
            padding: 12,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 12,
            resize: "none",
            outline: "none",
          }}
        />
      </div>
      <div style={{ flex: 1, height: "100%" }} data-testid="canvas">
        <MermaidFlow code={code} direction={direction || undefined} />
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
