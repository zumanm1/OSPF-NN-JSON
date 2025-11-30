/**
 * Blast Radius PDF Report Generator Service
 * B04-04: PDF Report Generator (P1, 5pts)
 *
 * Generate professional PDF reports with all blast radius analysis data
 * 6-page structure: Summary, Visualization, Matrix, Details, Risk, Appendix
 */

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

import {
  PDFReportData,
  BlastRadiusScore,
  ImpactResult,
  CountryFlowAggregation,
  Recommendation,
  RollbackPlan,
  RISK_COLORS
} from '../types/blastRadius.types';

/**
 * Generate comprehensive blast radius PDF report
 */
export async function exportBlastRadiusPDF(
  data: PDFReportData
): Promise<void> {
  const pdf = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let currentPage = 1;

  // Helper function for page header/footer
  const addPageHeader = (title: string) => {
    pdf.setFontSize(10);
    pdf.setTextColor(128, 128, 128);
    pdf.text('OSPF Network Visualizer Pro - Blast Radius Analysis', 20, 10);
    pdf.text(`Page ${currentPage}`, pageWidth - 30, 10);
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(14);
    pdf.text(title, 20, 25);
  };

  // PAGE 1: Executive Summary
  addPageHeader('Executive Summary');
  addExecutiveSummary(pdf, data, pageWidth, pageHeight);

  // PAGE 2: Visual Impact (if network element provided)
  if (data.networkElement) {
    pdf.addPage();
    currentPage++;
    addPageHeader('Network Impact Visualization');
    await addNetworkVisualization(pdf, data.networkElement, pageWidth);
  }

  // PAGE 3: Country Impact Matrix
  pdf.addPage();
  currentPage++;
  addPageHeader('Country-Level Impact Matrix');
  addCountryMatrix(pdf, data.countryAggregations);

  // PAGE 4: Detailed Flow List
  pdf.addPage();
  currentPage++;
  addPageHeader('Detailed Flow Analysis (Top 40)');
  addFlowDetails(pdf, data.impactResults);

  // PAGE 5: Risk Analysis
  pdf.addPage();
  currentPage++;
  addPageHeader('Risk Analysis Breakdown');
  addRiskAnalysis(pdf, data.riskScore, data.recommendations, data.rollbackPlan, pageHeight);

  // PAGE 6: Appendix
  pdf.addPage();
  currentPage++;
  addPageHeader('Appendix');
  addAppendix(pdf, data.metadata);

  // Save the PDF
  const filename = `blast-radius-${data.changedEdge.from}-${data.changedEdge.to}-${Date.now()}.pdf`;
  pdf.save(filename);
}

/**
 * Add executive summary to page 1
 */
