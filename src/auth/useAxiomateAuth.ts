import { useContext } from "react";
import { AuthContext } from "./authContext";

export function useAxiomateAuth() {
  return useContext(AuthContext);
}
