import { useEffect } from "react";
import AppSidebar from "@/components/AppSidebar";

interface Props {
  isOpen: boolean;
  activeModule: string;
  onModuleChange: (module: string) => void;
  onClose: () => void;
}

const MobileSidebarOverlay = ({ isOpen, activeModule, onModuleChange, onClose }: Props) => {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Escape key closes the overlay
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel — slides in from left */}
      <div className="relative z-10 h-full shadow-xl animate-slide-in">
        <AppSidebar
          activeModule={activeModule}
          onModuleChange={onModuleChange}
          onClose={onClose}
        />
      </div>
    </div>
  );
};

export default MobileSidebarOverlay;
