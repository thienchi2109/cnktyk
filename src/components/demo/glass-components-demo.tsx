'use client';

import * as React from "react";
import { 
  Home, 
  Users, 
  Settings, 
  Bell,
  Search,
  Plus
} from "lucide-react";
import {
  GlassCard,
  GlassButton,
  Input,
  Select,
  Textarea,
  GlassForm,
  GlassFormField,
  GlassModal,
  GlassProgress,
  GlassCircularProgress
} from "@/components/ui";
import { ResponsiveNavigation } from "@/components/layout";

export const GlassComponentsDemo = () => {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [progress, setProgress] = React.useState(65);

  const mockUser = {
    name: "Dr. Nguyen Van A",
    role: "NguoiHanhNghe",
    avatar: undefined
  };

  return (
    <ResponsiveNavigation
      user={mockUser}
      notifications={5}
      activeItem="dashboard"
      onNavigate={(item) => console.log('Navigate to:', item)}
    >
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Glass Components Demo
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Showcase of glassmorphism UI components for the CNKTYKLT Platform
          </p>
        </div>

        {/* Glass Cards */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-slate-900 dark:text-white">
            Glass Cards
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlassCard hover="subtle">
              <h3 className="text-lg font-semibold mb-2">Default Card</h3>
              <p className="text-slate-600 dark:text-slate-400">
                This is a default glass card with subtle hover effects.
              </p>
            </GlassCard>

            <GlassCard blur="lg" hover="glow">
              <h3 className="text-lg font-semibold mb-2">Large Blur</h3>
              <p className="text-slate-600 dark:text-slate-400">
                This card has a larger blur effect and glow on hover.
              </p>
            </GlassCard>

            <GlassCard padding="lg">
              <h3 className="text-lg font-semibold mb-2">Large Padding</h3>
              <p className="text-slate-600 dark:text-slate-400">
                This card has larger padding for more spacious content.
              </p>
            </GlassCard>
          </div>
        </section>

        {/* Glass Buttons */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-slate-900 dark:text-white">
            Glass Buttons
          </h2>
          <div className="flex flex-wrap gap-4">
            <GlassButton variant="default">
              <Home className="h-4 w-4 mr-2" />
              Default
            </GlassButton>
            <GlassButton variant="secondary">
              <Users className="h-4 w-4 mr-2" />
              Secondary
            </GlassButton>
            <GlassButton variant="success">
              <Plus className="h-4 w-4 mr-2" />
              Success
            </GlassButton>
            <GlassButton variant="warning">
              <Bell className="h-4 w-4 mr-2" />
              Warning
            </GlassButton>
            <GlassButton variant="danger">
              Danger
            </GlassButton>
            <GlassButton variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </GlassButton>
            <GlassButton variant="outline" size="lg">
              Large Outline
            </GlassButton>
          </div>
        </section>

        {/* Form Components */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-slate-900 dark:text-white">
            Form Components
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <GlassCard>
              <h3 className="text-lg font-semibold mb-4">Glass Form Fields</h3>
              <div className="space-y-4">
                <GlassFormField label="Name" required>
                  <Input placeholder="Enter your name" />
                </GlassFormField>

                <GlassFormField label="Email">
                  <Input type="email" placeholder="Enter your email" />
                </GlassFormField>

                <GlassFormField label="Role">
                  <Select>
                    <option value="">Select a role</option>
                    <option value="practitioner">Practitioner</option>
                    <option value="admin">Administrator</option>
                    <option value="auditor">Auditor</option>
                  </Select>
                </GlassFormField>

                <GlassFormField label="Comments">
                  <Textarea placeholder="Enter your comments..." rows={3} />
                </GlassFormField>

                <div className="flex gap-2">
                  <GlassButton variant="default" className="flex-1">
                    Submit
                  </GlassButton>
                  <GlassButton variant="ghost" className="flex-1">
                    Cancel
                  </GlassButton>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="text-lg font-semibold mb-4">Search Example</h3>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input 
                    placeholder="Search practitioners..." 
                    className="pl-10"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Select className="flex-1">
                    <option value="">All Units</option>
                    <option value="hospital">Hospital</option>
                    <option value="clinic">Clinic</option>
                  </Select>
                  <GlassButton variant="default">
                    <Search className="h-4 w-4" />
                  </GlassButton>
                </div>
              </div>
            </GlassCard>
          </div>
        </section>

        {/* Progress Components */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-slate-900 dark:text-white">
            Progress Components
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <GlassCard>
              <h3 className="text-lg font-semibold mb-4">Linear Progress</h3>
              <div className="space-y-6">
                <GlassProgress value={progress} showLabel color="primary" />
                <GlassProgress value={85} showLabel color="success" />
                <GlassProgress value={45} showLabel color="warning" />
                <GlassProgress value={25} showLabel color="danger" />
                
                <div className="flex gap-2">
                  <GlassButton 
                    size="sm" 
                    onClick={() => setProgress(Math.max(0, progress - 10))}
                  >
                    -10%
                  </GlassButton>
                  <GlassButton 
                    size="sm" 
                    onClick={() => setProgress(Math.min(100, progress + 10))}
                  >
                    +10%
                  </GlassButton>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="text-center">
              <h3 className="text-lg font-semibold mb-4">Circular Progress</h3>
              <div className="flex justify-center space-x-8">
                <GlassCircularProgress 
                  value={progress} 
                  showLabel 
                  color="primary"
                  size={100}
                />
                <GlassCircularProgress 
                  value={85} 
                  showLabel 
                  color="success"
                  size={80}
                />
              </div>
            </GlassCard>
          </div>
        </section>

        {/* Modal Demo */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-slate-900 dark:text-white">
            Modal Component
          </h2>
          <GlassCard>
            <div className="text-center">
              <p className="mb-4 text-slate-600 dark:text-slate-400">
                Click the button below to open a glass modal
              </p>
              <GlassButton onClick={() => setModalOpen(true)}>
                Open Modal
              </GlassButton>
            </div>
          </GlassCard>
        </section>

        {/* Glass Modal */}
        <GlassModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Glass Modal Example"
          description="This is a beautiful glassmorphism modal with backdrop blur"
          size="md"
        >
          <div className="space-y-4">
            <p className="text-slate-600 dark:text-slate-400">
              This modal demonstrates the glassmorphism design with proper backdrop blur
              and smooth animations. It&apos;s fully accessible with keyboard navigation
              and focus management.
            </p>
            
            <GlassFormField label="Example Input">
              <Input placeholder="Type something..." />
            </GlassFormField>
            
            <div className="flex justify-end gap-2 pt-4">
              <GlassButton variant="ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </GlassButton>
              <GlassButton variant="default" onClick={() => setModalOpen(false)}>
                Confirm
              </GlassButton>
            </div>
          </div>
        </GlassModal>
      </div>
    </ResponsiveNavigation>
  );
};