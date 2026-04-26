import { X } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";

interface Props {
  isOpen: boolean;
  activeModule: string;
  onModuleChange: (module: string) => void;
  onClose: () => void;
}

const MobileSidebarOverlay = ({ isOpen, activeModule, onModuleChange, onClose }: Props) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute left-0 top-0 h-full z-50 shadow-xl">
        <AppSidebar
          activeModule={activeModule}
          onModuleChange={onModuleChange}
          onClose={onClose}
        />
      </div>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 w-9 h-9 rounded-lg bg-card border border-border flex items-center justify-center text-foreground"
        aria-label="Close menu"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};

export default MobileSidebarOverlay;
