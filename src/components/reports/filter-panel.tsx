'use client';

import * as React from 'react';
import { Filter, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
    SheetClose,
} from '@/components/ui/sheet';
import { useMediaQuery } from '@/hooks/use-media-query';

interface FilterPanelProps {
    children: React.ReactNode;
    onReset?: () => void;
    activeFilterCount?: number;
    className?: string;
    title?: string;
}

export function FilterPanel({
    children,
    onReset,
    activeFilterCount = 0,
    className,
    title = "Bộ lọc",
}: FilterPanelProps) {
    const isDesktop = useMediaQuery("(min-width: 1024px)");
    const [isOpen, setIsOpen] = React.useState(false);

    // Desktop view: Sticky sidebar or just inline
    if (isDesktop) {
        return (
            <div className={cn("space-y-4", className)}>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-medical-blue" />
                        <h3 className="font-semibold text-gray-800">{title}</h3>
                        {activeFilterCount > 0 && (
                            <span className="bg-medical-blue text-white text-xs px-2 py-0.5 rounded-full">
                                {activeFilterCount}
                            </span>
                        )}
                    </div>
                    {onReset && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onReset}
                            className="h-8 text-xs text-gray-500 hover:text-gray-900"
                        >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Đặt lại
                        </Button>
                    )}
                </div>
                <div className="space-y-4">
                    {children}
                </div>
            </div>
        );
    }

    // Mobile view: Bottom Sheet (Drawer)
    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="w-4 h-4" />
                    {title}
                    {activeFilterCount > 0 && (
                        <span className="bg-medical-blue text-white text-xs px-2 py-0.5 rounded-full ml-1">
                            {activeFilterCount}
                        </span>
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] rounded-t-xl px-0">
                <SheetHeader className="px-6 border-b pb-4">
                    <div className="flex items-center justify-between">
                        <SheetTitle>{title}</SheetTitle>
                        {onReset && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onReset}
                                className="h-8 text-xs text-gray-500"
                            >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Đặt lại
                            </Button>
                        )}
                    </div>
                </SheetHeader>
                <div className="px-6 py-6 overflow-y-auto h-full pb-24">
                    <div className="space-y-6">
                        {children}
                    </div>
                </div>
                <SheetFooter className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t">
                    <SheetClose asChild>
                        <Button className="w-full bg-medical-blue hover:bg-medical-blue/90">
                            Áp dụng bộ lọc
                        </Button>
                    </SheetClose>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
