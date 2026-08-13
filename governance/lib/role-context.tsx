"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { Role } from "./data";

interface RoleContextType {
  role: Role;
  setRole: (r: Role) => void;
}

const RoleContext = createContext<RoleContextType>({ role: "guest", setRole: () => {} });

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("guest");
  return <RoleContext.Provider value={{ role, setRole }}>{children}</RoleContext.Provider>;
}

export function useRole() {
  return useContext(RoleContext);
}
