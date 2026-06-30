import React, { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const EarningsSummary = () => {
  const [timeRange, setTimeRange] = useState("3");

  // Capital Theme Colors: Green variations for chart segments
  const dataMap = {
    "3": [
      { name: "Jan", value: 4500, color: "#34b350" }, // Primary Green
      { name: "Feb", value: 3000, color: "#72d48a" }, // Lighter Green
      { name: "Mar", value: 5500, color: "#a8e5b9" }, // Minty Green
    ],
    "6": [
      { name: "Oct", value: 2000, color: "#34b350" },
      { name: "Nov", value: 2500, color: "#4ccb6a" },
      { name: "Dec", value: 3000, color: "#72d48a" },
      { name: "Jan", value: 4500, color: "#8edd9f" },
      { name: "Feb", value: 3000, color: "#a8e5b9" },
      { name: "Mar", value: 5500, color: "#c1f0ce" },
    ],
  };

  const currentData = dataMap[timeRange];
  const totalEarnings = currentData.reduce((acc, item) => acc + item.value, 0);

  // Custom Inline Style for Futura PT
  const futuraStyle = { fontFamily: "'Futura PT', sans-serif" };

  return (
    <div 
      className="bg-white border border-[#34b350]/20 rounded-[32px] p-6 shadow-sm flex flex-col h-full border-t-[6px]" 
      style={{ borderTopColor: '#34b350', ...futuraStyle }}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold text-gray-800 text-lg">Your Earnings</h3>
          <p className="text-[11px] text-[#34b350] uppercase tracking-widest font-medium mt-1">Trend Analysis</p>
        </div>
        <select 
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="bg-[#f2e7fa] border border-[#34b350]/30 text-[11px] font-medium rounded-full px-3 py-1.5 outline-none text-[#34b350] cursor-pointer"
        >
          <option value="3">Last 3 Months</option>
          <option value="6">Last 6 Months</option>
        </select>
      </div>

      <div className="flex-1 w-full min-h-[250px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie 
              data={currentData} 
              cx="50%" 
              cy="50%" 
              innerRadius={65} 
              outerRadius={85} 
              paddingAngle={timeRange === "6" ? 4 : 8} 
              dataKey="value" 
              stroke="none"
            >
              {currentData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            
            <Tooltip 
              position={{ y: 0 }} 
              contentStyle={{ 
                borderRadius: '15px', 
                border: '1px solid #34b350', 
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                fontSize: '12px',
                fontWeight: '500',
                fontFamily: "'Futura PT', sans-serif",
                boxShadow: '0 4px 12px rgba(52, 179, 80, 0.2)'
              }} 
            />
            <Legend 
              iconType="circle" 
              wrapperStyle={{ fontSize: '11px', fontWeight: '500', fontFamily: "'Futura PT', sans-serif" }} 
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Text (Total Amount) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">Total</p>
          <p className="text-xl font-semibold text-[#34b350]">₹{totalEarnings.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default EarningsSummary;