import Image from "next/image";
import Logo from "@/../public/images/logo.png";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-between">
      <div className="space-y-32 px-32 py-8 h-screen">
        <Image src={Logo} alt="Logo of Loopy"></Image>
        {children}
      </div>
      <Image
        src="/images/auth-illustration.png"
        className="h-screen w-auto"
        alt="Illustration of Loopy"
        width={480}
        height={900}
      ></Image>
    </div>
  );
}
