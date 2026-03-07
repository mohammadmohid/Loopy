"use client";

import RegisterForm from "./_components/RegisterForm";
import { Suspense } from "react";

function GettingStartedContent() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-medium text-2xl">Create your account</h1>
        <p className="text-neutral-600">
          Get started with Loopy — manage projects, meetings, and team collaboration.
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
