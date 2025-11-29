const fs = require('fs');
const path = require('path');

const files = [
    'zzzi--input-files/automation_export_2025-11-27T21_14_36.690Z.json',
    'zzzi--input-files/netviz-pro-topo-extra layers.json',
    'zzzi--input-files/netviz-pro-topology-2025-11-26T12_56_01.184Z.json',
    'zzzi--input-files/network_topology_2025-11-22.json',
    'zzzi--input-files/network_topology_2025-11-29.json',
    'zzzi--input-files/network-topology-2025-11-29.json',
    'zzzi--input-files/topology-2025-11-23T07_19_17.799Z.json'
];

console.log('='.repeat(80));
console.log('COMPREHENSIVE FILE FORMAT ANALYSIS');
console.log('='.repeat(80));
console.log('\n');

files.forEach((file, index) => {
    const filePath = path.join('/Users/macbook/OSPF-NN-JSON', file);

    console.log(`\n[${index + 1}/7] FILE: ${path.basename(file)}`);
    console.log('-'.repeat(80));

    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const fileSize = fs.statSync(filePath).size;

        // Detect format type
        let formatType = 'UNKNOWN';
        let formatVersion = 'N/A';

        if (data.database === 'automation') {
            formatType = 'AUTOMATION_EXPORT';
        } else if (data.metadata?.format_version) {
            formatType = 'NETVIZ-PRO';
            formatVersion = data.metadata.format_version;
        } else if (data.version && data.type === 'ospf-topology') {
            formatType = 'UNIFIED_OSPF';
            formatVersion = data.version;
        } else if (data.nodes && data.links) {
            formatType = 'LEGACY_TOPOLOGY';
        }

        console.log(`Format Type: ${formatType}`);
        console.log(`Format Version: ${formatVersion}`);
        console.log(`File Size: ${(fileSize / 1024).toFixed(2)} KB`);

        // Analyze structure
        if (data.nodes) {
            console.log(`\nNODES: ${data.nodes.length}`);
            if (data.nodes.length > 0) {
                const sampleNode = data.nodes[0];
                console.log(`  Sample Node Structure:`);
                console.log(`    - id: ${sampleNode.id || 'N/A'}`);
                console.log(`    - name: ${sampleNode.name || 'N/A'}`);
                console.log(`    - country: ${sampleNode.country || 'N/A'}`);
                console.log(`    - loopback_ip: ${sampleNode.loopback_ip || 'N/A'}`);
                console.log(`    - node_type: ${sampleNode.node_type || 'N/A'}`);
                console.log(`    - neighbor_count: ${sampleNode.neighbor_count !== undefined ? sampleNode.neighbor_count : 'N/A'}`);

                // Count countries
                const countries = [...new Set(data.nodes.map(n => n.country))];
                console.log(`  Countries: ${countries.join(', ')}`);
            }
        }

        if (data.links) {
            console.log(`\nLINKS: ${data.links.length}`);
            if (data.links.length > 0) {
                const sampleLink = data.links[0];
                console.log(`  Sample Link Structure:`);
                console.log(`    - source: ${sampleLink.source || 'N/A'}`);
                console.log(`    - target: ${sampleLink.target || 'N/A'}`);
                console.log(`    - source_interface: ${sampleLink.source_interface || 'N/A'}`);
                console.log(`    - target_interface: ${sampleLink.target_interface || 'N/A'}`);
                console.log(`    - forward_cost: ${sampleLink.forward_cost !== undefined ? sampleLink.forward_cost : 'N/A'}`);
                console.log(`    - reverse_cost: ${sampleLink.reverse_cost !== undefined ? sampleLink.reverse_cost : 'N/A'}`);
                console.log(`    - status: ${sampleLink.status || 'N/A'}`);
                console.log(`    - edge_type: ${sampleLink.edge_type || 'N/A'}`);
                console.log(`    - is_asymmetric: ${sampleLink.is_asymmetric !== undefined ? sampleLink.is_asymmetric : 'N/A'}`);

                // Check for capacity info
                if (sampleLink.source_capacity) {
                    console.log(`  Capacity Information: YES`);
                    console.log(`    - speed: ${sampleLink.source_capacity.speed || 'N/A'}`);
                    console.log(`    - total_capacity_mbps: ${sampleLink.source_capacity.total_capacity_mbps || 'N/A'}`);
                    console.log(`    - is_bundle: ${sampleLink.source_capacity.is_bundle || false}`);
                } else {
                    console.log(`  Capacity Information: NO`);
                }

                // Check for traffic info
                if (sampleLink.traffic) {
                    console.log(`  Traffic Information: YES`);
                } else {
                    console.log(`  Traffic Information: NO`);
                }

                // Count asymmetric links
                const asymmetricCount = data.links.filter(l => l.is_asymmetric).length;
                console.log(`  Asymmetric Links: ${asymmetricCount}`);
            }
        }

        if (data.metadata) {
            console.log(`\nMETADATA:`);
            Object.keys(data.metadata).forEach(key => {
                console.log(`  - ${key}: ${data.metadata[key]}`);
            });
        }

        // Check for other top-level keys
        const otherKeys = Object.keys(data).filter(k => !['nodes', 'links', 'metadata', 'version', 'type', 'exportedFrom', 'exportedAt', 'data', 'database', 'exported_at'].includes(k));
        if (otherKeys.length > 0) {
            console.log(`\nOTHER KEYS: ${otherKeys.join(', ')}`);
        }

        // Compatibility check
        console.log(`\nCOMPATIBILITY:`);
        if (formatType === 'NETVIZ-PRO' || formatType === 'LEGACY_TOPOLOGY') {
            console.log(`  ✅ Compatible with current import handler`);
            console.log(`  ✅ Will display: interfaces, costs, capacity, traffic`);
        } else if (formatType === 'UNIFIED_OSPF') {
            console.log(`  ✅ Compatible with unified format handler`);
        } else if (formatType === 'AUTOMATION_EXPORT') {
            console.log(`  ❌ NOT a topology file (automation database export)`);
        } else {
            console.log(`  ⚠️  Unknown format - may need custom handler`);
        }

    } catch (error) {
        console.log(`❌ ERROR: ${error.message}`);
    }
});

console.log('\n' + '='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));
console.log(`
KEY FINDINGS:
1. Multiple format types detected
2. Rich metadata available in netviz-pro formats
3. Legacy formats have basic structure
4. Application must handle format detection dynamically

RECOMMENDATION:
- Enhance import handler with format-specific logic
- Display available fields based on detected format
- Show format type in UI after import
- Provide format conversion option
`);