function addExecutiveSummary(
  pdf: jsPDF,
  data: PDFReportData,
  pageWidth: number,
  pageHeight: number
): void {
  // Change Description
  pdf.setFontSize(11);
  pdf.text(`Change: ${data.changedEdge.from} → ${data.changedEdge.to}`, 20, 40);
  pdf.text(`Cost: ${data.changedEdge.oldCost} → ${data.changedEdge.newCost}`, 20, 47);
  pdf.text(`Generated: ${data.metadata.generatedAt.toLocaleString()}`, 20, 54);

  // Risk Score Box
  const riskColor = RISK_COLORS[data.riskScore.risk].rgb;
  pdf.setFillColor(riskColor[0], riskColor[1], riskColor[2]);
  pdf.rect(20, 65, 60, 25, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.text(`${data.riskScore.overall}/100`, 30, 78);
  pdf.setFontSize(12);
  pdf.text(data.riskScore.risk, 30, 86);
  pdf.setTextColor(0, 0, 0);

  // Key Metrics
  pdf.setFontSize(11);
  pdf.text('Key Metrics:', 90, 70);
  pdf.setFontSize(10);
  pdf.text(`• Affected Flows: ${data.riskScore.details.affectedFlows} (${data.riskScore.details.affectedPercentage.toFixed(1)}%)`, 95, 78);
  pdf.text(`• Countries Impacted: ${data.riskScore.details.countriesAffected}`, 95, 85);
  pdf.text(`• Avg Cost Change: ${data.riskScore.details.avgCostChangePct.toFixed(1)}%`, 95, 92);

  // Main Recommendation
  const mainRec = data.recommendations.find(r => r.category === 'main');
  if (mainRec) {
    pdf.setFontSize(12);
    pdf.text('Recommendation:', 20, 105);
    pdf.setFontSize(11);
    pdf.text(`${mainRec.type}: ${mainRec.title}`, 20, 113);
    pdf.setFontSize(10);
    const lines = pdf.splitTextToSize(mainRec.description, pageWidth - 40);
    pdf.text(lines, 20, 121);
  }

  // Concerns Summary
  const concerns = data.recommendations.filter(r => r.category === 'concern');
  if (concerns.length > 0) {
    pdf.setFontSize(11);
    pdf.text(`Concerns (${concerns.length}):`, 20, 140);
    pdf.setFontSize(9);
    concerns.slice(0, 4).forEach((c, i) => {
      const severity = c.severity === 'error' ? '⚠️' : '⚡';
      pdf.text(`${severity} ${c.title}`, 25, 148 + i * 7);
    });
  }

  // Signature Section
  pdf.setFontSize(11);
  pdf.text('Approval:', 20, pageHeight - 50);
  pdf.line(20, pageHeight - 45, pageWidth - 20, pageHeight - 45);
  pdf.setFontSize(10);
  pdf.text('Approved By: _________________________', 20, pageHeight - 35);
  pdf.text('Date: _____________', 120, pageHeight - 35);
  pdf.text('Signature: _________________________', 20, pageHeight - 25);
}

/**
 * Add network visualization capture to page 2
 */
async function addNetworkVisualization(
  pdf: jsPDF,
  networkElement: HTMLElement,
  pageWidth: number
): Promise<void> {
  try {
    const canvas = await html2canvas(networkElement, {
      backgroundColor: '#1a1a2e',
      scale: 2
    });
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 15, 35, pageWidth - 30, 140);

    // Add legend
    pdf.setFontSize(10);
    pdf.text('Legend:', 20, 185);
    pdf.setFillColor(239, 68, 68); // Red
    pdf.rect(25, 190, 10, 5, 'F');
    pdf.text('Direct Impact', 40, 194);

    pdf.setFillColor(249, 115, 22); // Orange
    pdf.rect(80, 190, 10, 5, 'F');
    pdf.text('Indirect Impact', 95, 194);

    pdf.setFillColor(234, 179, 8); // Yellow
    pdf.rect(140, 190, 10, 5, 'F');
    pdf.text('Secondary Impact', 155, 194);
  } catch (e) {
    pdf.setFontSize(10);
    pdf.text('Network visualization could not be captured.', 20, 50);
    pdf.text('Error: ' + (e as Error).message, 20, 60);
  }
}

/**
 * Add country impact matrix to page 3
 */
function addCountryMatrix(
  pdf: jsPDF,
  aggregations: CountryFlowAggregation[]
): void {
  const matrixData = aggregations.slice(0, 30).map(agg => [
    agg.srcCountry,
    agg.destCountry,
    agg.flowCount.toString(),
    (agg.avgCostChangePct >= 0 ? '+' : '') + agg.avgCostChangePct.toFixed(1) + '%',
    agg.pathMigrations.toString(),
    agg.lostECMP.toString()
  ]);

  (pdf as any).autoTable({
    startY: 35,
    head: [['Source', 'Dest', 'Flows', 'Avg Δ', 'Rerouted', 'Lost ECMP']],
    body: matrixData,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 25 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 25, halign: 'center' },
      5: { cellWidth: 25, halign: 'center' }
    }
  });

  // Add summary stats
  const totalFlows = aggregations.reduce((sum, a) => sum + a.flowCount, 0);
  const totalRerouted = aggregations.reduce((sum, a) => sum + a.pathMigrations, 0);
  const totalLostECMP = aggregations.reduce((sum, a) => sum + a.lostECMP, 0);

  const finalY = (pdf as any).lastAutoTable.finalY || 200;
  pdf.setFontSize(10);
  pdf.text(`Total: ${totalFlows} flows, ${totalRerouted} rerouted, ${totalLostECMP} lost ECMP`, 20, finalY + 10);
}

/**
 * Add detailed flow analysis to page 4
 */
function addFlowDetails(
  pdf: jsPDF,
  impactResults: ImpactResult[]
): void {
  const flowData = impactResults.slice(0, 40).map(r => [
    `${r.src.name.substring(0, 8)} → ${r.dest.name.substring(0, 8)}`,
    r.oldCost.toString(),
    r.newCost.toString(),
    r.oldCost > 0 ? ((r.newCost - r.oldCost) / r.oldCost * 100).toFixed(0) + '%' : 'N/A',
    r.impactType.substring(0, 12)
  ]);

  (pdf as any).autoTable({
    startY: 35,
    head: [['Flow', 'Old Cost', 'New Cost', 'Δ%', 'Impact Type']],
    body: flowData,
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [52, 73, 94], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 25, halign: 'right' },
      2: { cellWidth: 25, halign: 'right' },
      3: { cellWidth: 20, halign: 'right' },
      4: { cellWidth: 35 }
    }
  });

  // Add note about truncation if needed
  if (impactResults.length > 40) {
    const finalY = (pdf as any).lastAutoTable.finalY || 250;
    pdf.setFontSize(9);
    pdf.setTextColor(128, 128, 128);
    pdf.text(`Note: Showing 40 of ${impactResults.length} total affected flows.`, 20, finalY + 8);
    pdf.setTextColor(0, 0, 0);
  }
}

