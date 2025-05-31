export const mockEquipmentData = {
  id: "HX300-2847",
  name: "HX-300 REGULATOR",
  model: "HX-300",
  issue: "Pressure valve misalignment detected",
  confidence: 0.94,
  position: { x: 33, y: 33, width: 48, height: 32 }
};

export const mockRepairSteps = [
  {
    id: 1,
    title: "Power Disconnection",
    description: "Disconnect the power supply to the hydraulic system",
    instructions: "Locate the main power switch and turn off the electrical supply to ensure safety during maintenance.",
    status: "completed" as const,
    subInstructions: [
      "Locate main power switch",
      "Verify power indicator is off",
      "Lock out/tag out procedures"
    ]
  },
  {
    id: 2,
    title: "Loosen Mounting Bolts",
    description: "Use a torque wrench to loosen the top mounting bolts",
    instructions: "Apply the correct torque specification and follow the cross pattern sequence to prevent warping.",
    status: "current" as const,
    subInstructions: [
      "Required tool: 3/4\" torque wrench",
      "Torque setting: 45 ft-lbs",
      "Loosen in cross pattern"
    ]
  },
  {
    id: 3,
    title: "Valve Realignment",
    description: "Realign the valve shaft to match the central pin",
    instructions: "Carefully adjust the valve position to ensure proper alignment with the central mounting pin.",
    status: "pending" as const,
    subInstructions: [
      "Check alignment marks",
      "Use alignment gauge",
      "Verify position before tightening"
    ]
  },
  {
    id: 4,
    title: "System Testing",
    description: "Reassemble and test system pressure",
    instructions: "Restore power and verify the system operates within normal pressure parameters.",
    status: "pending" as const,
    subInstructions: [
      "Tighten bolts to specification",
      "Restore power connection",
      "Monitor pressure readings"
    ]
  }
];

export const mockVoiceResponses = [
  "Equipment analysis complete. Hydraulic regulator HX-300 identified with pressure valve misalignment.",
  "Step 2 instructions ready. Please use a torque wrench to loosen the top mounting bolts.",
  "Remember to follow the cross pattern when loosening bolts for even pressure distribution.",
  "Confirm when step 2 is complete to proceed to valve realignment.",
  "Safety reminder: Ensure power remains disconnected throughout the repair process.",
  "This type of misalignment is common after 500 hours of operation on HX-300 units."
];
