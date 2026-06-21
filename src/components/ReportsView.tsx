import React, { useState, useEffect } from "react";
import { 
  FileText, Download, Calendar, DollarSign, Activity, Users, Award, ShieldAlert, Check, RefreshCw, Printer
} from "lucide-react";
import api from "../services/api";

interface ReportsViewProps {
  user: any;
}

type ReportType = "MEMBER" | "PROGRESS" | "ATTENDANCE" | "RENEWAL" | "TRAINER";

export default function ReportsView({ user }: ReportsViewProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ReportType>("MEMBER");
  const [reportData, setReportData] = useState<any[]>([]);
  const [printPreview, setPrintPreview] = useState<boolean>(false);

  async function loadActiveReport(type: ReportType) {
    setLoading(true);
    try {
      const endpointVal = type.toLowerCase();
      const res = await api.get(`/reports/${endpointVal}`);
      setReportData(res.data);
    } catch (err) {
      console.error(`Failed to load report for: ${type}`, err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadActiveReport(activeTab);
  }, [activeTab]);

  // Export CSV
  const handleExportCSV = () => {
    if (!reportData || reportData.length === 0) {
      alert("No records found to export.");
      return;
    }

    let csvContent = "";
    let fileName = `gymflow_${activeTab.toLowerCase()}_report.csv`;

    if (activeTab === "MEMBER") {
      csvContent = "Member ID,Full Name,Email,Phone,Joined Date,Plan,Status\n";
      reportData.forEach((row: any) => {
        csvContent += `"${row.memberDisplayId}","${row.fullName}","${row.email}","${row.phone}","${row.joiningDate}","${row.activePlan}","${row.status}"\n`;
      });
    } else if (activeTab === "PROGRESS") {
      csvContent = "Date,Member ID,Name,Weight (kg),BMI,Body Fat %,Chest,Waist,Hip,Biceps,Thigh,Notes\n";
      reportData.forEach((row: any) => {
        csvContent += `"${row.date}","${row.memberDisplayId}","${row.memberName}",${row.weight},${row.bmi},${row.bodyFat},${row.chest},${row.waist},${row.hip},${row.biceps},${row.thigh},"${row.notes || ""}"\n`;
      });
    } else if (activeTab === "ATTENDANCE") {
      csvContent = "Date,Member ID,Name,Check-In,Check-Out,Remarks,Marked By\n";
      reportData.forEach((row: any) => {
        csvContent += `"${row.date}","${row.memberDisplayId}","${row.memberName}","${row.timeIn}","${row.timeOut}","${row.remarks}","${row.markedBy}"\n`;
      });
    } else if (activeTab === "RENEWAL") {
      csvContent = "Member ID,Name,Membership Plan,Start Date,End Date,Price Paid ($),Status\n";
      reportData.forEach((row: any) => {
        csvContent += `"${row.memberDisplayId}","${row.memberName}","${row.planName}","${row.startDate}","${row.endDate}",${row.pricePaid},"${row.status}"\n`;
      });
    } else if (activeTab === "TRAINER") {
      csvContent = "Trainer Name,Email,Phone,Status,Client Count,Assigned Members\n";
      reportData.forEach((row: any) => {
        csvContent += `"${row.trainerName}","${row.trainerEmail}","${row.trainerPhone}","${row.status}",${row.assignedClientsCount},"${row.clients || ""}"\n`;
      });
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
  };

  // Export Excel Simulated (Tab Separated UTF-16 with Headers)
  const handleExportExcel = () => {
    if (!reportData || reportData.length === 0) {
      alert("No records found to export.");
      return;
    }

    let templateTxt = "";
    let fileName = `gymflow_${activeTab.toLowerCase()}_report.xls`;

    if (activeTab === "MEMBER") {
      templateTxt = "Member ID\tFull Name\tEmail\tPhone\tJoined Date\tPlan\tStatus\n";
      reportData.forEach((row: any) => {
        templateTxt += `${row.memberDisplayId}\t${row.fullName}\t${row.email}\t${row.phone}\t${row.joiningDate}\t${row.activePlan}\t${row.status}\n`;
      });
    } else if (activeTab === "PROGRESS") {
      templateTxt = "Date\tMember ID\tName\tWeight\tBMI\tBody Fat\tChest\tWaist\tHip\tBiceps\tThigh\tNotes\n";
      reportData.forEach((row: any) => {
        templateTxt += `${row.date}\t${row.memberDisplayId}\t${row.memberName}\t${row.weight}\t${row.bmi}\t${row.bodyFat}\t${row.chest}\t${row.waist}\t${row.hip}\t${row.biceps}\t${row.thigh}\t${row.notes || ""}\n`;
      });
    } else if (activeTab === "ATTENDANCE") {
      templateTxt = "Date\tMember ID\tName\tCheck-In\tCheck-Out\tRemarks\tMarked By\n";
      reportData.forEach((row: any) => {
        templateTxt += `${row.date}\t${row.memberDisplayId}\t${row.memberName}\t${row.timeIn}\t${row.timeOut}\t${row.remarks}\t${row.markedBy}\n`;
      });
    } else if (activeTab === "RENEWAL") {
      templateTxt = "Member ID\tName\tMembership Plan\tStart Date\tEnd Date\tPrice Paid\tStatus\n";
      reportData.forEach((row: any) => {
        templateTxt += `${row.memberDisplayId}\t${row.memberName}\t${row.planName}\t${row.startDate}\t${row.endDate}\t${row.pricePaid}\t${row.status}\n`;
      });
    } else if (activeTab === "TRAINER") {
      templateTxt = "Trainer Name\tEmail\tPhone\tStatus\tClient Count\tAssigned Members\n";
      reportData.forEach((row: any) => {
        templateTxt += `${row.trainerName}\t${row.trainerEmail}\t${row.trainerPhone}\t${row.status}\t${row.assignedClientsCount}\t${row.clients || ""}\n`;
      });
    }

    const blob = new Blob([templateTxt], { type: "application/vnd.ms-excel;charset=utf-16;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Printable Iframe generator for PDF download/Printing
  const handlePrintPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    let tableHtml = "";
    if (activeTab === "MEMBER") {
      tableHtml = `
        <thead>
          <tr>
            <th>Member ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Joined Date</th>
            <th>Active Plan</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${reportData.map(r => `
            <tr>
              <td>${r.memberDisplayId}</td>
              <td style="font-weight: bold;">${r.fullName}</td>
              <td>${r.email}</td>
              <td>${r.phone}</td>
              <td>${r.joiningDate}</td>
              <td>${r.activePlan}</td>
              <td><span style="text-transform: uppercase; font-family: monospace;">${r.status}</span></td>
            </tr>
          `).join("")}
        </tbody>
      `;
    } else if (activeTab === "PROGRESS") {
      tableHtml = `
        <thead>
          <tr>
            <th>Date</th>
            <th>ID</th>
            <th>Name</th>
            <th>Weight</th>
            <th>BMI</th>
            <th>Fat %</th>
            <th>Waist</th>
            <th>Chest</th>
            <th>Biceps</th>
            <th>Thigh</th>
          </tr>
        </thead>
        <tbody>
          ${reportData.map(r => `
            <tr>
              <td>${r.date}</td>
              <td>${r.memberDisplayId}</td>
              <td>${r.memberName}</td>
              <td>${r.weight} kg</td>
              <td>${r.bmi}</td>
              <td>${r.bodyFat}%</td>
              <td>${r.waist} cm</td>
              <td>${r.chest} cm</td>
              <td>${r.biceps} cm</td>
              <td>${r.thigh} cm</td>
            </tr>
          `).join("")}
        </tbody>
      `;
    } else if (activeTab === "ATTENDANCE") {
      tableHtml = `
        <thead>
          <tr>
            <th>Date</th>
            <th>ID</th>
            <th>Name</th>
            <th>In</th>
            <th>Out</th>
            <th>Remarks</th>
            <th>Marked By</th>
          </tr>
        </thead>
        <tbody>
          ${reportData.map(r => `
            <tr>
              <td>${r.date}</td>
              <td>${r.memberDisplayId}</td>
              <td>${r.memberName}</td>
              <td style="color: green;">${r.timeIn}</td>
              <td>${r.timeOut}</td>
              <td>${r.remarks}</td>
              <td>${r.markedBy}</td>
            </tr>
          `).join("")}
        </tbody>
      `;
    } else if (activeTab === "RENEWAL") {
      tableHtml = `
        <thead>
          <tr>
            <th>Member ID</th>
            <th>Name</th>
            <th>Membership Plan</th>
            <th>Start Date</th>
            <th>End Date</th>
            <th>Price Paid</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${reportData.map(r => `
            <tr>
              <td>${r.memberDisplayId}</td>
              <td>${r.memberName}</td>
              <td>${r.planName}</td>
              <td>${r.startDate}</td>
              <td>${r.endDate}</td>
              <td>$${r.pricePaid}</td>
              <td>${r.status}</td>
            </tr>
          `).join("")}
        </tbody>
      `;
    } else if (activeTab === "TRAINER") {
      tableHtml = `
        <thead>
          <tr>
            <th>Trainer Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Status</th>
            <th>Clients Count</th>
            <th>Clients Roster</th>
          </tr>
        </thead>
        <tbody>
          ${reportData.map(r => `
            <tr>
              <td style="font-weight: bold;">${r.trainerName}</td>
              <td>${r.trainerEmail}</td>
              <td>${r.trainerPhone}</td>
              <td>${r.status}</td>
              <td>${r.assignedClientsCount}</td>
              <td>${r.clients || "N/A"}</td>
            </tr>
          `).join("")}
        </tbody>
      `;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>GymFlow SaaS - Audit Report - ${activeTab}</title>
          <style>
            body { font-family: sans-serif; color: #111; margin: 30px; font-size: 13px; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ed8936; padding-bottom: 15px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 20px; font-weight: 900; letter-spacing: -0.5px; }
            .header p { margin: 2px 0 0 0; color: #666; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background-color: #f7fafc; color: #4a5568; font-family: monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0; }
            td { padding: 10px; border-bottom: 1px solid #edf2f7; font-size: 11px; }
            .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #a0aec0; border-top: 1px dashed #e2e8f0; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>${activeTab} REPORT</h1>
              <p>GYM ID: ${user.gymId || "saas-system-sandbox"} • Generated: ${new Date().toLocaleDateString()}</p>
            </div>
            <div>
              <strong>GYMFLOW CRM</strong>
            </div>
          </div>
          <table>
            ${tableHtml}
          </table>
          <div class="footer">
            GymFlow Multi-Tenant Cloud SaaS System - Corporate Ledger Security Approved
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 text-zinc-100">
      
      {/* Header */}
      <div className="border-b border-zinc-850 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-6 bg-amber-500 rounded-full inline-block"></span>
            Reports & Analytical Audit Desk
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Export secure CSV files, generate printable PDFs, or download Excel matrices isolated strictly by Gym ID.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-zinc-900 border border-zinc-800 hover:border-amber-500 text-white font-semibold rounded-xl text-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-zinc-900 border border-zinc-800 hover:border-amber-500 text-white font-semibold rounded-xl text-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" /> Excel
          </button>
          <button
            type="button"
            onClick={handlePrintPDF}
            className="px-4.5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-black stroke-[2.5]" /> Print PDF Report
          </button>
        </div>
      </div>

      {/* Report Categories tabs */}
      <div className="flex flex-wrap border-b border-zinc-800 text-xs font-mono">
        {(["MEMBER", "PROGRESS", "ATTENDANCE", "RENEWAL", "TRAINER"] as ReportType[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`py-3 px-5 border-b-2 font-bold cursor-pointer transition-all ${
              activeTab === tab ? "border-amber-500 text-amber-500 bg-amber-500/5" : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            {tab} REPORT
          </button>
        ))}
      </div>

      {/* Main Table Segment */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 overflow-hidden shadow-xl">
        {loading ? (
          <div className="text-center py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
            <span className="text-[10px] text-zinc-500 font-mono block mt-2">Connecting multi-tenant database ledger...</span>
          </div>
        ) : reportData.length === 0 ? (
          <div className="text-center py-16 text-zinc-500 text-xs font-mono">
            No entries loaded for this Gym ID segment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === "MEMBER" && (
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-[10px] uppercase font-mono tracking-wider">
                    <th className="pb-2.5">Member ID</th>
                    <th className="pb-2.5">Full Name</th>
                    <th className="pb-2.5">Email</th>
                    <th className="pb-2.5">Phone</th>
                    <th className="pb-2.5">Joining Date</th>
                    <th className="pb-2.5">Active Membership</th>
                    <th className="pb-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-805 text-[11px]">
                  {reportData.map((m: any, idx) => (
                    <tr key={idx} className="hover:bg-zinc-850/40">
                      <td className="py-2.5 font-mono text-zinc-400">{m.memberDisplayId}</td>
                      <td className="py-2.5 font-bold text-white">{m.fullName}</td>
                      <td className="py-2.5 text-zinc-400">{m.email}</td>
                      <td className="py-2.5 text-zinc-300 font-mono">{m.phone}</td>
                      <td className="py-2.5 text-zinc-400 font-mono">{m.joiningDate}</td>
                      <td className="py-2.5 text-zinc-300">{m.activePlan}</td>
                      <td className="py-2.5">
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
            )}

            {activeTab === "PROGRESS" && (
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-[10px] uppercase font-mono tracking-wider">
                    <th className="pb-2.5">Date</th>
                    <th className="pb-2.5">Code</th>
                    <th className="pb-2.5">Athlete</th>
                    <th className="pb-2.5">Weight (kg)</th>
                    <th className="pb-2.5">BMI</th>
                    <th className="pb-2.5">Fat %</th>
                    <th className="pb-2.5">Biceps</th>
                    <th className="pb-2.5">Waist/Hip</th>
                    <th className="pb-2.5">Log Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-805 text-[11px]">
                  {reportData.map((p: any, idx) => (
                    <tr key={idx} className="hover:bg-zinc-850/40">
                      <td className="py-2.5 font-mono text-zinc-400">{p.date}</td>
                      <td className="py-2.5 font-mono">{p.memberDisplayId}</td>
                      <td className="py-2.5 font-bold text-white">{p.memberName}</td>
                      <td className="py-2.5 text-zinc-300 font-mono">{p.weight} kg</td>
                      <td className="py-2.5 text-amber-500 font-bold font-mono">{p.bmi}</td>
                      <td className="py-2.5 font-mono text-zinc-400">{p.bodyFat}%</td>
                      <td className="py-2.5 text-zinc-400">{p.biceps} cm</td>
                      <td className="py-2.5 text-zinc-500 font-mono">{p.waist} / {p.hip}</td>
                      <td className="py-2.5 text-zinc-400 italic max-w-xs truncate">{p.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === "ATTENDANCE" && (
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-[10px] uppercase font-mono tracking-wider">
                    <th className="pb-2.5">Date</th>
                    <th className="pb-2.5">Code</th>
                    <th className="pb-2.5">Name</th>
                    <th className="pb-2.5">Entry In</th>
                    <th className="pb-2.5">Exit Out</th>
                    <th className="pb-2.5">Remarks</th>
                    <th className="pb-2.5">Marked By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850 text-[11px]">
                  {reportData.map((a: any, idx) => (
                    <tr key={idx} className="hover:bg-zinc-850/40">
                      <td className="py-2.5 font-mono text-zinc-400">{a.date}</td>
                      <td className="py-2.5 font-mono">{a.memberDisplayId}</td>
                      <td className="py-2.5 font-bold text-white">{a.memberName}</td>
                      <td className="py-2.5 font-mono text-emerald-400">{a.timeIn}</td>
                      <td className="py-2.5 font-mono text-zinc-500">{a.timeOut || "Active"}</td>
                      <td className="py-2.5 text-zinc-300 italic">{a.remarks}</td>
                      <td className="py-2.5 font-mono text-zinc-500">{a.markedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === "RENEWAL" && (
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-[10px] uppercase font-mono tracking-wider">
                    <th className="pb-2.5">Member ID</th>
                    <th className="pb-2.5">Name</th>
                    <th className="pb-2.5">Active Plan</th>
                    <th className="pb-2.5">Start Date</th>
                    <th className="pb-2.5">End Date</th>
                    <th className="pb-2.5">Price Paid</th>
                    <th className="pb-2.5">Standing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850 text-[11px]">
                  {reportData.map((r: any, idx) => (
                    <tr key={idx} className="hover:bg-zinc-850/40">
                      <td className="py-2.5 font-mono text-zinc-400">{r.memberDisplayId}</td>
                      <td className="py-2.5 font-bold text-white">{r.memberName}</td>
                      <td className="py-2.5 text-zinc-300">{r.planName}</td>
                      <td className="py-2.5 font-mono">{r.startDate}</td>
                      <td className="py-2.5 font-mono text-amber-500">{r.endDate}</td>
                      <td className="py-2.5 font-mono text-white font-extrabold">${r.pricePaid}</td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          r.status === "Active" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-500"
                        }`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === "TRAINER" && (
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-[10px] uppercase font-mono tracking-wider">
                    <th className="pb-2.5">Trainer Name</th>
                    <th className="pb-2.5">Email</th>
                    <th className="pb-2.5">Phone</th>
                    <th className="pb-2.5">Duty status</th>
                    <th className="pb-2.5">Client Density</th>
                    <th className="pb-2.5">Assigned Athletes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850 text-[11px]">
                  {reportData.map((t: any, idx) => (
                    <tr key={idx} className="hover:bg-zinc-850/40">
                      <td className="py-2.5 font-bold text-white">{t.trainerName}</td>
                      <td className="py-2.5 text-zinc-400">{t.trainerEmail}</td>
                      <td className="py-2.5 text-zinc-500 font-mono">{t.trainerPhone}</td>
                      <td className="py-2.5 text-zinc-400">{t.status || "Active"}</td>
                      <td className="py-2.5 font-mono text-amber-500 font-extrabold">{t.assignedClientsCount} active</td>
                      <td className="py-2.5 text-zinc-300 max-w-sm truncate italic" title={t.clients}>{t.clients || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
