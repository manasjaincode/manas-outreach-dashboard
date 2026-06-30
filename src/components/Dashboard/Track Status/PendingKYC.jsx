import React from "react";

const PendingKYC = ({ searchTerm = "" }) => {
  const futuraStyle = { fontFamily: "'Futura PT', sans-serif" };
  
  const data = [
    { name: "Rahul Sharma", contact: "9123456789", status: "Incomplete", initial: "RS", color: "bg-orange-50 text-orange-500" },
    { name: "Sneha Kapoor", contact: "9988776655", status: "Incomplete", initial: "SK", color: "bg-orange-50 text-orange-500" },
    { name: "Vikram Singh", contact: "9000011122", status: "Incomplete", initial: "VS", color: "bg-orange-50 text-orange-500" },
    { name: "Megha Jain", contact: "8877665544", status: "Incomplete", initial: "MJ", color: "bg-orange-50 text-orange-500" },
  ];

  const filteredData = data.filter((item) =>
    item.name.toLowerCase().startsWith(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Desktop Header (Hidden on Mobile) */}
      <div className="hidden md:grid grid-cols-12 text-gray-400 text-[12px] uppercase tracking-[0.15em] border-b border-gray-50 py-4 font-bold" style={futuraStyle}>
        <div className="col-span-5 lg:col-span-6">Name</div>
        <div className="col-span-4 lg:col-span-3">Contact number</div>
        <div className="col-span-3 text-right">Status</div>
      </div>

      <div className="divide-y divide-gray-50">
        {filteredData.length > 0 ? (
          filteredData.map((item, idx) => (
            <div key={idx} className="group py-5 hover:bg-gray-50/50 transition-all">
              <div className="grid grid-cols-12 items-center gap-2">
                
                {/* Name & Avatar Section (Responsive Column Span) */}
                <div className="col-span-8 md:col-span-5 lg:col-span-6 flex items-center gap-4">
                  <div className={`shrink-0 w-10 h-10 lg:w-11 lg:h-11 rounded-full flex items-center justify-center font-bold text-[13px] shadow-sm ${item.color}`} style={futuraStyle}>
                    {item.initial}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[15px] lg:text-[16px] font-bold text-[#2C2E35] truncate" style={futuraStyle}>
                      {item.name}
                    </span>
                    {/* Mobile Only: Contact Number under name */}
                    <span className="text-[11px] text-gray-400 font-medium md:hidden" style={futuraStyle}>
                      {item.contact}
                    </span>
                  </div>
                </div>

                {/* Desktop Contact Column */}
                <div className="hidden md:block md:col-span-4 lg:col-span-3 text-[14px] text-gray-500 font-medium" style={futuraStyle}>
                  {item.contact}
                </div>

                {/* Status Section (Aligned Right) */}
                <div className="col-span-4 md:col-span-3 text-right">
                  <div className="flex flex-col items-end gap-1">
                    <span className="bg-[#FFF4E5] text-[#FF9800] px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider" style={futuraStyle}>
                      {item.status}
                    </span>
                    {/* Send Reminder - Desktop: Show on hover | Mobile: Always visible for UX */}
                    <button className="text-[10px] text-[#52C576] font-bold hover:underline md:opacity-0 md:group-hover:opacity-100 transition-opacity" style={futuraStyle}>
                      Send Reminder
                    </button>
                  </div>
                </div>

              </div>
            </div>
          ))
        ) : (
          <div className="py-16 text-center">
            <p className="text-gray-400 text-sm font-medium" style={futuraStyle}>
              No pending KYC matching "{searchTerm}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingKYC;