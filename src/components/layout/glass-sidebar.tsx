'use client';

import * as React from "react";
import { X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  children?: SidebarItem[];
  badge?: string | number;
}

interface GlassSidebarProps {
  items: SidebarItem[];
  isOpen?: boolean;
  onClose?: () => void;
  activeItem?: string;
  onItemClick?: (item: SidebarItem) => void;
  className?: string;
}

export const GlassSidebar = React.forwardRef<HTMLDivElement, GlassSidebarProps>(
  ({ items, isOpen = true, onClose, activeItem, onItemClick, className }, ref) => {
    const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set());

    const toggleExpanded = (itemId: string) => {
      const newExpanded = new Set(expandedItems);
      if (newExpanded.has(itemId)) {
        newExpanded.delete(itemId);
      } else {
        newExpanded.add(itemId);
      }
      setExpandedItems(newExpanded);
    };

    const renderSidebarItem = (item: SidebarItem, level = 0) => {
      const isActive = activeItem === item.id;
      const isExpanded = expandedItems.has(item.id);
      const hasChildren = item.children && item.children.length > 0;

      return (
        <div key={item.id} className="w-full">
          <button
            onClick={() => {
              if (hasChildren) {
                toggleExpanded(item.id);
              } else {
                onItemClick?.(item);
              }
            }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              level > 0 && "ml-4 pl-6",
              isActive
                ? "bg-primary/20 text-primary-900 shadow-lg shadow-primary/10"
                : "hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            <span className="flex-1 text-left">{item.label}</span>
            
            {item.badge && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary-900">
                {item.badge}
              </span>
            )}
            
            {hasChildren && (
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isExpanded && "rotate-180"
                )}
              />
            )}
          </button>

          {hasChildren && isExpanded && (
            <div className="mt-1 space-y-1">
              {item.children?.map((child) => renderSidebarItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    };

    return (
      <>
        {/* Mobile Overlay */}
        {isOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
        )}

        {/* Sidebar */}
        <aside
          ref={ref}
          className={cn(
            "fixed left-0 top-0 z-50 h-full w-64 transform transition-transform duration-300 lg:relative lg:translate-x-0",
            isOpen ? "translate-x-0" : "-translate-x-full",
            className
          )}
        >
          <GlassCard className="h-full p-4 rounded-none lg:rounded-r-xl border-l-0 lg:border-l">
            {/* Mobile Close Button */}
            <div className="flex items-center justify-between mb-6 lg:hidden">
              <h2 className="text-lg font-semibold">Menu</h2>
              <GlassButton variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </GlassButton>
            </div>

            {/* Navigation Items */}
            <nav className="space-y-2">
              {items.map((item) => renderSidebarItem(item))}
            </nav>

            {/* Footer */}
            <div className="absolute bottom-4 left-4 right-4">
              <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
                <p>CNKTYKLT Platform</p>
                <p>v1.0.0</p>
              </div>
            </div>
          </GlassCard>
        </aside>
      </>
    );
  }
);

GlassSidebar.displayName = "GlassSidebar";