"use client";

import RegisterForm from "./_components/RegisterForm";
import { Suspense } from "react";

function GettingStartedContent() {
  return (
    <div className="space-y-8 flex flex-col items-center">
      <header className="text-center">
        <h1 className="font-medium text-2xl">Create your account</h1>
        <p className="w-[48ch] text-neutral-600">
          Manage projects, meetings, and team collaboration.
        </p>
      </header>

      <RegisterForm />
    </div>
  );
}

export default function GettingStarted() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GettingStartedContent />
    </Suspense>
  );
}
