import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <>
      <link rel="preload" href="/sky-hero.webp" as="image" type="image/webp" />
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080808]">
        {/* Sky background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url('/sky-hero.webp')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="hero-overlay absolute inset-0" />

        {/* Subtle animated glow */}
        <div className="absolute left-1/2 top-1/3 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500/8 blur-[100px]" />

        <div className="relative z-10">
          <SignIn />
        </div>
      </div>
    </>
  );
}
