import React, { useState } from "react";
import { Info } from "lucide-react";
import { AboutModal } from "../../common/AboutModal";

export interface SidebarFooterProps {
  onOpenSettings?: () => void;
}

export const SidebarFooter: React.FC<SidebarFooterProps> = () => {
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  return (
    <>
      <div className="mt-auto pt-3 border-t border-dark-border/60 flex justify-center">
        <button
          type="button"
          onClick={() => setIsAboutOpen(true)}
          className="text-[11px] text-gray-500 hover:text-gray-300 flex items-center space-x-1 transition"
        >
          <Info className="w-3 h-3" />
          <span>About &amp; Legal</span>
        </button>
      </div>

      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </>
  );
};
