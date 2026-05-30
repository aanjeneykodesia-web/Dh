import { useEffect } from "react";
import { useLocation } from "wouter";

export function Login() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/signup");
  }, [setLocation]);
  return null;
}
