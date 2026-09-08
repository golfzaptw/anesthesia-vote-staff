export default function VoterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-md min-h-screen bg-slate-50 relative shadow-2xl overflow-x-hidden mx-auto">
      {children}
    </div>
  );
}
