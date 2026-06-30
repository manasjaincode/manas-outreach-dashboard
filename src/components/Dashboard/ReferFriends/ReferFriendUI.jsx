import React, { useState } from "react";
import ShareQRModal from "../../ShareQRModal"; // Purana modal import

const ReferFriendUI = ({ clientCode, onTrackStatus }) => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const futuraStyle = { fontFamily: "'Futura PT', sans-serif" };

  // Aapka original link logic
  const referralLink = `https://arihanplus.com/referral/${clientCode || 'YMYXV3328'}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    alert("Referral link copied!");
  };

  return (
    <div className="h-full flex flex-col p-6 lg:p-10 animate-in fade-in slide-in-from-right-4 duration-500 overflow-y-auto no-scrollbar">
      
      {/* Top Green Banner */}
      <div className="w-full bg-[#E8F5E9] border border-[#C8E6C9] rounded-xl py-3 px-4 flex items-center justify-center gap-2 mb-8 lg:mb-12">
        <span className="text-lg">🪙</span>
        <p className="text-[#2E7D32] text-[14px] lg:text-[16px] font-medium" style={futuraStyle}>
          Earn upto <span className="font-bold">₹30,000*</span> when your friend opens an account using your referral link!
        </p>
      </div>

      <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-16">
        
        {/* Left Side: Text & Actions */}
        <div className="flex-1 text-center lg:text-left flex flex-col items-center lg:items-start">
          <h2 className="text-[22px] lg:text-[28px] font-bold text-[#2C2E35] leading-tight mb-2" style={futuraStyle}>
            Ask a friend to scan your <br className="hidden lg:block"/> referral QR code
          </h2>
          <p className="text-gray-400 text-[14px] lg:text-[15px] mb-6 font-medium" style={futuraStyle}>
            and register with ArihantPlus
          </p>

          {/* Green Divider */}
          <div className="w-12 h-1.5 bg-[#52C576] rounded-full mb-8"></div>

          {/* Share QR Button */}
          <button 
            onClick={() => setIsShareModalOpen(true)}
            className="bg-[#52C576] hover:bg-[#45a063] text-white px-10 py-3 rounded-full flex items-center gap-2 font-bold transition-all shadow-md mb-8"
            style={futuraStyle}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            Share QR
          </button>

          {/* Link Box */}
          <div className="w-full max-w-[360px]">
            <p className="text-gray-400 text-[12px] mb-2 text-center lg:text-left font-medium" style={futuraStyle}>
              You can also copy & share the referral link
            </p>
            <div className="flex items-center bg-[#F3E5F5] border border-[#E1BEE7] rounded-xl p-2.5 gap-2">
              <input 
                type="text" 
                readOnly 
                value={referralLink} 
                className="bg-transparent border-none outline-none text-[13px] font-semibold text-gray-600 flex-1 px-2 overflow-hidden text-ellipsis"
              />
              <button onClick={handleCopy} className="text-[#9C27B0] hover:bg-white/50 p-2 rounded-lg transition-all">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: QR Code Card */}
        <div className="flex-1 flex justify-center lg:justify-end">
          <div className="bg-white p-6 lg:p-10 rounded-[35px] shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-gray-50 flex items-center justify-center">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${referralLink}`} 
              alt="Referral QR" 
              className="w-[180px] h-[180px] lg:w-[250px] lg:h-[250px] object-contain"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-10 flex flex-col items-center gap-2">
        <p className="text-gray-400 text-[12px] font-medium" style={futuraStyle}>
          By referring a friend you agree to our <span className="text-[#52C576] font-bold underline cursor-pointer">Terms & Conditions</span>.
        </p>
      </div>

      <ShareQRModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        referralLink={referralLink} 
      />
    </div>
  );
};

export default ReferFriendUI;