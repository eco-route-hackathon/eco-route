/**
 * ScoreOptimizer Service
 * Calculates weighted scores and recommendations for transport plans
 */

import { 
  TransportPlan, 
  PlanType, 
  WeightFactors,
  ComparisonResult,
  RouteRationale
} from '../lib/shared-types';

interface OptimizerConfig {
  normalizationMethod: 'min-max' | 'z-score';
  epsilon?: number;
}

interface NormalizedPlan extends TransportPlan {
  normalizedTime: number;
  normalizedCost: number;
  normalizedCo2: number;
}

interface ComparisonDetail {
  recommendation: PlanType;
  scores: Record<string, number>;
}

interface ComparisonMetadata {
  truckDistance?: number;
  calculationTimeMs?: number;
}

export class ScoreOptimizer {
  private normalizationMethod: 'min-max' | 'z-score';
  private epsilon: number;

  constructor(config: OptimizerConfig) {
    this.normalizationMethod = config.normalizationMethod;
    this.epsilon = config.epsilon || 0.001;
  }

  /**
   * Calculate weighted score for a single plan
   */
  calculateScore(plan: TransportPlan, weights: WeightFactors): number {
    // Validate negative values
    if (plan.timeH < 0 || plan.costJpy < 0 || plan.co2Kg < 0) {
      throw new Error('Invalid metric values');
    }
    
    // Normalize weights if they don't sum to 1
    const normalizedWeights = this.normalizeWeights(weights);
    
    // Simple weighted sum (not normalized between plans)
    return (
      normalizedWeights.time * plan.timeH +
      normalizedWeights.cost * (plan.costJpy / 1000) + // Scale down cost
      normalizedWeights.co2 * plan.co2Kg
    );
  }

  /**
   * Normalize weights to sum to 1
   */
  normalizeWeights(weights: WeightFactors): WeightFactors {
    const sum = weights.time + weights.cost + weights.co2;
    
    if (sum === 0) {
      return { time: 0.33, cost: 0.33, co2: 0.34 };
    }
    
    return {
      time: weights.time / sum,
      cost: weights.cost / sum,
      co2: weights.co2 / sum
    };
  }

  /**
   * Compare multiple plans and recommend the best one
   */
  comparePlans(plans: TransportPlan[], weights: WeightFactors): ComparisonDetail {
    const normalizedWeights = this.normalizeWeights(weights);
    const normalizedPlans = this.normalizeMetrics(plans);
    
    const scores: Record<string, number> = {};
    let minScore = Infinity;
    let recommendation: PlanType = plans[0].plan;
    
    for (let i = 0; i < plans.length; i++) {
      const plan = plans[i];
      const normalized = normalizedPlans[i];
      
      // Calculate score using normalized values
      const score = 
        normalizedWeights.time * normalized.normalizedTime +
        normalizedWeights.cost * normalized.normalizedCost +
        normalizedWeights.co2 * normalized.normalizedCo2;
      
      const planKey = plan.plan === PlanType.TRUCK ? 'truck' : 'truck+ship';
      scores[planKey] = score;
      
      if (score < minScore) {
        minScore = score;
        recommendation = plan.plan;
      }
    }
    
    return {
      recommendation,
      scores
    };
  }

  /**
   * Normalize metrics across plans
   */
  normalizeMetrics(plans: TransportPlan[]): NormalizedPlan[] {
    if (this.normalizationMethod === 'min-max') {
      return this.minMaxNormalize(plans);
    } else {
      return this.zScoreNormalize(plans);
    }
  }

  /**
   * Min-Max normalization (0-1 range)
   */
  private minMaxNormalize(plans: TransportPlan[]): NormalizedPlan[] {
    if (plans.length === 0) return [];
    
    // Find min and max for each metric
    const times = plans.map(p => p.timeH);
    const costs = plans.map(p => p.costJpy);
    const co2s = plans.map(p => p.co2Kg);
    
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const minCost = Math.min(...costs);
    const maxCost = Math.max(...costs);
    const minCo2 = Math.min(...co2s);
    const maxCo2 = Math.max(...co2s);
    
    return plans.map(plan => {
      const rangeTime = maxTime - minTime;
      const rangeCost = maxCost - minCost;
      const rangeCo2 = maxCo2 - minCo2;
      
      return {
        ...plan,
        normalizedTime: rangeTime > this.epsilon ? (plan.timeH - minTime) / rangeTime : 0.5,
        normalizedCost: rangeCost > this.epsilon ? (plan.costJpy - minCost) / rangeCost : 0.5,
        normalizedCo2: rangeCo2 > this.epsilon ? (plan.co2Kg - minCo2) / rangeCo2 : 0.5
      };
    });
  }

  /**
   * Z-Score normalization (standard deviation based)
   */
  private zScoreNormalize(plans: TransportPlan[]): NormalizedPlan[] {
    if (plans.length === 0) return [];
    
    const times = plans.map(p => p.timeH);
    const costs = plans.map(p => p.costJpy);
    const co2s = plans.map(p => p.co2Kg);
    
    const meanTime = this.mean(times);
    const meanCost = this.mean(costs);
    const meanCo2 = this.mean(co2s);
    
    const stdTime = this.standardDeviation(times, meanTime);
    const stdCost = this.standardDeviation(costs, meanCost);
    const stdCo2 = this.standardDeviation(co2s, meanCo2);
    
    return plans.map(plan => {
      return {
        ...plan,
        normalizedTime: stdTime > this.epsilon ? (plan.timeH - meanTime) / stdTime : 0,
        normalizedCost: stdCost > this.epsilon ? (plan.costJpy - meanCost) / stdCost : 0,
        normalizedCo2: stdCo2 > this.epsilon ? (plan.co2Kg - meanCo2) / stdCo2 : 0
      };
    });
  }

