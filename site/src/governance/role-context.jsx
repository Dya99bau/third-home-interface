import { createContext, useContext, useState } from "react";

const RoleContext = createContext({ role: "guest", setRole: () => {} });

export function RoleProvider({ children }) {
  const [role, setRole] = useState("guest");
  return <RoleContext.Provider value={{ role, setRole }}>{children}</RoleContext.Provider>;
}

export function useRole() {
  return useContext(RoleContext);
}