/**
 * Add risk analysis breakdown to page 5
 */
function addRiskAnalysis(
  pdf: jsPDF,
  riskScore: BlastRadiusScore,
  recommendations: Recommendation[],
  rollbackPlan: RollbackPlan,
  pageHeight: number
): void {
  pdf.setFontSize(11);
  pdf.text(`Overall Score: ${riskScore.overall}/100 (${riskScore.risk})`, 20, 40);

  // Score breakdown
  pdf.setFontSize(10);
  const breakdown = riskScore.breakdown;
  const details = riskScore.details;

  // Draw score bars
  const barY = 50;
  const barHeight = 8;
  const maxBarWidth = 80;

  // Flow Impact bar
  pdf.text(`Flow Impact: ${breakdown.flowImpact}/40`, 20, barY + 5);
  pdf.setFillColor(200, 200, 200);
  pdf.rect(90, barY, maxBarWidth, barHeight, 'F');
  pdf.setFillColor(41, 128, 185);
  pdf.rect(90, barY, (breakdown.flowImpact / 40) * maxBarWidth, barHeight, 'F');
  pdf.setFontSize(8);
  pdf.text(`${details.affectedFlows} of ${details.totalFlows} flows`, 90, barY + 15);

  // Cost Magnitude bar
  pdf.setFontSize(10);
  pdf.text(`Cost Magnitude: ${breakdown.costMagnitude}/30`, 20, barY + 30);
  pdf.setFillColor(200, 200, 200);
  pdf.rect(90, barY + 25, maxBarWidth, barHeight, 'F');
  pdf.setFillColor(46, 204, 113);
  pdf.rect(90, barY + 25, (breakdown.costMagnitude / 30) * maxBarWidth, barHeight, 'F');
  pdf.setFontSize(8);
  pdf.text(`Avg change: ${details.avgCostChangePct.toFixed(1)}%`, 90, barY + 40);

  // Country Diversity bar
  pdf.setFontSize(10);
  pdf.text(`Country Diversity: ${breakdown.countryDiversity}/20`, 20, barY + 55);
  pdf.setFillColor(200, 200, 200);
  pdf.rect(90, barY + 50, maxBarWidth, barHeight, 'F');
  pdf.setFillColor(155, 89, 182);
  pdf.rect(90, barY + 50, (breakdown.countryDiversity / 20) * maxBarWidth, barHeight, 'F');
  pdf.setFontSize(8);
  pdf.text(`${details.countriesAffected} countries`, 90, barY + 65);

  // Critical Paths bar
  pdf.setFontSize(10);
  pdf.text(`Critical Paths: ${breakdown.criticalPaths}/10`, 20, barY + 80);
  pdf.setFillColor(200, 200, 200);
  pdf.rect(90, barY + 75, maxBarWidth, barHeight, 'F');
  pdf.setFillColor(231, 76, 60);
  pdf.rect(90, barY + 75, (breakdown.criticalPaths / 10) * maxBarWidth, barHeight, 'F');
  pdf.setFontSize(8);
  pdf.text(`${details.criticalPathCount} intercountry changes`, 90, barY + 90);

  // Concerns
  const concerns = recommendations.filter(r => r.category === 'concern');
  if (concerns.length > 0) {
    pdf.setFontSize(11);
    pdf.text('Concerns:', 20, 150);
    pdf.setFontSize(9);
    concerns.slice(0, 5).forEach((c, i) => {
      const icon = c.severity === 'error' ? '!' : '•';
      pdf.text(`${icon} ${c.title}: ${c.description.substring(0, 70)}...`, 25, 158 + i * 8);
    });
  }

  // Rollback Plan
  pdf.setFontSize(11);
  pdf.text('Rollback Plan:', 20, 200);
  pdf.setFontSize(9);
  rollbackPlan.steps.forEach((step, i) => {
    pdf.text(`${i + 1}. ${step}`, 25, 208 + i * 7);
  });

  // CLI Command
  pdf.setFontSize(10);
  pdf.text('CLI Command:', 20, 250);
  pdf.setFontSize(8);
  pdf.setFont('courier', 'normal');
  const cliLines = rollbackPlan.cliCommand.split('\n').slice(0, 5);
  cliLines.forEach((line, i) => {
    pdf.text(line, 25, 258 + i * 5);
  });
  pdf.setFont('helvetica', 'normal');
}