  /**
   * Calculate mean of array
   */
  private mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculate standard deviation
   */
  private standardDeviation(values: number[], mean: number): number {
    if (values.length === 0) return 0;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = this.mean(squaredDiffs);
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Generate complete comparison result for API response
   */
  generateComparisonResult(
    plans: TransportPlan[],
    weights: WeightFactors,
    metadata: ComparisonMetadata
  ): ComparisonResult {
    const comparison = this.comparePlans(plans, weights);
    
    // Build rationale
    const rationale: RouteRationale = {};
    
    const truckPlan = plans.find(p => p.plan === PlanType.TRUCK);
    if (truckPlan && metadata.truckDistance) {
      rationale.truck = {
        distanceKm: metadata.truckDistance
      };
    }
    
    const shipPlan = plans.find(p => p.plan === PlanType.TRUCK_SHIP);
    if (shipPlan && shipPlan.legs) {
      rationale['truck+ship'] = {
        legs: shipPlan.legs
      };
    }
    
    return {
      candidates: plans,
      recommendation: comparison.recommendation,
      rationale,
      metadata: {
        calculationTimeMs: metadata.calculationTimeMs || 0,
        dataVersion: '1.0.0'
      }
    };
  }

  /**
   * Get detailed score breakdown for each plan
   */
  getScoreBreakdown(plans: TransportPlan[], weights: WeightFactors): Record<string, any> {
    const normalizedWeights = this.normalizeWeights(weights);
    const normalizedPlans = this.normalizeMetrics(plans);
    const breakdown: Record<string, any> = {};
    
    for (let i = 0; i < plans.length; i++) {
      const plan = plans[i];
      const normalized = normalizedPlans[i];
      const planKey = plan.plan === PlanType.TRUCK ? 'truck' : 'truck+ship';
      
      breakdown[planKey] = {
        timeComponent: normalizedWeights.time * normalized.normalizedTime,
        costComponent: normalizedWeights.cost * normalized.normalizedCost,
        co2Component: normalizedWeights.co2 * normalized.normalizedCo2,
        totalScore: 
          normalizedWeights.time * normalized.normalizedTime +
          normalizedWeights.cost * normalized.normalizedCost +
          normalizedWeights.co2 * normalized.normalizedCo2,
        rawMetrics: {
          time: plan.timeH,
          cost: plan.costJpy,
          co2: plan.co2Kg
        },
        normalizedMetrics: {
          time: normalized.normalizedTime,
          cost: normalized.normalizedCost,
          co2: normalized.normalizedCo2
        }
      };
    }
    
    return breakdown;
  }

  /**
   * Analyze sensitivity to weight changes
   */
  analyzeSensitivity(plans: TransportPlan[], baseWeights: WeightFactors): any {
    const results: any = {
      thresholds: {},
      recommendations: []
    };
    
    // Test different weight configurations
    const weightVariations = [
      { time: 0.8, cost: 0.1, co2: 0.1 },
      { time: 0.6, cost: 0.3, co2: 0.1 },
      { time: 0.4, cost: 0.4, co2: 0.2 },
      { time: 0.2, cost: 0.4, co2: 0.4 },
      { time: 0.1, cost: 0.2, co2: 0.7 }
    ];
    
    for (const weights of weightVariations) {
      const result = this.comparePlans(plans, weights);
      results.recommendations.push({
        weights,
        recommendation: result.recommendation,
        scores: result.scores
      });
    }
    
    // Find threshold where recommendation changes
    let lastRecommendation = results.recommendations[0].recommendation;
    for (let i = 1; i < results.recommendations.length; i++) {
      if (results.recommendations[i].recommendation !== lastRecommendation) {
        results.thresholds[`change_${i}`] = {
          from: lastRecommendation,
          to: results.recommendations[i].recommendation,
          weightsBefore: weightVariations[i - 1],
          weightsAfter: weightVariations[i]
        };
        lastRecommendation = results.recommendations[i].recommendation;
      }
    }
    
    return results;
  }

  /**
   * Identify dominant factors in decision
   */
  identifyDominantFactors(plans: TransportPlan[], weights: WeightFactors): any {
    const factors: any = {};
    const breakdown = this.getScoreBreakdown(plans, weights);
    
    for (const planKey of Object.keys(breakdown)) {
      const components = breakdown[planKey];
      const dominantFactors: string[] = [];
      
      // Find which component contributes most to the score
      const contributions = [
        { factor: 'time', value: components.timeComponent },
        { factor: 'cost', value: components.costComponent },
        { factor: 'co2', value: components.co2Component }
      ];
      
      contributions.sort((a, b) => b.value - a.value);
      
      // Add dominant factors (those contributing more than 30% of score)
      for (const contrib of contributions) {
        if (contrib.value / components.totalScore > 0.3) {
          dominantFactors.push(contrib.factor);
        }
      }
      
      factors[planKey] = dominantFactors.length > 0 ? dominantFactors : ['balanced'];
    }
    
    return factors;
  }

  /**
   * Batch compare multiple plan sets efficiently
   */
  async batchCompare(
    planSets: Array<{ plans: TransportPlan[]; weights: WeightFactors }>
  ): Promise<ComparisonDetail[]> {
    const results: ComparisonDetail[] = [];
    
    // Process in batches for efficiency
    const batchSize = 10;
    for (let i = 0; i < planSets.length; i += batchSize) {
      const batch = planSets.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(set => Promise.resolve(this.comparePlans(set.plans, set.weights)))
      );
      results.push(...batchResults);
    }
    
    return results;
  }
}