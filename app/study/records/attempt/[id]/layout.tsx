import { Suspense } from "react";

export default function AttemptDetailLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
          <div className="mx-auto max-w-4xl px-4 py-8 text-center font-black text-[#789083]">
            正在讀取這次作答...
          </div>
        </main>
      }
    >
      {children}
    </Suspense>
  );
}
