"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-provider";

function VerifyOTPContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login } = useAuth();

    const userId = searchParams.get("userId") || "";
    const email = searchParams.get("email") || "";

    const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
    const [error, setError] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, []);

    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const handleChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when all 6 digits entered
        const fullCode = newOtp.join("");
        if (fullCode.length === 6) {
            handleVerify(fullCode);
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (pasted.length === 0) return;

        const newOtp = Array(6).fill("");
        for (let i = 0; i < pasted.length; i++) {
            newOtp[i] = pasted[i];
        }
        setOtp(newOtp);

        const focusIndex = Math.min(pasted.length, 5);
        inputRefs.current[focusIndex]?.focus();

        if (pasted.length === 6) {
            handleVerify(pasted);
        }
    };

    const handleVerify = async (code: string) => {
        setError(null);
        setIsVerifying(true);

        try {
            const response = await apiRequest<{
                success: boolean;
                needsWorkspace: boolean;
                user: any;
            }>("/auth/verify-otp", {
                method: "POST",
                data: { userId, code },
            });

            if (response.success && response.user) {
                login(response.user);
                if (response.needsWorkspace) {
                    router.push("/create-workspace");
                } else {
                    router.push("/home");
                }
            }
        } catch (err: any) {
            setError(err.message || "Invalid code");
            setOtp(Array(6).fill(""));
            inputRefs.current[0]?.focus();
        } finally {
            setIsVerifying(false);
        }
    };

    const handleResend = async () => {
        if (resendCooldown > 0) return;

        try {
            await apiRequest("/auth/resend-otp", {
                method: "POST",
                data: { userId },
            });
            setResendCooldown(60);
            setError(null);
        } catch (err: any) {
            setError(err.message || "Failed to resend code");
        }
    };

    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-medium text-2xl">Check your email</h1>
                <p className="text-neutral-600">
                    We sent a 6-digit code to{" "}
                    <span className="font-semibold text-foreground">{email}</span>
                </p>
            </header>

            <div className="space-y-6">
                {/* OTP Input */}
                <div className="flex gap-3 justify-center" onPaste={handlePaste}>
                    {otp.map((digit, index) => (
                        <input
                            key={index}
                            ref={(el) => { inputRefs.current[index] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            className="w-12 h-14 text-center text-xl font-bold border-2 border-neutral-200 rounded-xl
                focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none
                transition-all duration-200"
                            disabled={isVerifying}
                        />
                    ))}
                </div>

                {error && (
                    <p className="text-red-500 text-sm font-medium text-center">{error}</p>
                )}

                <div className="text-center space-y-3">
                    <Button
                        className="w-full max-w-sm"
                        onClick={() => handleVerify(otp.join(""))}
                        disabled={otp.join("").length !== 6 || isVerifying}
                        loading={isVerifying}
                    >
                        Verify Email
                    </Button>

                    <p className="text-sm text-neutral-500">
                        Didn&apos;t receive a code?{" "}
                        <button
                            onClick={handleResend}
                            disabled={resendCooldown > 0}
                            className="text-primary hover:underline font-medium disabled:text-neutral-400 disabled:no-underline cursor-pointer disabled:cursor-default"
                        >
                            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function VerifyOTPPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <VerifyOTPContent />
        </Suspense>
    );
}
