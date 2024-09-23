
const NoiseOverlay = () => (
  <div
    className="fixed inset-0 pointer-events-none z-50 mix-blend-multiply"
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 1000 1000' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      filter: 'contrast(120%) brightness(120%)',
    }}
  />
);

export default function Page() {
  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-white relative overflow-hidden">
      <NoiseOverlay />
      <div className="text-center text-gray-900 p-8 relative z-10">
        <h1 className="text-5xl font-semibold mb-4 tracking-tight">
          Welcome to your app
        </h1>
        <p className="text-2xl text-gray-800 mb-8">
          Open this page in Onlook to start
        </p>
      </div>
    </div>
  );
}