import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <>
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080808]">
        {/* Sky background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
          src="https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9%2F68bb73e8d95f81619ab0f106_Clouds1-transcode.mp4"
        />
        <div className="hero-overlay absolute inset-0" />

        {/* Subtle animated glow */}
        <div className="absolute left-1/2 top-1/3 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500/8 blur-[100px]" />

        <div className="relative z-10">
          <SignUp />
        </div>
      </div>
    </>
  );
}