/**
 * Add appendix to page 6
 */
function addAppendix(
  pdf: jsPDF,
  metadata: PDFReportData['metadata']
): void {
  pdf.setFontSize(10);
  pdf.text('Analysis Metadata:', 20, 40);
  pdf.text(`  Tool: OSPF Network Visualizer Pro`, 25, 48);
  pdf.text(`  Version: ${metadata.analysisVersion}`, 25, 55);
  pdf.text(`  Analysis Date: ${metadata.generatedAt.toISOString()}`, 25, 62);
  pdf.text(`  Network Size: ${metadata.networkSize.nodes} routers, ${metadata.networkSize.links} links`, 25, 69);

  // Methodology
  pdf.setFontSize(11);
  pdf.text('Scoring Methodology:', 20, 85);
  pdf.setFontSize(9);
  pdf.text('The Blast Radius Score is calculated using four weighted factors:', 25, 93);
  pdf.text('• Flow Impact (0-40 pts): Percentage of total network flows affected', 30, 101);
  pdf.text('• Cost Magnitude (0-30 pts): Average path cost change percentage', 30, 108);
  pdf.text('• Country Diversity (0-20 pts): Number of countries with affected flows', 30, 115);
  pdf.text('• Critical Paths (0-10 pts): Intercountry flows with path changes', 30, 122);

  // Risk Levels
  pdf.setFontSize(11);
  pdf.text('Risk Level Definitions:', 20, 138);
  pdf.setFontSize(9);
  pdf.text('• LOW (0-19): Minimal impact, safe for normal operations', 30, 146);
  pdf.text('• MEDIUM (20-39): Moderate impact, apply during low-traffic windows', 30, 153);
  pdf.text('• HIGH (40-69): Significant impact, requires approval and maintenance window', 30, 160);
  pdf.text('• CRITICAL (70-100): Major impact, consider phased rollout or alternatives', 30, 167);

  // Contact
  pdf.setFontSize(11);
  pdf.text('Contact:', 20, 185);
  pdf.setFontSize(9);
  pdf.text('  Network Operations Team', 25, 193);
  pdf.text('  Email: netops@company.com', 25, 200);

  // Disclaimer
  pdf.setFontSize(8);
  pdf.setTextColor(128, 128, 128);
  pdf.text('This report is generated automatically. Verify critical changes before implementation.', 20, 220);
  pdf.setTextColor(0, 0, 0);
}

/**
 * Export flows to CSV format
 */
export function exportFlowsCSV(
  impactResults: ImpactResult[],
  changedEdge: { from: string; to: string }
): void {
  const headers = [
    'Source', 'Destination', 'Source_Country', 'Dest_Country',
    'Old_Path', 'New_Path', 'Old_Cost', 'New_Cost', 'Cost_Delta', 'Cost_Delta_Pct',
    'Path_Changed', 'Was_ECMP', 'Is_ECMP', 'Impact_Type'
  ];

  const rows = impactResults.map(r => [
    r.src.name,
    r.dest.name,
    r.src.country || 'Unknown',
    r.dest.country || 'Unknown',
    r.oldPath.join(' → '),
    r.newPath.join(' → '),
    r.oldCost,
    r.newCost,
    r.newCost - r.oldCost,
    r.oldCost > 0 ? ((r.newCost - r.oldCost) / r.oldCost * 100).toFixed(2) : '0',
    r.pathChanged,
    r.wasECMP || false,
    r.isECMP || false,
    r.impactType
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell =>
      typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
    ).join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `blast-radius-flows-${changedEdge.from}-${changedEdge.to}-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export full analysis to JSON
 */
export function exportAnalysisJSON(data: PDFReportData): void {
  const exportData = {
    changedEdge: data.changedEdge,
    riskScore: data.riskScore,
    recommendations: data.recommendations,
    countryAggregations: data.countryAggregations.map(agg => ({
      ...agg,
      flows: undefined // Exclude detailed flows to reduce size
    })),
    rollbackPlan: data.rollbackPlan,
    metadata: {
      ...data.metadata,
      generatedAt: data.metadata.generatedAt.toISOString()
    },
    summary: {
      totalAffectedFlows: data.impactResults.length,
      mainRecommendation: data.recommendations.find(r => r.category === 'main')?.type,
      concernCount: data.recommendations.filter(r => r.category === 'concern').length
    }
  };

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `blast-radius-analysis-${data.changedEdge.from}-${data.changedEdge.to}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
