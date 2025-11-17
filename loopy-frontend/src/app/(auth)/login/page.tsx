import LoginForm from "./_components/LoginForm";

export default function Login() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-medium text-2xl">Automate your meeting</h1>
        <p className="text-neutral-600">
          Transcribe, summarize, search and analyze all meetings.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
