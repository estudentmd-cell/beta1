export default function PhoneCard({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[440px] bg-card rounded-[16px] shadow p-6 md:p-8 animate-[fadeIn_0.4s_ease]">
        {children}
      </div>
    </div>
  );
}
