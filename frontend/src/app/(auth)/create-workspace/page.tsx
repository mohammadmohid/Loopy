"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-provider";
import { Building2 } from "lucide-react";

export default function CreateWorkspacePage() {
    const router = useRouter();
    const { login } = useAuth();
    const [name, setName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError("Workspace name is required");
            return;
        }

        setError(null);
        setIsCreating(true);

        try {
            const response = await apiRequest<{
                success: boolean;
                workspace: { id: string; name: string };
            }>("/auth/workspaces", {
                method: "POST",
                data: { name: name.trim() },
            });

            if (response.success) {
                // Refresh user data to include workspace
                try {
                    const meResponse = await apiRequest<{ user: any }>("/auth/me");
                    login(meResponse.user);
                } catch { }
                router.push("/home");
            }
        } catch (err: any) {
            setError(err.message || "Failed to create workspace");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-medium text-2xl">Name your workspace</h1>
                <p className="text-neutral-600">
                    This is your team&apos;s home. Use your organization or team name.
                </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6 max-w-sm">
                <div className="space-y-2">
                    <label className="text-sm font-medium block">Workspace Name</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full !pl-10 !pr-4 !py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            placeholder="e.g. Acme Corp"
                            autoFocus
                        />
                    </div>
                    {error && (
                        <p className="text-red-500 text-xs">{error}</p>
                    )}
                </div>

                <Button
                    type="submit"
                    className="w-full"
                    disabled={!name.trim() || isCreating}
                    loading={isCreating}
                >
                    Create Workspace
                </Button>
            </form>
        </div>
    );
}
