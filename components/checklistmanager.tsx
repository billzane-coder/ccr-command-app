"use client";

import React, { useState, useEffect } from "react";
import {
  CheckSquare,
  Plus,
  Trash2,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";

type ListCategory = "build" | "gdmoitl" | "postdive" | "custom";

interface ChecklistItem {
  id: string;
  listType: ListCategory;
  text: string;
  note: string;
  completed: boolean;
}

const DEFAULT_CHECKLIST_ITEMS: ChecklistItem[] = [
  // 1. P2 BUILD & RIG
  {
    id: "b1",
    listType: "build",
    text: "Pack Radial Scrubber (3-Taps-and-Turn Method)",
    note: "Use 8-12 mesh Sofnolime/Intersorb. Large-hole foam pad on bottom, small-hole pad on top. Log date & remaining time.",
    completed: false,
  },
  {
    id: "b2",
    listType: "build",
    text: "Inspect Red CO2 Seal & Bucket Compression Spring",
    note: "Ensure red silicone CO2 seal is dry (NEVER lubricate) and seated flat. Confirm 1 thread exposed on bottom spring post.",
    completed: false,
  },
  {
    id: "b3",
    listType: "build",
    text: "Counterlung Sniff Test, Drains & T-Piece Rings",
    note: "Verify zero mildew odor, test FMCL/BMCL drain return springs, and inspect hose O-rings.",
    completed: false,
  },
  {
    id: "b4",
    listType: "build",
    text: "DSV / BOV Hardware Match & Mushroom 'Stereo Check'",
    note: "Never mix DSV and BOV fittings. Test both inhalation and exhalation one-way mushroom valves individually.",
    completed: false,
  },
  {
    id: "b5",
    listType: "build",
    text: "Attach Loop Hoses to Head (White Nut = Reverse Thread)",
    note: "Match white counter-clockwise inhalation nut to white bar on head port. Hand-tighten only.",
    completed: false,
  },
  {
    id: "b6",
    listType: "build",
    text: "Craftsman Individual Setup of Offboard Bailout Cylinders",
    note: "Analyze O2 & He, label Name / Mix / MOD on outside for teammates. Keep high-O2 deco cylinder valve CLOSED at start.",
    completed: false,
  },

  // 2. G.D.M.O.I.T.L. & PRE-JUMP
  {
    id: "g1",
    listType: "gdmoitl",
    text: "G — Gas & Life Support Management",
    note: "Onboard O2/Dil full & analyzed; independent offboard bailout covers full OC ascent + 1/3 reserve; turn pressures logged.",
    completed: false,
  },
  {
    id: "g2",
    listType: "gdmoitl",
    text: "D — Decompression & Backup Computers",
    note: "CCR and OC bailout schedules run; primary & backup Shearwater computers programmed with matching CC/OC gases & GFs.",
    completed: false,
  },
  {
    id: "g3",
    listType: "gdmoitl",
    text: "M — Mission & Override Rule",
    note: "Simple, realistic task. Any diver can bail out or abort the dive at any time for any reason.",
    completed: false,
  },
  {
    id: "g4",
    listType: "gdmoitl",
    text: "O — Oxygen Exposure (Setpoint, CNS% & OTUs)",
    note: "Setpoint ≤1.3 ata; Diluent PO2 at max depth at least 0.1–0.2 below SP; CNS <80% and daily OTUs within multi-day allowance.",
    completed: false,
  },
  {
    id: "g5",
    listType: "gdmoitl",
    text: "I — Inert Gas Narcosis & Gas Density",
    note: "Helium fraction keeps Loop END ≤130ft (100ft for complex dives) and gas density ≤5.2 g/L.",
    completed: false,
  },
  {
    id: "g6",
    listType: "gdmoitl",
    text: "T — Thermal & Separate Drysuit Inflation",
    note: "Never inflate drysuit with Trimix/Heliox; verify dedicated Argon/Air suit inflation bottle & relief valve.",
    completed: false,
  },
  {
    id: "g7",
    listType: "gdmoitl",
    text: "L — Logistics, Surface Support & Pre-Jump BWRAF",
    note: "Verify O2, Diluent, and Low-O2 bailout valves OPEN, High-O2 valve CLOSED, harness releases, cutting tools, DSMB/reel.",
    completed: false,
  },

  // 3. POST-DIVE & STERILIZATION
  {
    id: "p1",
    listType: "postdive",
    text: "Log Final Solenoid (EXT V) & Handset (INT V) Voltages",
    note: "Check before powering down. Replace if EXT V <7.0V or INT V <3.28V; check HUD for 30s orange low-battery light.",
    completed: false,
  },
  {
    id: "p2",
    listType: "postdive",
    text: "20-Minute Sealed Freshwater Soak & Drain HP Lines",
    note: "Close O2 and Diluent tank valves, vent lines via MAV and ADV, remove cylinders, and cap DIN 1st stages.",
    completed: false,
  },
  {
    id: "p3",
    listType: "postdive",
    text: "Drain Exhalation Lung & Inspect Inhalation Lung",
    note: "Fluid in the exhalation lung is normal; water in the inhalation lung indicates an inhale-side leak that must be repaired.",
    completed: false,
  },
  {
    id: "p4",
    listType: "postdive",
    text: "Mix 1 Gal Steramine in Bucket (3/4\" Below SS Band)",
    note: "Use ONLY 1–2 tablets per gallon. Remove BMCL Manual Addition Blocks before soaking T-pieces!",
    completed: false,
  },
  {
    id: "p5",
    listType: "postdive",
    text: "Air-Dry Sensors & Hang Loop Out of Direct Sun",
    note: "Never wipe O2 sensor faces with a towel. Use white vinegar soak on basket threads if soda lime caked.",
    completed: false,
  },
];

export default function ChecklistManager() {
  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    DEFAULT_CHECKLIST_ITEMS
  );
  const [activeCat, setActiveCat] = useState<ListCategory>("build");
  const [newItemText, setNewItemText] = useState("");
  const [newItemNote, setNewItemNote] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("p2_custom_checklists_v2");
    if (saved) {
      try {
        setChecklist(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const saveChecklist = (updated: ChecklistItem[]) => {
    setChecklist(updated);
    localStorage.setItem("p2_custom_checklists_v2", JSON.stringify(updated));
  };

  const addChecklistItem = () => {
    if (!newItemText.trim()) return;
    const newItem: ChecklistItem = {
      id: "custom_" + Date.now(),
      listType: activeCat,
      text: newItemText.trim(),
      note: newItemNote.trim() || "Custom user checklist verification",
      completed: false,
    };
    saveChecklist([...checklist, newItem]);
    setNewItemText("");
    setNewItemNote("");
  };

  const toggleItem = (id: string) => {
    saveChecklist(
      checklist.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const deleteItem = (id: string) => {
    saveChecklist(checklist.filter((item) => item.id !== id));
  };

  const uncheckCurrentCategory = () => {
    saveChecklist(
      checklist.map((item) =>
        item.listType === activeCat ? { ...item, completed: false } : item
      )
    );
  };

  const visibleItems = checklist.filter((i) => i.listType === activeCat);
  const completedCount = visibleItems.filter((i) => i.completed).length;

  return (
    <div className="flex-1 flex flex-col gap-3.5">
      {/* Category Selector Tabs */}
      <div className="grid grid-cols-4 gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
        {(
          [
            { id: "build", label: "P2 Build" },
            { id: "gdmoitl", label: "GDMOITL" },
            { id: "postdive", label: "Post-Dive" },
            { id: "custom", label: "My Custom" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveCat(tab.id)}
            className={`py-2 rounded-lg text-[11px] font-bold transition-all ${
              activeCat === tab.id
                ? "bg-cyan-500 text-slate-950"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Progress & Reset Bar */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono text-slate-200">
            COMPLETED:{" "}
            <strong className="text-emerald-400">{completedCount}</strong> /{" "}
            {visibleItems.length}
          </span>
        </div>
        <button
          onClick={uncheckCurrentCategory}
          className="text-[11px] font-mono text-slate-400 hover:text-white flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800"
        >
          <RotateCcw className="w-3 h-3" /> Uncheck Tab
        </button>
      </div>

      {/* Add Custom Item Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2">
        <span className="text-[10px] font-mono uppercase text-cyan-400 block">
          + Add Custom Step to "{activeCat.toUpperCase()}" Tab (Saved to Phone)
        </span>
        <input
          type="text"
          placeholder="Step title (e.g., Verify Swift AI transmitters & Bigblue canister light)"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
        />
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Optional target spec or note..."
            value={newItemNote}
            onChange={(e) => setNewItemNote(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
          />
          <button
            onClick={addChecklistItem}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 shrink-0"
          >
            <Plus className="w-4 h-4" /> Save
          </button>
        </div>
      </div>

      {/* Checklist Items List */}
      <div className="space-y-2 flex-1 overflow-y-auto">
        {visibleItems.length === 0 ? (
          <div className="text-center py-8 bg-slate-900/50 border border-slate-800 rounded-2xl text-xs text-slate-400">
            No items in this tab yet. Add your own custom items above!
          </div>
        ) : (
          visibleItems.map((item) => (
            <div
              key={item.id}
              className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                item.completed
                  ? "bg-slate-900/40 border-emerald-500/30 opacity-60"
                  : "bg-slate-900 border-slate-800"
              }`}
            >
              <button
                onClick={() => toggleItem(item.id)}
                className="flex items-start gap-3 text-left flex-1"
              >
                <div
                  className={`w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 shrink-0 ${
                    item.completed
                      ? "bg-emerald-500 border-emerald-500 text-slate-950"
                      : "border-slate-600"
                  }`}
                >
                  {item.completed && <CheckCircle2 className="w-4 h-4" />}
                </div>
                <div>
                  <p
                    className={`text-sm font-semibold ${
                      item.completed
                        ? "line-through text-slate-400"
                        : "text-slate-100"
                    }`}
                  >
                    {item.text}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    {item.note}
                  </p>
                </div>
              </button>
              <button
                onClick={() => deleteItem(item.id)}
                className="text-slate-500 hover:text-red-400 p-1 shrink-0"
                title="Delete item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}