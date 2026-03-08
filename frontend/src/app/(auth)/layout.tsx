import Image from "next/image";
import Logo from "@/../public/images/logo.png";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className=" relative flex min-h-screen items-center justify-between">
      <div className="space-y-6 content-center mx-auto max-w-lg h-screen">
        <div>
          <Link href="/">
            <Image src={Logo} alt="Logo of Loopy" />
          </Link>

        </div>

        {children}
      </div>
      <Image
        src="/images/auth-illustration.png"
        className="h-screen w-auto bg-white"
        alt="Illustration of Loopy"
        width={480}
        height={900}
      ></Image>
    </div>
  );
}
