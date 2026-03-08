"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-provider";
import {
    UserPlus,
    Mail,
    Shield,
    Crown,
    Clock,
    Briefcase,
    Users,
    Loader2,
    CheckCircle2,
} from "lucide-react";

interface Member {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    role: string;
    joinedAt: string;
}

interface PendingInvite {
    email: string;
    role: string;
    expiresAt: string;
}

export default function InvitePage() {
    const { user } = useAuth();
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<"MEMBER" | "PROJECT_MANAGER">("MEMBER");
    const [members, setMembers] = useState<Member[]>([]);
    const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
    const [workspaceName, setWorkspaceName] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const isAdmin = user?.workspaceRole === "ADMIN";

    const fetchMembers = async () => {
        try {
            setIsLoading(true);
            const data = await apiRequest<{
                members: Member[];
                pendingInvites: PendingInvite[];
                workspaceName: string;
            }>("/auth/workspaces/members");

            setMembers(data.members);
            setPendingInvites(data.pendingInvites);
            setWorkspaceName(data.workspaceName);
        } catch (err) {
            console.error("Failed to fetch members:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, []);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setError(null);
        setSuccessMessage(null);
        setIsSending(true);

        try {
            await apiRequest("/auth/workspaces/invite", {
                method: "POST",
                data: { email: email.trim(), role },
            });

            setSuccessMessage(`Invitation sent to ${email}`);
            setEmail("");
            fetchMembers();

            setTimeout(() => setSuccessMessage(null), 5000);
        } catch (err: any) {
            setError(err.message || "Failed to send invite");
        } finally {
            setIsSending(false);
        }
    };

    const handleRoleChange = async (memberId: string, newRole: string) => {
        try {
            await apiRequest(`/auth/workspaces/members/${memberId}`, {
                method: "PATCH",
                data: { role: newRole },
            });
            fetchMembers();
        } catch (err: any) {
            alert(err.message || "Failed to update role");
        }
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case "ADMIN":
                return <Crown className="w-4 h-4 text-amber-500" />;
            case "PROJECT_MANAGER":
                return <Briefcase className="w-4 h-4 text-blue-500" />;
            default:
                return <Users className="w-4 h-4 text-neutral-400" />;
        }
    };

    const getRoleBadge = (role: string) => {
        const styles: Record<string, string> = {
            ADMIN: "bg-amber-50 text-amber-700 border-amber-200",
            PROJECT_MANAGER: "bg-blue-50 text-blue-700 border-blue-200",
            MEMBER: "bg-neutral-50 text-neutral-600 border-neutral-200",
        };

        const labels: Record<string, string> = {
            ADMIN: "Admin",
            PROJECT_MANAGER: "Project Manager",
            MEMBER: "Member",
        };

        return (
            <span
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${styles[role] || styles.MEMBER}`}
            >
                {getRoleIcon(role)}
                {labels[role] || role}
            </span>
        );
    };

    return (
        <div className="space-y-8 max-w-3xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold text-neutral-900">
                    Team & Invitations
                </h1>
                <p className="text-neutral-500 text-sm mt-1">
                    Manage members and invite new people to{" "}
                    <span className="font-medium text-neutral-700">{workspaceName}</span>
                </p>
            </div>

            {/* Invite Form (Admin Only) */}
            {isAdmin && (
                <div className="bg-white border border-neutral-200 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                            <UserPlus className="w-4 h-4 text-primary" />
                        </div>
                        <h2 className="text-lg font-semibold">Invite a Team Member</h2>
                    </div>

                    <form onSubmit={handleInvite} className="space-y-4">
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full !pl-10 !pr-4 !py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        placeholder="Ex. colleague@company.com"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="w-48">
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                    Role
                                </label>
                                <select
                                    value={role}
                                    onChange={(e) =>
                                        setRole(e.target.value as "MEMBER" | "PROJECT_MANAGER")
                                    }
                                    className="w-full py-2.5 px-3 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                                >
                                    <option value="MEMBER">Member</option>
                                    <option value="PROJECT_MANAGER">Project Manager</option>
                                </select>
                            </div>
                        </div>

                        {error && (
                            <p className="text-red-500 text-sm">{error}</p>
                        )}

                        {successMessage && (
                            <div className="flex items-center gap-2 text-emerald-600 text-sm bg-emerald-50 px-4 py-2.5 rounded-xl">
                                <CheckCircle2 className="w-4 h-4" />
                                {successMessage}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="gap-2"
                            disabled={!email.trim() || isSending}
                            loading={isSending}
                        >
                            <Mail className="w-4 h-4" />
                            Send Invitation
                        </Button>
                    </form>
                </div>
            )}

            {/* Members List */}
            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-neutral-100">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Shield className="w-4 h-4 text-neutral-400" />
                        Workspace Members
                        <span className="text-neutral-400 font-normal text-sm">
                            ({members.length})
                        </span>
                    </h3>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center h-32">
                        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
                    </div>
                ) : (
                    <div className="divide-y divide-neutral-100">
                        {members.map((member) => (
                            <div
                                key={member.id}
                                className="flex items-center justify-between px-6 py-4 hover:bg-neutral-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                        <span className="text-primary font-semibold text-sm">
                                            {(member.firstName?.[0] || "") +
                                                (member.lastName?.[0] || "")}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">
                                            {member.firstName} {member.lastName}
                                        </p>
                                        <p className="text-xs text-neutral-500">{member.email}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {isAdmin && member.role !== "ADMIN" ? (
                                        <select
                                            value={member.role}
                                            onChange={(e) =>
                                                handleRoleChange(member.id, e.target.value)
                                            }
                                            className="text-xs px-2 py-1.5 border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        >
                                            <option value="MEMBER">Member</option>
                                            <option value="PROJECT_MANAGER">Project Manager</option>
                                        </select>
                                    ) : (
                                        getRoleBadge(member.role)
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pending Invites */}
            {pendingInvites.length > 0 && (
                <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-neutral-100">
                        <h3 className="font-semibold flex items-center gap-2">
                            <Clock className="w-4 h-4 text-neutral-400" />
                            Pending Invitations
                            <span className="text-neutral-400 font-normal text-sm">
                                ({pendingInvites.length})
                            </span>
                        </h3>
                    </div>
                    <div className="divide-y divide-neutral-100">
                        {pendingInvites.map((invite, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between px-6 py-4"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center">
                                        <Mail className="w-4 h-4 text-neutral-400" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{invite.email}</p>
                                        <p className="text-xs text-neutral-500">
                                            Expires{" "}
                                            {new Date(invite.expiresAt).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                            })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {getRoleBadge(invite.role)}
                                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full font-medium">
                                        Pending
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
