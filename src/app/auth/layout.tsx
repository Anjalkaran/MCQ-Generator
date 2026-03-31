
import { GovernmentDisclaimer } from "@/components/government-disclaimer";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden bg-slate-50">
      {/* Mesh Gradient Background (Brand Colors) */}
      <div className="absolute inset-0 -z-10 animate-fade-in opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-red-600/15 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-orange-400/10 blur-[120px]" />
        <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-red-500/10 blur-[100px]" />
      </div>

      {/* Decorative Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/[0.03] rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-orange-500/[0.03] rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />

      <main className="relative z-10 w-full max-w-[1440px] px-4 py-8 flex items-center justify-center flex-1">
        <div className="w-full flex flex-col items-center">
          {children}
        </div>
      </main>
      <div className="relative z-10 w-full max-w-2xl px-4 pb-8">
        <GovernmentDisclaimer />
      </div>
    </div>
  );
}

