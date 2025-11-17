"use client";

import RegisterForm from "./RegisterForm";
import { Button } from "@/components/ui/button";
import { Building, ChevronLeft, Users } from "lucide-react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function GettingStarted() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const step = searchParams.get("step") || "select";
  const accountType = searchParams.get("accountType") as
    | "organization"
    | "personal-team"
    | null;
  const orgEmailFromURL = searchParams.get("orgEmail") || "";

  const [orgEmail, setOrgEmail] = useState(orgEmailFromURL);

  const go = (params: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    router.push(`/getting-started?${query}`);
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-medium text-2xl">Automate your meeting</h1>
        <p className="text-text-600">
          Transcribe, summarize, search and analyze all meetings.
        </p>
      </header>

      {step === "select" && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="organization"
              className="cursor-pointer flex items-center gap-4 hover:bg-foreground/5 border border-text-200 rounded-md px-4 py-3"
            >
              <input
                type="radio"
                id="organization"
                checked={accountType === "organization"}
                onChange={() =>
                  go({ step: "org-form", accountType: "organization" })
                }
                name="account-type"
                value="organization"
              />
              <div className="flex flex-col  w-full font-medium">
                Organization
                <span className="text-sm text-text-600 font-normal max-w-[50ch]">
                  Manage teams, members and projects of your organization.
                </span>
              </div>
              <div className="bg-[#F4F4F5] p-4 rounded-md">
                <Building className="text-brand" />
              </div>
            </label>
            <label
              htmlFor="personal-team"
              className="cursor-pointer flex items-center gap-4 hover:bg-foreground/5 border border-text-200 rounded-md px-4 py-3"
            >
              <input
                type="radio"
                checked={accountType === "personal-team"}
                onChange={() =>
                  go({ step: "org-choice", accountType: "personal-team" })
                }
                id="personal-team"
                name="account-type"
                value="personal-team"
              />
              <div className="flex flex-col w-full font-medium">
                Personal / Team Member
                <span className="text-sm text-text-600 font-normal max-w-[50ch]">
                  Create an individual account or link to an organization.
                </span>
              </div>
              <div className="bg-[#F4F4F5] p-4 rounded-md">
                <Users className="text-brand" />
              </div>
            </label>
          </div>
        </div>
      )}

      {step !== "select" && (
        <div className="border border-text-200 rounded-md p-4 flex gap-8 justify-between items-center">
          <div className="flex flex-col gap-2">
            <span className="text-sm text-text-600">
              Selected:{" "}
              <span className="font-semibold">
                {accountType === "organization"
                  ? "Organization Account"
                  : "Personal / Team Member"}
              </span>
            </span>
            {step !== "team-form" && orgEmailFromURL !== "" && (
              <span className="text-sm text-text-600 truncate w-[40ch]">
                Organization: <span className="font-semibold">{orgEmail}</span>
              </span>
            )}
          </div>

          <button
            className="text-sm underline text-brand cursor-pointer"
            onClick={() => go({ step: "select" })}
          >
            Change
          </button>
        </div>
      )}

      {step === "org-choice" && (
        <div className="space-y-4">
          <p className="text-text-600">Are you part of an organization?</p>
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={() =>
                go({ step: "team-form", accountType: "personal-team" })
              }
            >
              Yes
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() =>
                go({ step: "personal-form", accountType: "personal-team" })
              }
            >
              No
            </Button>
          </div>
        </div>
      )}

      {step === "team-form" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!orgEmail.trim()) return;
            go({
              step: "personal-form",
              accountType: "personal-team",
              orgEmail,
            });
          }}
          className="flex flex-col gap-4"
        >
          <a
            className="flex items-center gap-1 cursor-pointer"
            onClick={() =>
              go({ step: "org-choice", accountType: "personal-team" })
            }
          >
            <ChevronLeft />
            Back
          </a>
          <label className="flex flex-col gap-1">
            Organization Email
            <input
              type="email"
              className="border px-3 py-2 rounded"
              value={orgEmail}
              onChange={(e) => setOrgEmail(e.target.value)}
              required
            />
          </label>
          <Button type="submit">Continue</Button>
        </form>
      )}

      {step === "org-form" && (
        <>
          <RegisterForm userType="organization_admin" />
        </>
      )}

      {step === "personal-form" && (
        <>
          <a
            className="flex items-center text-foreground gap-1 cursor-pointer"
            onClick={() =>
              orgEmailFromURL
                ? go({
                    step: "team-form",
                    accountType: "personal-team",
                    orgEmail,
                  })
                : go({
                    step: "org-choice",
                    accountType: "personal-team",
                  })
            }
          >
            <ChevronLeft />
            Back
          </a>
          <RegisterForm
            userType={orgEmail ? "team_member" : "personal"}
            organizationEmail={orgEmail || null}
          />
        </>
      )}
    </div>
  );
}
