import React from 'react';
import { LucideIcon, Play, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MainCTAButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  icon?: LucideIcon;
  variant?: 'default' | 'outline';
  size?: 'default' | 'lg' | 'xl';
  className?: string;
  disabled?: boolean;
}

export const MainCTAButton: React.FC<MainCTAButtonProps> = ({
  children,
  onClick,
  icon: Icon = Play,
  variant = 'default',
  size = 'lg',
  className,
  disabled = false,
}) => {
  const sizeClasses = {
    default: 'h-10 px-4 text-sm',
    lg: 'h-14 px-8 text-base',
    xl: 'h-16 px-10 text-lg',
  };

  if (variant === 'outline') {
    return (
      <Button
        variant="outline"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          sizeClasses[size],
          "font-semibold border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300",
          className
        )}
      >
        <Icon className="w-5 h-5 mr-2" />
        {children}
        <ArrowRight className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
      </Button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "cta-main group relative inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-primary-foreground",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "animate-pulse-forest",
        sizeClasses[size],
        className
      )}
    >
      <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
      <span>{children}</span>
      <ArrowRight className="w-4 h-4 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
    </button>
  );
};
