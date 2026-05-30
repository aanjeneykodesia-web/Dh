import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Phone, Building2, ArrowLeft, Lock, Eye, EyeOff } from "lucide-react";
import {
  useCheckPhone,
  useSignupWithPhone,
  useLoginWithPhone,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Step = "phone" | "password" | "details";
type Role = "shopkeeper" | "manufacturer" | "transporter";
type IdProofType = "aadhaar" | "pan" | "passport" | "drivers_license" | "voter_id";

const ID_PROOF_LABELS: Record<IdProofType, string> = {
  aadhaar: "Aadhaar",
  pan: "PAN card",
  passport: "Passport",
  drivers_license: "Driver's licence",
  voter_id: "Voter ID",
};

const ROLE_LABELS: Record<Role, string> = {
  shopkeeper: "Shopkeeper / Retailer",
  manufacturer: "Manufacturer / Brand",
  transporter: "Transporter / Logistics",
};

function PasswordInput({
  value,
  onChange,
  placeholder,
  id,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id?: string;
  autoFocus?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "••••••••"}
        className="pr-10"
        autoFocus={autoFocus}
      />
      <button
        type="button"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        onClick={() => setShow((v) => !v)}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function Signup() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");

  // Profile fields (new account)
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("shopkeeper");
  const [companyName, setCompanyName] = useState("");
  const [idProofType, setIdProofType] = useState<IdProofType>("aadhaar");
  const [idProofNumber, setIdProofNumber] = useState("");
  const [gstin, setGstin] = useState("");
  const [city, setCity] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const checkPhone = useCheckPhone();
  const signup = useSignupWithPhone();
  const loginPhone = useLoginWithPhone();

  const invalidateMe = () => queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });

  const apiError = (err: unknown) =>
    (err as { response?: { data?: { error?: string } } })?.response?.data?.error;

  // Step 1 — check phone
  const handleContinue = () => {
    if (phoneNumber.replace(/\D/g, "").length < 7) {
      toast.error("Please enter a valid phone number");
      return;
    }
    checkPhone.mutate(
      { data: { phoneNumber } },
      {
        onSuccess: (resp) => {
          if (resp.hasPassword) {
            setStep("password");
          } else {
            setStep("details");
          }
        },
        onError: () => toast.error("Could not reach the server. Try again."),
      },
    );
  };

  // Step 2a — password login
  const handlePasswordLogin = () => {
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    loginPhone.mutate(
      { data: { phoneNumber, password } },
      {
        onSuccess: (user) => {
          invalidateMe();
          toast.success(`Welcome back, ${user.name}`);
          setLocation("/");
        },
        onError: (err) => toast.error(apiError(err) ?? "Incorrect password"),
      },
    );
  };

  // Step 2b — create account
  const handleCreateAccount = () => {
    if (name.trim().length < 2) { toast.error("Please enter your name"); return; }
    if (companyName.trim().length < 2) { toast.error("Please enter your business name"); return; }
    if (idProofNumber.trim().length < 4) { toast.error("Please enter your ID proof number"); return; }
    if (gstin.trim().length !== 15) { toast.error("GSTIN must be 15 characters"); return; }
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }

    signup.mutate(
      {
        data: {
          phoneNumber,
          name: name.trim(),
          role,
          companyName: companyName.trim(),
          idProofType,
          idProofNumber: idProofNumber.trim(),
          gstin: gstin.trim(),
          password: newPassword,
          city: city.trim() || null,
        },
      },
      {
        onSuccess: (user) => {
          invalidateMe();
          toast.success(`Welcome to TradeRoute, ${user.name}`);
          setLocation("/");
        },
        onError: (err) => toast.error(apiError(err) ?? "Could not create your account"),
      },
    );
  };

  const STEP_LABELS: Record<Step, string> = { phone: "Phone", password: "Password", details: "Details" };
  const steps: Step[] = step === "password" ? ["phone", "password"] : ["phone", "details"];
  const stepIndex = steps.indexOf(step);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 bg-primary rounded-xl items-center justify-center text-primary-foreground font-bold text-xl mb-3">
            TR
          </div>
          <h1 className="text-2xl font-bold tracking-tight">TradeRoute</h1>
          <p className="text-muted-foreground text-sm mt-1">Sign in or create an account</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-1 mb-6">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                  i <= stepIndex
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`text-xs ${
                  i <= stepIndex ? "text-foreground font-medium" : "text-muted-foreground"
                }`}
              >
                {STEP_LABELS[s]}
              </span>
              {i < steps.length - 1 && <div className="w-4 h-px bg-border mx-1" />}
            </div>
          ))}
        </div>

        <Card>
          <AnimatePresence mode="wait">
            {/* ── Phone ── */}
            {step === "phone" && (
              <motion.div
                key="phone"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.18 }}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Phone className="h-4 w-4" /> Enter your mobile number
                  </CardTitle>
                  <CardDescription>We'll check if you have an account.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Mobile number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleContinue()}
                      autoFocus
                    />
                  </div>
                  <Button className="w-full" onClick={handleContinue} disabled={checkPhone.isPending}>
                    {checkPhone.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Continue
                  </Button>
                </CardContent>
              </motion.div>
            )}

            {/* ── Password login ── */}
            {step === "password" && (
              <motion.div
                key="password"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.18 }}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Lock className="h-4 w-4" /> Enter your password
                  </CardTitle>
                  <CardDescription>
                    Signing in as{" "}
                    <span className="font-medium text-foreground">{phoneNumber}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pw">Password</Label>
                    <PasswordInput id="pw" value={password} onChange={setPassword} autoFocus />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handlePasswordLogin}
                    disabled={loginPhone.isPending}
                  >
                    {loginPhone.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Sign in
                  </Button>
                  <button
                    type="button"
                    className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                    onClick={() => { setStep("phone"); setPassword(""); }}
                  >
                    <ArrowLeft className="h-3 w-3" /> Change number
                  </button>
                </CardContent>
              </motion.div>
            )}

            {/* ── Details (new account) ── */}
            {step === "details" && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.18 }}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Building2 className="h-4 w-4" /> Create your account
                  </CardTitle>
                  <CardDescription>
                    New account for{" "}
                    <span className="font-medium text-foreground">{phoneNumber}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Riya Sharma"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>I am a</Label>
                    <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                          <SelectItem key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Business name</Label>
                    <Input
                      id="company"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Sharma Traders"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>ID proof</Label>
                      <Select
                        value={idProofType}
                        onValueChange={(v) => setIdProofType(v as IdProofType)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(ID_PROOF_LABELS) as IdProofType[]).map((k) => (
                            <SelectItem key={k} value={k}>
                              {ID_PROOF_LABELS[k]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="idnum">ID number</Label>
                      <Input
                        id="idnum"
                        value={idProofNumber}
                        onChange={(e) => setIdProofNumber(e.target.value.toUpperCase())}
                        placeholder="ABCDE1234F"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gstin">GSTIN</Label>
                    <Input
                      id="gstin"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase())}
                      placeholder="22AAAAA0000A1Z5"
                      maxLength={15}
                    />
                    <p className="text-xs text-muted-foreground">15-character GST Identification Number</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City (optional)</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Mumbai"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="npw">Password</Label>
                    <PasswordInput
                      id="npw"
                      value={newPassword}
                      onChange={setNewPassword}
                      placeholder="Min. 6 characters"
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleCreateAccount}
                    disabled={signup.isPending}
                  >
                    {signup.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create account
                  </Button>
                  <button
                    type="button"
                    className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                    onClick={() => setStep("phone")}
                  >
                    <ArrowLeft className="h-3 w-3" /> Change number
                  </button>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </div>
    </div>
  );
}
