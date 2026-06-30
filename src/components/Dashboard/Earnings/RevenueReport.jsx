import React from "react";

const RevenueReport = () => {
  const tableData = [
    { month: 'Jan-26', open: 100, traded: 10, gross: 100, share: 50 },
    { month: 'Feb-26', open: 120, traded: 15, gross: 150, share: 75 },
    { month: 'Mar-26', open: 95, traded: 12, gross: 120, share: 60 },
  ];

  const futuraStyle = { fontFamily: "'Futura PT', sans-serif" };

  return (
    <div 
      className="bg-white border border-gray-100 rounded-[32px] p-6 shadow-sm h-full" 
      style={futuraStyle}
    >
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-semibold text-gray-800 text-lg">Revenue Report</h3>
        <button className="text-[11px] font-medium px-4 py-1.5 rounded-full bg-[#34b350] text-white hover:opacity-90 transition-all">
          Export Report
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="text-[#34b350] text-left border-b border-gray-100">
              <th className="pb-4 font-semibold uppercase tracking-wider">Month</th>
              <th className="pb-4 font-semibold text-center uppercase tracking-wider">A/C Open</th>
              <th className="pb-4 font-semibold text-center uppercase tracking-wider">Traded</th>
              <th className="pb-4 font-semibold text-right uppercase tracking-wider">Gross Brk.</th>
              {/* Background Tint Hataya yahan se */}
              <th className="pb-4 font-semibold text-right uppercase tracking-wider px-2">
                My Sharing
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {tableData.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50/50 transition-all group">
                <td className="py-4 font-semibold text-gray-700">{row.month}</td>
                <td className="py-4 text-center">
                  <span className="bg-gray-100 px-3 py-1 rounded-lg font-medium text-gray-700">
                    {row.open}
                  </span>
                </td>
                <td className="py-4 text-center">
                  <span className="bg-[#34b350]/10 px-3 py-1 rounded-lg font-medium text-[#34b350]">
                    {row.traded}
                  </span>
                </td>
                <td className="py-4 text-right text-gray-500 font-normal">₹{row.gross}</td>
                {/* Background hatakar sirf text ko green rakha hai for clean look */}
                <td className="py-4 text-right font-semibold text-[#34b350] px-2 text-base">
                  ₹{row.share}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RevenueReport;