import { useContext } from "react";
import AuthStateContext from "./AuthStateContext";

export default function useAuth() {
  const context = useContext(AuthStateContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
