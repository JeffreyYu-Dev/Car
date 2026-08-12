export interface DriverProfile {
  id: number;
  name: string;
  age: number;
  licenseType: "learner" | "intermediate" | "full";
  yearsExperience: "<1" | "1-3" | "3-10" | "10+";
  mechanicalActions: string[];
  selfRatedProficiency: "novice" | "basic" | "intermediate" | "advanced";
  preferredGuidanceStyle: "safety_only" | "technical" | "both";
  physicalLimitations: string[];
  physicalLimitationsOther: string | null;
  maintenanceRelationship: "diy" | "mechanic" | "mix" | null;
}
