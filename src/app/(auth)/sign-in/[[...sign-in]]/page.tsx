import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#080808] overflow-hidden">
      {/* Sky background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/sky-hero.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="hero-overlay absolute inset-0" />

      {/* Subtle animated glow */}
      <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-sky-500/8 blur-[100px]" />

      <div className="relative z-10">
        <SignIn />
      </div>
    </div>
  );
}
