import React from "react";

const ActiveReferrals = ({ searchTerm = "" }) => { // Props se searchTerm liya
  const futuraStyle = { fontFamily: "'Futura PT', sans-serif" };

  const data = [
    { name: "Advait Mujumdar", contact: "9876543210", status: "Active", initial: "AM", color: "bg-[#E7F7EE] text-[#52C576]" },
    { name: "Anand Tiwari", contact: "9876543210", status: "Active", initial: "AT", img: "https://i.pravatar.cc/150?u=anand" },
    { name: "Charul Pandey", contact: "9876543210", status: "Active", initial: "CP", img: "https://i.pravatar.cc/150?u=charul" },
    { name: "Prathmesh Verma", contact: "9876543210", status: "Active", initial: "PV", color: "bg-[#E7F7EE] text-[#52C576]" },
  ];

  // Search logic: Name ko check kar rahe hain
 const filteredData = data.filter((item) =>
  item.name.toLowerCase().startsWith(searchTerm.toLowerCase()) // Exact first letter logic
);

  return (
    <div className="w-full">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="text-gray-400 text-[12px] uppercase tracking-widest border-b border-gray-50">
            <th className="py-4 font-bold" style={futuraStyle}>Name</th>
            <th className="py-4 font-bold" style={futuraStyle}>Contact number</th>
            <th className="py-4 font-bold text-right" style={futuraStyle}>Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {filteredData.length > 0 ? (
            filteredData.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50 transition-all animate-in fade-in duration-300">
                <td className="py-5 flex items-center gap-4">
                  {item.img ? (
                    <img src={item.img} className="w-10 h-10 rounded-full object-cover shadow-sm" alt="" />
                  ) : (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-[12px] ${item.color}`}>
                      {item.initial}
                    </div>
                  )}
                  <span className="text-[15px] font-bold text-[#2C2E35]" style={futuraStyle}>{item.name}</span>
                </td>
                <td className="py-5 text-[14px] text-gray-500 font-medium" style={futuraStyle}>{item.contact}</td>
                <td className="py-5 text-right">
                  <span className="bg-[#E7F7EE] text-[#52C576] px-3 py-1 rounded-md text-[10px] font-bold uppercase" style={futuraStyle}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))
          ) : (
            /* No Results State */
            <tr>
              <td colSpan="3" className="py-10 text-center text-gray-400 font-medium" style={futuraStyle}>
                No referrals found matching "{searchTerm}"
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ActiveReferrals;