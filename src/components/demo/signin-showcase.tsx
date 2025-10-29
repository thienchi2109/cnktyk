'use client';

import * as React from "react";
import { GlassCard, GlassButton } from "@/components/ui";
import { ResponsiveNavigation } from "@/components/layout";
import { 
  Palette, 
  Sparkles, 
  Heart, 
  Shield, 
  Monitor, 
  Smartphone,
  Eye,
  Zap
} from "lucide-react";

export const SignInShowcase = () => {
  const mockUser = {
    name: "Demo User",
    role: "NguoiHanhNghe",
    avatar: undefined
  };

  const features = [
    {
      icon: <Sparkles className="h-6 w-6" />,
      title: "Modern Glassmorphism",
      description: "Enhanced glass effects with better depth, shadows, and smooth animations",
      color: "from-blue-500/20 to-cyan-500/20"
    },
    {
      icon: <Heart className="h-6 w-6" />,
      title: "Healthcare Theme",
      description: "Medical icons, healthcare-focused color palette, and professional branding",
      color: "from-red-500/20 to-pink-500/20"
    },
    {
      icon: <Palette className="h-6 w-6" />,
      title: "Visual Enhancements",
      description: "Animated gradient orbs, floating medical elements, and layered visual hierarchy",
      color: "from-purple-500/20 to-indigo-500/20"
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Interactive Elements",
      description: "Hover effects, smooth transitions, and enhanced form inputs with icons",
      color: "from-green-500/20 to-emerald-500/20"
    },
    {
      icon: <Monitor className="h-6 w-6" />,
      title: "Desktop Layout",
      description: "Two-column layout with informative left panel and feature cards",
      color: "from-amber-500/20 to-orange-500/20"
    },
    {
      icon: <Smartphone className="h-6 w-6" />,
      title: "Mobile Responsive",
      description: "Optimized mobile design with centered layout and touch-friendly elements",
      color: "from-teal-500/20 to-cyan-500/20"
    }
  ];

  return (
    <ResponsiveNavigation
      user={mockUser}
      notifications={0}
      activeItem="dashboard"
      onNavigate={(item) => console.log('Navigate to:', item)}
    >
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 backdrop-blur-md border border-white/30 shadow-xl">
              <Shield className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-4">
            Modern Healthcare Sign-In
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
            A redesigned sign-in experience with modern glassmorphism design, healthcare theme, 
            and enhanced visual effects for the CNKTYKLT Platform
          </p>
        </div>

        {/* Preview Button */}
        <div className="text-center">
          <GlassButton
            variant="default"
            size="lg"
            className="shadow-xl hover:shadow-2xl transition-all duration-300"
            onClick={() => window.open('/auth/signin', '_blank')}
          >
            <Eye className="mr-2 h-5 w-5" />
            View New Sign-In Page
          </GlassButton>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <GlassCard 
              key={index}
              className="p-6 hover:scale-105 transition-all duration-300 cursor-pointer group"
              hover="glow"
            >
              <div className={`p-3 rounded-xl bg-gradient-to-br ${feature.color} mb-4 w-fit group-hover:scale-110 transition-transform duration-300`}>
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                {feature.description}
              </p>
            </GlassCard>
          ))}
        </div>

        {/* Design Highlights */}
        <GlassCard className="p-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 text-center">
            Design Highlights
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Visual Effects */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                <Sparkles className="mr-2 h-5 w-5 text-blue-500" />
                Visual Effects
              </h3>
              <ul className="space-y-3 text-slate-600 dark:text-slate-400">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>Animated gradient orbs with pulsing effects in the background</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>Floating medical icons (HeartPulse, Microscope, Stethoscope) with smooth animations</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>Enhanced glassmorphism with improved depth and shadow effects</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>Smooth hover transitions and scale effects on interactive elements</span>
                </li>
              </ul>
            </div>

            {/* Layout & UX */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                <Monitor className="mr-2 h-5 w-5 text-green-500" />
                Layout & UX
              </h3>
              <ul className="space-y-3 text-slate-600 dark:text-slate-400">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>Two-column desktop layout with informative left panel</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>Feature cards highlighting system capabilities with hover effects</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>Enhanced form inputs with medical icons and better visual feedback</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>Responsive design optimized for both desktop and mobile devices</span>
                </li>
              </ul>
            </div>
          </div>
        </GlassCard>

        {/* Healthcare Theme */}
        <GlassCard className="p-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 text-center">
            Healthcare-Focused Design
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="p-4 rounded-xl bg-gradient-to-br from-red-500/20 to-pink-500/20 w-fit mx-auto mb-4">
                <Heart className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Medical Iconography</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Carefully selected medical icons that represent healthcare professionalism
              </p>
            </div>
            
            <div className="text-center">
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 w-fit mx-auto mb-4">
                <Palette className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Color Palette</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Healthcare-focused colors with medical blue and green accents
              </p>
            </div>
            
            <div className="text-center">
              <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 w-fit mx-auto mb-4">
                <Shield className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Trust & Security</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Visual elements that convey security and professional healthcare standards
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Technical Implementation */}
        <GlassCard className="p-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 text-center">
            Technical Implementation
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                CSS Animations
              </h3>
              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 text-sm font-mono">
                <div className="text-slate-600 dark:text-slate-400">
                  <div>@keyframes float &#123;</div>
                  <div className="ml-4">0%, 100% &#123; transform: translateY(0px); &#125;</div>
                  <div className="ml-4">50% &#123; transform: translateY(-20px); &#125;</div>
                  <div>&#125;</div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Glass Effects
              </h3>
              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 text-sm font-mono">
                <div className="text-slate-600 dark:text-slate-400">
                  <div>backdrop-filter: blur(12px);</div>
                  <div>background: rgba(255, 255, 255, 0.25);</div>
                  <div>border: 1px solid rgba(255, 255, 255, 0.3);</div>
                  <div>box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);</div>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </ResponsiveNavigation>
  );
};