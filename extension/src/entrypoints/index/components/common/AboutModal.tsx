import React, { useRef } from "react";
import { Info, X } from "lucide-react";
import { useClickOutside } from "../../hooks/useClickOutside";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LEGAL_NOTICE = `Third-Party Data & Attribution

MDBList
Movie metadata and ratings provided by MDBList.
- Source: https://mdblist.com/
- Note: This product uses MDBList but is not endorsed or certified by MDBList, IMDb.com, or Rotten Tomatoes.

Legal Disclaimer & Terms of Use
Last Updated: 10/13/2026

1. Independent Fan Project & No Affiliation
Matineer is an independent, open-source fan project created by a movie enthusiast to assist fellow filmgoers in organizing and planning movie schedules.

This project is not affiliated with, associated with, authorized by, endorsed by, or in any way officially connected with AMC Entertainment Holdings, Inc. ("AMC"), Rotten Tomatoes, IMDb (an Amazon subsidiary), Fandango, or any of their respective subsidiaries or affiliates.

All product names, logos, brands, trademarks, and registered trademarks mentioned or referenced in this extension/application are the property of their respective owners. Any reference to these names, brands, or trademarks is strictly for descriptive, identification, and nominative fair use purposes to indicate compatibility with third-party platforms and does not imply any sponsorship, endorsement, or commercial relationship.

2. Accuracy of Information & User Verification
All showtime, theater, format, and movie data displayed through this extension is retrieved on a best-effort basis directly from publicly accessible web pages.

Verify Before Booking: Showtimes, auditoriums, dates, pricing, and availability are subject to change without notice by theater operators and ticket vendors.

Always verify all dates, theater locations, showtimes, and ticket selections directly on the official vendor’s website (e.g., amctheatres.com) before completing any transaction or arriving at a theater.

This extension does not sell tickets, process payments, or guarantee seat availability. All transactions occur entirely on third-party websites under their respective terms and policies.

3. No Warranty ("As-Is" Provision)
THIS EXTENSION AND SERVICE ARE PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMISSIBLE UNDER APPLICABLE LAW, THE CREATOR(S) AND CONTRIBUTORS DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.

WE DO NOT WARRANT OR GUARANTEE THAT:

THE DATA DISPLAYED WILL BE ACCURATE, COMPLETE, CURRENT, OR ERROR-FREE;

THE EXTENSION WILL OPERATE UNINTERRUPTED OR SECURELY;

THIRD-PARTY WEBSITE CHANGES OR UPDATES WILL NOT DISRUPT OR PREVENT THE FUNCTIONALITY OF THIS EXTENSION.

4. Limitation of Liability
TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL THE CREATOR(S), DEVELOPER(S), OR CONTRIBUTORS OF MATINEER BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR IN CONNECTION WITH YOUR ACCESS TO, USE OF, OR INABILITY TO USE THIS EXTENSION. THIS INCLUDES, WITHOUT LIMITATION, DAMAGES RESULTING FROM MISSED SHOWINGS, INCORRECT BOOKINGS, TRAVEL DELAYS, TICKET EXPENSES, OR RELIANCE ON ANY INFORMATION OBTAINED THROUGH THE EXTENSION.

5. Third-Party Websites & Services
This extension may direct you to or interact with third-party websites. We have no control over the content, privacy practices, terms, or availability of those external sites. Your interactions with third-party sites are governed solely by the terms and policies of those respective third parties.
`;

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle escape key and click outside via shared hook
  useClickOutside(modalRef, onClose, isOpen);

  if (!isOpen) return null;

  const version = typeof chrome !== "undefined" ? chrome.runtime?.getManifest?.().version : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-modal-title"
        className="w-full max-w-md bg-dark-card border border-dark-border rounded-xl shadow-2xl overflow-hidden p-5 space-y-4 text-gray-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-dark-border/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h2 id="about-modal-title" className="text-base font-bold text-gray-100 leading-tight">
                About &amp; Legal
              </h2>
              <p className="text-xs text-gray-400">
                Matineer{version ? ` v${version}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-dark-surface transition"
            aria-label="Close about"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Legal Notice */}
        <div className="max-h-80 overflow-y-auto bg-dark-surface/60 border border-dark-border rounded-lg p-3 text-xs text-gray-300 leading-relaxed whitespace-pre-line">
          {LEGAL_NOTICE}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-dark-border/80 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="bg-brand-blue hover:bg-brand-blueHover text-brand-text text-xs font-bold px-4 py-1.5 rounded-lg shadow-md transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
