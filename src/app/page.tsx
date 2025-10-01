import { GlassCard } from "../../components/ui/glass-card";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-medical-blue mb-4">
            CNKTYKLT Compliance Management Platform
          </h1>
          <p className="text-lg text-gray-600">
            Healthcare practitioner compliance tracking system for the Department of Health
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <GlassCard className="p-6">
            <h3 className="text-xl font-semibold text-medical-blue mb-3">
              Project Foundation
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>✅ Next.js 15 with App Router</li>
              <li>✅ TypeScript configuration</li>
              <li>✅ Tailwind CSS with glassmorphism</li>
              <li>✅ Project structure organized</li>
            </ul>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-xl font-semibold text-medical-green mb-3">
              Healthcare Theme
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-medical-blue rounded"></div>
                <span className="text-sm">Medical Blue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-medical-green rounded"></div>
                <span className="text-sm">Medical Green</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-medical-amber rounded"></div>
                <span className="text-sm">Medical Amber</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-medical-red rounded"></div>
                <span className="text-sm">Medical Red</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-xl font-semibold text-medical-blue mb-3">
              Environment Setup
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>✅ Database configuration</li>
              <li>✅ Cloudflare R2 setup</li>
              <li>✅ NextAuth configuration</li>
              <li>✅ Environment variables</li>
            </ul>
          </GlassCard>
        </div>

        <GlassCard className="p-8 text-center">
          <h2 className="text-2xl font-semibold text-medical-blue mb-4">
            Ready for Development
          </h2>
          <p className="text-gray-600 mb-6">
            The project foundation has been successfully set up with Next.js 15, 
            glassmorphism UI components, and healthcare-focused design system.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="glass-button px-6 py-3 text-medical-blue font-medium">
              View Project Structure
            </button>
            <button className="glass-button px-6 py-3 text-medical-green font-medium">
              Start Development
            </button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
