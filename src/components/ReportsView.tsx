import React, { useState, useEffect } from "react";
import { 
  FileText, Download, Calendar, DollarSign, Activity, Users, Globe, ShieldAlert, Check, RefreshCw
} from "lucide-react";
import api from "../services/api";

interface ReportsViewProps {
  user: any;
}

export default function ReportsView({ user }: ReportsViewProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"REVENUE" | "ATTENDANCE" | "DEMO">("REVENUE");

  async function loadReportsData() {
    setLoading(true);
    try {
      const response = await api.get("/reports/summary");
      setStats(response.data);
    } catch (err) {
      console.error("Failed to load reports summary metrics.", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReportsData();
  }, []);

  // Download real raw CSV files
  const handleDownloadCSV = (datasetName: string) => {
    if (!stats) return;

    let csvContent = "";
    let fileName = "";

    if (datasetName === "REVENUE") {
      csvContent = "Invoice ID,Member Name,Billed For,Mode,Amount ($),Status\n";
      stats.paymentRoster?.forEach((p: any) => {
        csvContent += `"${p.id}","${p.memberName}","${p.type}","${p.paymentMode}",${p.amount},"${p.status}"\n`;
      });
      fileName = "gymflow_revenue_ledger.csv";
    } else if (datasetName === "ATTENDANCE") {
      csvContent = "Log ID,Member Name,Date,Check-In Time,Check-Out Time,Remarks\n";
      stats.attendanceHistory?.forEach((a: any) => {
        csvContent += `"${a.id}","${a.memberName}","${a.date}","${a.timeIn}","${a.timeOut || "Active"}","${a.remarks}"\n`;
      });
      fileName = "gymflow_attendance_log.csv";
    } else {
      csvContent = "Member ID,Full Name,Gender,Height (cm),Weight (kg),BMI Score,Status\n";
      stats.membersDetails?.forEach((m: any) => {
        csvContent += `"${m.memberId}","${m.fullName}","${m.gender}",${m.height},${m.weight},${m.bmi},"${m.status}"\n`;
      });
      fileName = "gymflow_member_demographics.csv";
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert(`Spreadsheet generated as ${fileName} downloaded successfully.`);
  };

  return (
    <div className="space-y-6 text-zinc-100">
      
      {/* Header */}
      <div className="border-b border-zinc-850 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-6 bg-amber-500 rounded-full inline-block"></span>
            SaaS Reports & Audit Desk
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Export structured database tables, analyze check-in cohorts, and verify financial cash registers.
          </p>
        </div>

        {stats && (
          <button
            type="button"
            onClick={() => handleDownloadCSV(activeTab)}
            className="px-4.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-[0_4px_15px_rgba(245,158,11,0.2)]"
          >
            <Download className="w-4 h-4 text-black font-black" /> Export Active Spreadsheet
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
        </div>
      ) : !stats ? (
        <div className="bg-zinc-950 border border-dashed border-zinc-850 p-10 text-center text-zinc-500 text-xs font-mono">
          Error retrieving analytical report logs.
        </div>
      ) : (
        <>
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
              <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider block">MONTHLY CASHFLOWS</span>
              <span className="text-2xl font-black text-emerald-400 mt-1.5 block">${stats.revenueSummary?.totalCollected || 0}</span>
              <span className="text-[10px] text-zinc-400 mt-1.5 block">Cleared Invoice Receipts</span>
            </div>
            
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
              <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider block">PENDING INVOICES</span>
              <span className="text-2xl font-black text-amber-500 mt-1.5 block">${stats.revenueSummary?.totalPending || 0}</span>
              <span className="text-[10px] text-zinc-400 mt-1.5 block">Unsettled Member Balances</span>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
              <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider block">TOTAL ONSITE PRESENCE</span>
              <span className="text-2xl font-black text-blue-400 mt-1.5 block">{stats.attendanceSummary?.totalLogs || 0}</span>
              <span className="text-[10px] text-zinc-400 mt-1.5 block">Presence Checkins</span>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
              <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider block">BIO BMI INDEX</span>
              <span className="text-2xl font-black text-white mt-1.5 block">{stats.demographics?.averageBmi || 24.1}</span>
              <span className="text-[10px] text-emerald-400 mt-1.5 block">Normal Ranges Class</span>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="flex border-b border-zinc-800 text-xs font-mono">
            <button
              type="button"
              onClick={() => setActiveTab("REVENUE")}
              className={`py-3 px-5 border-b-2 font-bold cursor-pointer transition-all ${
                activeTab === "REVENUE" ? "border-amber-500 text-amber-500 bg-amber-500/5" : "border-transparent text-zinc-400 hover:text-white"
              }`}
            >
              Finance Ledger Row Logs
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ATTENDANCE")}
              className={`py-3 px-5 border-b-2 font-bold cursor-pointer transition-all ${
                activeTab === "ATTENDANCE" ? "border-amber-500 text-amber-500 bg-amber-500/5" : "border-transparent text-zinc-400 hover:text-white"
              }`}
            >
              Manual Attendance Audit Trail
            </button>
            <button
               type="button"
               onClick={() => setActiveTab("DEMO")}
               className={`py-3 px-5 border-b-2 font-bold cursor-pointer transition-all ${
                 activeTab === "DEMO" ? "border-amber-500 text-amber-500 bg-amber-500/5" : "border-transparent text-zinc-400 hover:text-white"
               }`}
            >
              Registered Demographics Statistics
            </button>
          </div>

          {/* Tab Sub Contents */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 overflow-hidden shadow-xl">
            
            {/* T1: FINANCE */}
            {activeTab === "REVENUE" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-zinc-950 p-4 border border-zinc-850 rounded-xl text-xs font-mono text-zinc-400">
                  <span>Finance Logs represent verified ledger collections:</span>
                  <strong className="text-white">Active database matching</strong>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead>
                      <tr className="border-b border-zinc-850 text-zinc-500 text-[10px] uppercase font-mono tracking-wider">
                        <th className="pb-2.5">Invoice Ref ID</th>
                        <th className="pb-2.5">Billed For</th>
                        <th className="pb-2.5">Member Name</th>
                        <th className="pb-2.5">Payment Mode</th>
                        <th className="pb-2.5">Amount</th>
                        <th className="pb-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-805 text-[11px]">
                      {stats.paymentRoster?.map((p: any) => (
                        <tr key={p.id} className="hover:bg-zinc-850/40">
                          <td className="py-2.5 font-mono text-zinc-400">{p.id}</td>
                          <td className="py-2.5 text-zinc-300">{p.type}</td>
                          <td className="py-2.5 font-bold text-white">{p.memberName}</td>
                          <td className="py-2.5 text-zinc-400 font-mono">{p.paymentMode}</td>
                          <td className="py-2.5 text-white font-mono font-black">${p.amount}</td>
                          <td className="py-2.5 text-xs">
                            <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-black uppercase ${
                              p.status === "Paid" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-500"
                            }`}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* T2: ATTENDANCE */}
            {activeTab === "ATTENDANCE" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-zinc-950 p-4 border border-zinc-850 rounded-xl text-xs font-mono text-zinc-400">
                  <span>Manual Presence logs matching Elite Gym:</span>
                  <strong className="text-white">Continuous tracking audits</strong>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead>
                      <tr className="border-b border-zinc-855 text-zinc-500 text-[10px] uppercase font-mono tracking-wider">
                        <th className="pb-2.5">Session ID</th>
                        <th className="pb-2.5">Member Name</th>
                        <th className="pb-2.5">Check-in Date</th>
                        <th className="pb-2.5">Entry check</th>
                        <th className="pb-2.5">Departure Check</th>
                        <th className="pb-2.5">Target Focus / Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-805 text-[11px]">
                      {stats.attendanceHistory?.map((a: any) => (
                        <tr key={a.id} className="hover:bg-zinc-850/40">
                          <td className="py-2.5 font-mono text-zinc-400">{a.id}</td>
                          <td className="py-2.5 font-bold text-white">{a.memberName}</td>
                          <td className="py-2.5 font-mono">{a.date}</td>
                          <td className="py-2.5 font-mono text-amber-500 font-medium">{a.timeIn}</td>
                          <td className="py-2.5 font-mono text-zinc-500">{a.timeOut || "Active"}</td>
                          <td className="py-2.5 text-zinc-300 italic max-w-xs truncate">{a.remarks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* T3: DEMOGRAPHICS */}
            {activeTab === "DEMO" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-zinc-950 p-4 border border-zinc-850 rounded-xl text-xs font-mono text-zinc-400">
                  <span>Physical Demographics and Biological BMI Ranks:</span>
                  <strong className="text-white">Active CRM Member Index</strong>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead>
                      <tr className="border-b border-zinc-850 text-zinc-500 text-[10px] uppercase font-mono tracking-wider">
                        <th className="pb-2.5">ID / Code</th>
                        <th className="pb-2.5">Full Name</th>
                        <th className="pb-2.5">Gender</th>
                        <th className="pb-2.5">Weight (kg)</th>
                        <th className="pb-2.5">Height (cm)</th>
                        <th className="pb-2.5">BMI Rating</th>
                        <th className="pb-2.5">Gym status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-805 text-[11px]">
                      {stats.membersDetails?.map((m: any) => (
                        <tr key={m.id} className="hover:bg-zinc-850/40">
                          <td className="py-2.5 font-mono text-zinc-400">{m.memberId}</td>
                          <td className="py-2.5 font-bold text-white">{m.fullName}</td>
                          <td className="py-2.5 text-zinc-300">{m.gender}</td>
                          <td className="py-2.5 text-zinc-400">{m.weight}kg</td>
                          <td className="py-2.5 text-zinc-400">{m.height}cm</td>
                          <td className="py-2.5 text-amber-500 font-bold font-mono">{m.bmi}</td>
                          <td className="py-2.5 font-mono">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                              m.status === "Active" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-500"
                            }`}>
                              {m.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </>
      )}

    </div>
  );
}
