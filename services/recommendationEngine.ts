import { BlastRadiusScore } from './riskScoring';
import { ImpactResult } from '../App';

export interface Recommendation {
  type: 'PROCEED' | 'CAUTION' | 'ABORT';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'error';
  actionable: boolean;
  suggestedAction?: string;
  icon?: string;
}

export function generateRecommendations(
  riskScore: BlastRadiusScore,
  impactResults: ImpactResult[]
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Main Recommendation
  if (riskScore.risk === 'CRITICAL') {
    recommendations.push({
      type: 'ABORT',
      title: 'ABORT CHANGE',
      description: 'Risk level is CRITICAL. Change affects >70% of flows or causes major routing shifts.',
      severity: 'error',
      actionable: true,
      suggestedAction: 'Do not proceed. Review change in lab environment.'
    });
  } else if (riskScore.risk === 'HIGH') {
    recommendations.push({
      type: 'CAUTION',
      title: 'PROCEED WITH CAUTION',
      description: 'Risk level is HIGH. Significant routing changes detected.',
      severity: 'warning',
      actionable: true,
      suggestedAction: 'Apply during maintenance window only. Ensure rollback plan is ready.'
    });
  } else if (riskScore.risk === 'MEDIUM') {
    recommendations.push({
      type: 'PROCEED',
      title: 'PROCEED WITH MONITORING',
      description: 'Risk level is MEDIUM. Some routing changes expected.',
      severity: 'info',
      actionable: true,
      suggestedAction: 'Monitor key links after application.'
    });
  } else {
    recommendations.push({
      type: 'PROCEED',
      title: 'SAFE TO PROCEED',
      description: 'Risk level is LOW. Minimal impact detected.',
      severity: 'info',
      actionable: true,
      suggestedAction: 'Standard change procedure.'
    });
  }

  // Specific Concerns
  if (riskScore.details.criticalPathCount > 0) {
    recommendations.push({
      type: 'CAUTION',
      title: 'Critical Paths Affected',
      description: `${riskScore.details.criticalPathCount} inter-country paths are changing routing.`,
      severity: 'warning',
      actionable: true,
      suggestedAction: 'Verify latency impact on these paths.'
    });
  }

  if (riskScore.details.countriesAffected > 3) {
    recommendations.push({
      type: 'CAUTION',
      title: 'Wide Geographic Impact',
      description: `Change affects routing in ${riskScore.details.countriesAffected} countries.`,
      severity: 'info',
      actionable: false
    });
  }

  return recommendations;
}
