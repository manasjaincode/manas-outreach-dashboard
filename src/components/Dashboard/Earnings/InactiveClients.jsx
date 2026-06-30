import React, { useState } from "react";

const InactiveClients = () => {
  const [filterDays, setFilterDays] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // Max 8 clients per screen

  const clients = [
    { code: 'ARI101', name: 'Devendra', date: '01-Jan-26', days: 7 },
    { code: 'ARI102', name: 'Krishna', date: '01-Jan-26', days: 15 },
    { code: 'ARI103', name: 'Vipul', date: '01-Jan-26', days: 30 },
    { code: 'ARI104', name: 'Avinash', date: '01-Jan-26', days: 90 },
    { code: 'ARI105', name: 'Rahul', date: '12-Dec-25', days: 45 },
    { code: 'ARI106', name: 'Sonia', date: '05-Jan-26', days: 10 },
    { code: 'ARI107', name: 'Amit', date: '10-Jan-26', days: 20 },
    { code: 'ARI108', name: 'Priya', date: '15-Jan-26', days: 5 },
    { code: 'ARI109', name: 'Rajesh', date: '20-Jan-26', days: 40 }, // Extra to test pagination
  ];

  // Filtering Logic
  const filteredClients = clients.filter(client => {
    if (filterDays === "all") return true;
    if (filterDays === "60") return client.days >= 60;
    return client.days === parseInt(filterDays);
  });

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredClients.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);

  const futuraStyle = { fontFamily: "'Futura PT', sans-serif" };

  return (
    <div className="bg-white border border-gray-100 rounded-[24px] p-8 shadow-sm" style={futuraStyle}>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 tracking-tight">Client Activity Report</h3>
          <p className="text-[12px] text-gray-400 mt-1 uppercase tracking-[0.15em]">Capital Management</p>
        </div>
        
        <select 
          onChange={(e) => {
            setFilterDays(e.target.value);
            setCurrentPage(1); // Reset to page 1 on filter change
          }}
          className="bg-gray-50 border border-gray-200 text-[13px] font-medium rounded-lg px-4 py-2 outline-none text-gray-600 cursor-pointer hover:border-[#34b350] transition-colors"
        >
          <option value="all">All Clients</option>
          <option value="7">Inactive: 7 Days</option>
          <option value="15">Inactive: 15 Days</option>
          <option value="30">Inactive: 30 Days</option>
          <option value="60">60 Days Plus</option>
        </select>
      </div>

      {/* Grid Section */}
      {currentItems.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {currentItems.map((client, i) => (
              <div 
                key={i} 
                className="bg-white border border-gray-100 rounded-2xl p-6 hover:border-[#34b350]/30 transition-all"
              >
                <div className="text-[10px] font-bold text-[#34b350] tracking-widest uppercase mb-3">
                  ID: {client.code}
                </div>
                <h4 className="text-lg font-semibold text-gray-800">{client.name}</h4>
                <p className="text-[12px] text-gray-400 mt-1">Since: {client.date}</p>
                
                <div className="h-[1px] bg-gray-50 my-5"></div>
                
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Inactivity</span>
                  <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${client.days >= 30 ? 'text-red-500 bg-red-50' : 'text-[#34b350] bg-[#34b350]/5'}`}>
                    {client.days} Days
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="flex justify-between items-center mt-10 pt-6 border-t border-gray-50">
            <p className="text-[13px] text-gray-400 font-medium">
              Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredClients.length)} of {filteredClients.length}
            </p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setCurrentPage(prev => prev - 1)}
                disabled={currentPage === 1}
                className={`px-5 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                  currentPage === 1 
                  ? 'bg-gray-50 text-gray-300 cursor-not-allowed' 
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-[#34b350] hover:text-[#34b350]'
                }`}
              >
                Previous
              </button>
              
              <button 
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={currentPage === totalPages || totalPages === 0}
                className={`px-5 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                  (currentPage === totalPages || totalPages === 0)
                  ? 'bg-gray-50 text-gray-300 cursor-not-allowed' 
                  : 'bg-[#34b350] text-white hover:opacity-90 shadow-sm'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="py-20 text-center border-2 border-dashed border-gray-100 rounded-3xl">
           <p className="text-gray-400">No data available.</p>
        </div>
      )}
    </div>
  );
};

export default InactiveClients;