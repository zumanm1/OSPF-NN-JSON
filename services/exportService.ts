/**
 * Export Service - PDF and CSV Generation
 * B01-07: PDF Export Service (P1, 3pts)
 * B01-08: CSV Export Service (P2, 1pt)
 *
 * Generate professional reports for path comparison analysis
 */

import { PathInfo, ECMPGroup, ExportOptions } from '../types/pathComparison.types';

/**
 * Export path metrics to CSV file
 * B01-08: CSV Export Service
 */
export function exportPathMetricsCSV(paths: PathInfo[], filename?: string): void {
  const headers = [
    'Path_ID',
    'Source',
    'Destination',
    'Hop_Count',
    'Total_Cost',
    'Latency_ms',
    'Min_Bandwidth_Mbps',
    'Max_Utilization_%',
    'Shared_Links',
    'Countries_Traversed',
    'Diversity_Score',
    'Is_ECMP',
    'Node_Sequence',
    'Edge_Sequence'
  ];

  const rows = paths.map(p => [
    p.id,
    p.source,
    p.destination,
    p.metrics.hopCount,
    p.metrics.totalCost,
    p.metrics.estimatedLatency,
    p.metrics.minBandwidth,
    (p.metrics.maxUtilization * 100).toFixed(1),
    p.metrics.sharedLinkCount,
    p.metrics.countriesTraversed.join(' → '),
    p.metrics.diversityScore,
    p.isECMP ? 'Yes' : 'No',
    p.nodeSequence.join(' → '),
    p.edgeSequence.join(',')
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell =>
      typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))
        ? `"${cell.replace(/"/g, '""')}"`
        : cell
    ).join(','))
  ].join('\n');

  downloadFile(csv, filename || `path-metrics-${Date.now()}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Export ECMP analysis to CSV
 */
export function exportECMPAnalysisCSV(ecmpGroup: ECMPGroup, filename?: string): void {
  const headers = [
    'Group_ID',
    'Source',
    'Destination',
    'Total_Cost',
    'Path_Count',
    'Divergence_Points',
    'Convergence_Points',
    'Total_Bandwidth_Mbps',
    'Is_Balanced',
    'Warnings'
  ];

  const row = [
    ecmpGroup.groupId,
    ecmpGroup.source,
    ecmpGroup.destination,
    ecmpGroup.cost,
    ecmpGroup.paths.length,
    ecmpGroup.divergencePoints.map(d => d.nodeId).join(';'),
    ecmpGroup.convergencePoints.map(c => c.nodeId).join(';'),
    ecmpGroup.loadBalancing.totalCapacity,
    ecmpGroup.loadBalancing.isBalanced ? 'Yes' : 'No',
    ecmpGroup.loadBalancing.warnings.join('; ')
  ];

  // Also include per-path details
  const pathHeaders = [
    '',
    'Path_ID',
    'Hops',
    'Cost',
    'Latency_ms',
    'Bandwidth_Mbps',
    'Load_Share_%',
    'Countries'
  ];

  const pathRows = ecmpGroup.paths.map(p => [
    '',
    p.id,
    p.metrics.hopCount,
    p.metrics.totalCost,
    p.metrics.estimatedLatency,
    p.metrics.minBandwidth,
    ecmpGroup.loadBalancing.distribution.get(p.id)?.toFixed(1) || 'N/A',
    p.metrics.countriesTraversed.join(' → ')
  ]);

  const csv = [
    headers.join(','),
    row.map(cell =>
      typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
    ).join(','),
    '',
    'Path Details:',
    pathHeaders.join(','),
    ...pathRows.map(r => r.join(','))
  ].join('\n');

  downloadFile(csv, filename || `ecmp-analysis-${ecmpGroup.groupId}-${Date.now()}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Export comparison report to CSV
 */
export function exportComparisonCSV(
  beforePaths: PathInfo[],
  afterPaths: PathInfo[],
  summary: string,
  filename?: string
): void {
  const lines: string[] = [];

  // Summary section
  lines.push('Comparison Summary');
  lines.push(`"${summary}"`);
  lines.push('');

  // Before paths
  lines.push('BEFORE:');
  lines.push('Path_ID,Hops,Cost,Latency_ms,Countries');
  beforePaths.forEach(p => {
    lines.push([
      p.id,
      p.metrics.hopCount,
      p.metrics.totalCost,
      p.metrics.estimatedLatency,
      `"${p.metrics.countriesTraversed.join(' → ')}"`
    ].join(','));
  });

  lines.push('');

  // After paths
  lines.push('AFTER:');
  lines.push('Path_ID,Hops,Cost,Latency_ms,Countries');
  afterPaths.forEach(p => {
    lines.push([
      p.id,
      p.metrics.hopCount,
      p.metrics.totalCost,
      p.metrics.estimatedLatency,
      `"${p.metrics.countriesTraversed.join(' → ')}"`
    ].join(','));
  });

  lines.push('');

  // Delta analysis
  lines.push('CHANGES:');
  const beforeCost = beforePaths.length > 0 ? beforePaths[0].metrics.totalCost : 0;
  const afterCost = afterPaths.length > 0 ? afterPaths[0].metrics.totalCost : 0;
  lines.push(`Cost Delta,${afterCost - beforeCost}`);
  lines.push(`Path Count Change,${afterPaths.length - beforePaths.length}`);

  downloadFile(lines.join('\n'), filename || `path-comparison-${Date.now()}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Generate and download PDF report
 * B01-07: PDF Export Service
 *
 * Note: This implementation uses HTML-to-PDF approach since jsPDF
 * requires additional setup. For production, integrate jsPDF + html2canvas.
 */
export async function exportPathComparisonPDF(
  paths: PathInfo[],
  ecmpAnalysis: ECMPGroup | null,
  options: ExportOptions
): Promise<void> {
  // Create HTML content for the report
  const html = generatePDFHTML(paths, ecmpAnalysis, options);

  // For now, we'll create a printable HTML and trigger print dialog
  // In production, use jsPDF + html2canvas or a server-side PDF generator
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    console.error('Could not open print window');
    // Fallback: download as HTML
    downloadFile(html, options.filename?.replace('.pdf', '.html') || 'path-report.html', 'text/html');
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for content to load then trigger print
  printWindow.onload = () => {
    printWindow.print();
  };
}

/**
 * Generate HTML content for PDF report
 */
function generatePDFHTML(
  paths: PathInfo[],
  ecmpAnalysis: ECMPGroup | null,
  options: ExportOptions
): string {
  const timestamp = new Date().toLocaleString();

  let html = `
<!DOCTYPE html>
<html>
<head>
  <title>Path Comparison Report</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 40px;
      color: #333;
    }
    h1 {
      color: #1a365d;
      border-bottom: 2px solid #3182ce;
      padding-bottom: 10px;
    }
    h2 {
      color: #2c5282;
      margin-top: 30px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .timestamp {
      color: #718096;
      font-size: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th, td {
      border: 1px solid #e2e8f0;
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background-color: #3182ce;
      color: white;
    }
    tr:nth-child(even) {
      background-color: #f7fafc;
    }
    .metric-card {
      display: inline-block;
      background: #ebf8ff;
      padding: 15px;
      margin: 5px;
      border-radius: 8px;
      min-width: 120px;
    }
    .metric-value {
      font-size: 24px;
      font-weight: bold;
      color: #2b6cb0;
    }
    .metric-label {
      font-size: 12px;
      color: #4a5568;
    }
    .ecmp-badge {
      display: inline-block;
      background: #48bb78;
      color: white;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
    }
    .path-sequence {
      font-family: monospace;
      background: #edf2f7;
      padding: 8px;
      border-radius: 4px;
      font-size: 12px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #718096;
    }
    @media print {
      body { margin: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Path Comparison Report</h1>
    <span class="timestamp">Generated: ${timestamp}</span>
  </div>
`;

  // Summary metrics
  if (paths.length > 0) {
    const avgCost = paths.reduce((sum, p) => sum + p.metrics.totalCost, 0) / paths.length;
    const avgHops = paths.reduce((sum, p) => sum + p.metrics.hopCount, 0) / paths.length;
    const avgLatency = paths.reduce((sum, p) => sum + p.metrics.estimatedLatency, 0) / paths.length;

    html += `
  <h2>Summary</h2>
  <div>
    <div class="metric-card">
      <div class="metric-value">${paths.length}</div>
      <div class="metric-label">Total Paths</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${avgCost.toFixed(0)}</div>
      <div class="metric-label">Avg Cost</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${avgHops.toFixed(1)}</div>
      <div class="metric-label">Avg Hops</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${avgLatency.toFixed(0)}ms</div>
      <div class="metric-label">Avg Latency</div>
    </div>
  </div>
`;
  }

  // Paths table
  if (options.includeMetricsTable && paths.length > 0) {
    html += `
  <h2>Path Metrics</h2>
  <table>
    <thead>
      <tr>
        <th>Path</th>
        <th>Source</th>
        <th>Destination</th>
        <th>Hops</th>
        <th>Cost</th>
        <th>Latency</th>
        <th>Min BW</th>
        <th>Countries</th>
      </tr>
    </thead>
    <tbody>
`;

    paths.forEach((p, i) => {
      html += `
      <tr>
        <td>${p.id} ${p.isECMP ? '<span class="ecmp-badge">ECMP</span>' : ''}</td>
        <td>${p.source}</td>
        <td>${p.destination}</td>
        <td>${p.metrics.hopCount}</td>
        <td>${p.metrics.totalCost}</td>
        <td>${p.metrics.estimatedLatency}ms</td>
        <td>${(p.metrics.minBandwidth / 1000).toFixed(1)}Gbps</td>
        <td>${p.metrics.countriesTraversed.join(' → ')}</td>
      </tr>
`;
    });

    html += `
    </tbody>
  </table>
`;
  }

  // ECMP Analysis
  if (options.includeECMPAnalysis && ecmpAnalysis) {
    html += `
  <h2>ECMP Analysis</h2>
  <p><strong>Group ID:</strong> ${ecmpAnalysis.groupId}</p>
  <p><strong>Source:</strong> ${ecmpAnalysis.source} → <strong>Destination:</strong> ${ecmpAnalysis.destination}</p>
  <p><strong>Total Cost:</strong> ${ecmpAnalysis.cost}</p>
  <p><strong>Path Count:</strong> ${ecmpAnalysis.paths.length}</p>
  <p><strong>Divergence Points:</strong> ${ecmpAnalysis.divergencePoints.map(d => d.nodeId).join(', ') || 'None'}</p>
  <p><strong>Convergence Points:</strong> ${ecmpAnalysis.convergencePoints.map(c => c.nodeId).join(', ') || 'None'}</p>

  <h3>Load Balancing</h3>
  <p><strong>Total Capacity:</strong> ${(ecmpAnalysis.loadBalancing.totalCapacity / 1000).toFixed(1)} Gbps</p>
  <p><strong>Balanced:</strong> ${ecmpAnalysis.loadBalancing.isBalanced ? 'Yes' : 'No'}</p>
`;

    if (ecmpAnalysis.loadBalancing.warnings.length > 0) {
      html += `
  <p><strong>Warnings:</strong></p>
  <ul>
    ${ecmpAnalysis.loadBalancing.warnings.map(w => `<li>${w}</li>`).join('')}
  </ul>
`;
    }
  }

  // Path sequences
  html += `
  <h2>Path Details</h2>
`;

  paths.forEach(p => {
    html += `
  <h3>${p.id}</h3>
  <p class="path-sequence">${p.nodeSequence.join(' → ')}</p>
`;
  });

  // Footer
  html += `
  <div class="footer">
    <p>OSPF Network Visualizer Pro - Path Comparison Report</p>
    <p>This report was automatically generated. For questions, contact your network operations team.</p>
  </div>
</body>
</html>
`;

  return html;
}

/**
 * Export JSON data
 */
export function exportJSON(
  data: object,
  filename?: string
): void {
  const json = JSON.stringify(data, null, 2);
  downloadFile(json, filename || `export-${Date.now()}.json`, 'application/json');
}

/**
 * Helper: Download file
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
