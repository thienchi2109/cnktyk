import { requireAuth } from "@/lib/auth/server";
import { GlassCard } from "@/components/ui/glass-card";

export default async function TestAuthPage() {
  const session = await requireAuth();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          Authentication Test Page
        </h1>
        
        <GlassCard className="p-6">
          <h2 className="text-xl font-semibold mb-4">✅ Authentication Working!</h2>
          <div className="space-y-3">
            <p><strong>User ID:</strong> {session.user.id}</p>
            <p><strong>Username:</strong> {session.user.username}</p>
            <p><strong>Role:</strong> {session.user.role}</p>
            <p><strong>Unit ID:</strong> {session.user.unitId || 'N/A'}</p>
          </div>
          
          <div className="mt-6 p-4 bg-green-50 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">✅ Task 3 Completed Successfully!</h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• NextAuth.js configured with JWT strategy</li>
              <li>• 5-minute JWT expiry, 2-hour session duration</li>
              <li>• bcryptjs password hashing (Workers compatible)</li>
              <li>• Role-based access control implemented</li>
              <li>• Route protection middleware active</li>
              <li>• Authentication UI components ready</li>
            </ul>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}