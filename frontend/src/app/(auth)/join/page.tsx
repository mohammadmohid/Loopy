"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-provider";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import RegisterForm from "../getting-started/_components/RegisterForm";

function JoinContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, login } = useAuth();

    const token = searchParams.get("token") || "";
    const [inviteInfo, setInviteInfo] = useState<any>(null);
    const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "joined" | "needs-register">("loading");
    const [error, setError] = useState<string | null>(null);
    const [isJoining, setIsJoining] = useState(false);

    useEffect(() => {
        if (!token) {
            setStatus("invalid");
            setError("No invite token provided");
            return;
        }

        const validateInvite = async () => {
            try {
                const response = await apiRequest<{
                    success: boolean;
                    invite: any;
                }>("/auth/workspaces/accept-invite", {
                    method: "POST",
                    data: { token },
                });

                if (response.success) {
                    setInviteInfo(response.invite);
                    if (user) {
                        setStatus("valid");
                    } else {
                        setStatus("needs-register");
                    }
                }
            } catch (err: any) {
                setStatus("invalid");
                setError(err.message || "Invalid or expired invite");
            }
        };

        validateInvite();
    }, [token, user]);

    const handleJoin = async () => {
        setIsJoining(true);
        try {
            const response = await apiRequest<{
                success: boolean;
                workspace: { id: string; name: string };
            }>("/auth/workspaces/join", {
                method: "POST",
                data: { token },
            });

            if (response.success) {
                // Refresh user data
                try {
                    const meResponse = await apiRequest<{ user: any }>("/auth/me");
                    login(meResponse.user);
                } catch { }
                setStatus("joined");
                setTimeout(() => router.push("/home"), 1500);
            }
        } catch (err: any) {
            setError(err.message || "Failed to join workspace");
        } finally {
            setIsJoining(false);
        }
    };

    if (status === "loading") {
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-neutral-500">Validating invite...</p>
            </div>
        );
    }

    if (status === "invalid") {
        return (
            <div className="space-y-6 text-center">
                <div className="flex justify-center">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                        <XCircle className="w-8 h-8 text-red-500" />
                    </div>
                </div>
                <div>
                    <h1 className="font-medium text-2xl">Invalid Invitation</h1>
                    <p className="text-neutral-600 mt-2">{error || "This invite link is invalid or has expired."}</p>
                </div>
                <Link href="/login">
                    <Button variant="secondary">Go to Login</Button>
                </Link>
            </div>
        );
    }

    if (status === "joined") {
        return (
            <div className="space-y-6 text-center">
                <div className="flex justify-center">
                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    </div>
                </div>
                <div>
                    <h1 className="font-medium text-2xl">Welcome aboard!</h1>
                    <p className="text-neutral-600 mt-2">
                        You&apos;ve joined <span className="font-semibold">{inviteInfo?.workspaceName}</span>.
                        Redirecting to dashboard...
                    </p>
                </div>
            </div>
        );
    }

    if (status === "valid" && user) {
        return (
            <div className="space-y-6">
                <header>
                    <h1 className="font-medium text-2xl">Join Workspace</h1>
                    <p className="text-neutral-600">
                        You&apos;ve been invited to join <span className="font-semibold">{inviteInfo?.workspaceName}</span>
                        {inviteInfo?.role === "PROJECT_MANAGER" && (
                            <span> as a <span className="font-semibold text-primary">Project Manager</span></span>
                        )}
                    </p>
                </header>

                <div className="bg-card border border-neutral-200 rounded-xl p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                            <span className="text-primary font-bold text-lg">
                                {inviteInfo?.workspaceName?.charAt(0)?.toUpperCase()}
                            </span>
                        </div>
                        <div>
                            <p className="font-semibold">{inviteInfo?.workspaceName}</p>
                            <p className="text-sm text-neutral-500">Role: {inviteInfo?.role}</p>
                        </div>
                    </div>

                    <Button className="w-full" onClick={handleJoin} loading={isJoining}>
                        Join Workspace
                    </Button>
                </div>
            </div>
        );
    }

    // needs-register: show registration form for new users
    return (
        <div className="space-y-6">
            <header>
                <h1 className="font-medium text-2xl">Create your account</h1>
                <p className="text-neutral-600">
                    You&apos;ve been invited to <span className="font-semibold">{inviteInfo?.workspaceName}</span>.
                    Create an account to join.
                </p>
            </header>
            <RegisterForm inviteToken={token} inviteEmail={inviteInfo?.email} />
        </div>
    );
}

export default function JoinPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <JoinContent />
        </Suspense>
    );
}
