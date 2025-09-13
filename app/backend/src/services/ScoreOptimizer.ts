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
  cargoWeightKg?: number;
  routeComplexity?: 'simple' | 'moderate' | 'complex';
  performanceMetrics?: {
    co2ReductionPercent?: number;
    timeDifferencePercent?: number;
    costDifferencePercent?: number;
    recommendationConfidence?: number;
  };
}

interface SensitivityAnalysis {
  timeThreshold: number | null;
  costThreshold: number | null;
  co2Threshold: number | null;
}

interface DominantFactors {
  [planType: string]: string[];
}

interface BatchComparisonResult {
  recommendation: PlanType;
  scores: Record<string, number>;
}

export class ScoreOptimizer {
  private normalizationMethod: 'min-max' | 'z-score';
  private epsilon: number;

  constructor(config: OptimizerConfig) {
    this.normalizationMethod = config.normalizationMethod;
    this.epsilon = config.epsilon || 0.001;
  }

  /**
   * Calculate weighted score for a single plan with weight scaling
   */
  calculateScore(plan: TransportPlan, weights: WeightFactors, cargoWeightKg?: number): number {
    // Validate negative values
    if (plan.timeH < 0 || plan.costJpy < 0 || plan.co2Kg < 0) {
      throw new Error('Invalid metric values');
    }
    
    // Normalize weights if they don't sum to 1
    const normalizedWeights = this.normalizeWeights(weights);
    
    // Apply weight scaling for CO2 if cargo weight is provided
    let adjustedCo2 = plan.co2Kg;
    if (cargoWeightKg && cargoWeightKg > 0) {
      adjustedCo2 = this.applyWeightScaling(plan.co2Kg, cargoWeightKg, plan.plan);
    }
    
    // Improved weighted sum with better scaling
    return (
      normalizedWeights.time * plan.timeH +
      normalizedWeights.cost * this.scaleCost(plan.costJpy) +
      normalizedWeights.co2 * adjustedCo2
    );
  }

  /**
   * Apply weight scaling to CO2 emissions
   */
  private applyWeightScaling(baseCo2: number, cargoWeightKg: number, planType: PlanType): number {
    // Weight scaling factors based on transport mode
    const scalingFactors = {
      truck: {
        baseFactor: 1.0,
        weightFactor: 0.8, // Trucks scale more with weight
        maxWeight: 10000   // Typical truck capacity
      },
      'truck+ship': {
        baseFactor: 0.3,
        weightFactor: 0.2, // Ships scale less with weight
        maxWeight: 100000  // Ship capacity
      }
    };

    const factor = scalingFactors[planType] || scalingFactors.truck;
    
    // Linear scaling with diminishing returns
    const weightRatio = Math.min(cargoWeightKg / factor.maxWeight, 1.0);
    const scalingFactor = factor.baseFactor + (factor.weightFactor * weightRatio);
    
    return baseCo2 * scalingFactor;
  }

  /**
   * Scale cost for better comparison
   */
  private scaleCost(costJpy: number): number {
    // Logarithmic scaling for cost to reduce dominance of large values
    return Math.log10(Math.max(costJpy, 1));
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
  comparePlans(plans: TransportPlan[], weights: WeightFactors, cargoWeightKg?: number): ComparisonDetail {
    const normalizedWeights = this.normalizeWeights(weights);
    const normalizedPlans = this.normalizeMetrics(plans);
    
    const scores: Record<string, number> = {};
    let minScore = Infinity;
    let recommendation: PlanType = plans[0].plan;

    // Apply CO2 priority logic for extreme cases
    if (this.shouldForceShipRecommendation(normalizedWeights, plans, cargoWeightKg)) {
      const shipPlan = plans.find(p => p.plan === PlanType.TRUCK_SHIP);
      if (shipPlan) {
        return {
          recommendation: PlanType.TRUCK_SHIP,
          scores: this.calculateAllScores(plans, normalizedWeights, normalizedPlans, cargoWeightKg),
        };
      }
    }

    // Apply time priority logic for extreme cases
    if (this.shouldForceTruckRecommendation(normalizedWeights, plans)) {
      const truckPlan = plans.find(p => p.plan === PlanType.TRUCK);
      if (truckPlan) {
        return {
          recommendation: PlanType.TRUCK,
          scores: this.calculateAllScores(plans, normalizedWeights, normalizedPlans, cargoWeightKg),
        };
      }
    }

    // Standard comparison with improved scoring
    for (let i = 0; i < plans.length; i++) {
      const plan = plans[i];
      const normalized = normalizedPlans[i];
      
      // Calculate score using improved method
      const score = this.calculateImprovedScore(plan, normalized, normalizedWeights, cargoWeightKg);
      
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
   * Determine if ship should be forced based on CO2 priority and cargo weight
   */
  private shouldForceShipRecommendation(weights: WeightFactors, plans: TransportPlan[], cargoWeightKg?: number): boolean {
    // Force ship if CO2 weight is very high (>70%) and cargo is heavy (>5000kg)
    const isCo2Priority = weights.co2 > 0.7;
    const isHeavyCargo = cargoWeightKg && cargoWeightKg > 5000;
    
    if (isCo2Priority && isHeavyCargo) {
      const truckPlan = plans.find(p => p.plan === PlanType.TRUCK);
      const shipPlan = plans.find(p => p.plan === PlanType.TRUCK_SHIP);
      
      if (truckPlan && shipPlan) {
        // Force ship if CO2 difference is significant (>30% reduction)
        const co2Reduction = (truckPlan.co2Kg - shipPlan.co2Kg) / truckPlan.co2Kg;
        return co2Reduction > 0.3;
      }
    }
    
    return false;
  }

  /**
   * Determine if truck should be forced based on time priority
   */
  private shouldForceTruckRecommendation(weights: WeightFactors, plans: TransportPlan[]): boolean {
    // Force truck if time weight is very high (>80%) and distance is reasonable
    const isTimePriority = weights.time > 0.8;
    
    if (isTimePriority) {
      const truckPlan = plans.find(p => p.plan === PlanType.TRUCK);
      const shipPlan = plans.find(p => p.plan === PlanType.TRUCK_SHIP);
      
      if (truckPlan && shipPlan) {
        // Force truck if time difference is significant (>50% faster)
        const timeReduction = (shipPlan.timeH - truckPlan.timeH) / shipPlan.timeH;
        return timeReduction > 0.5;
      }
    }
    
    return false;
  }

  /**
   * Calculate improved score with better normalization
   */
  private calculateImprovedScore(
    plan: TransportPlan,
    normalized: NormalizedPlan,
    weights: WeightFactors,
    cargoWeightKg?: number
  ): number {
    // Apply weight scaling for CO2
    let adjustedCo2 = normalized.normalizedCo2;
    if (cargoWeightKg && cargoWeightKg > 0) {
      const baseCo2 = plan.co2Kg;
      const scaledCo2 = this.applyWeightScaling(baseCo2, cargoWeightKg, plan.plan);
      // Re-normalize the scaled CO2 value
      adjustedCo2 = Math.min(scaledCo2 / baseCo2, 1.0);
    }

    // Use inverted scoring (lower is better) with improved scaling
    return (
      weights.time * normalized.normalizedTime +
      weights.cost * normalized.normalizedCost +
      weights.co2 * adjustedCo2
    );
  }

  /**
   * Calculate scores for all plans
   */
  private calculateAllScores(
    plans: TransportPlan[],
    weights: WeightFactors,
    normalizedPlans: NormalizedPlan[],
    cargoWeightKg?: number
  ): Record<string, number> {
    const scores: Record<string, number> = {};
    
    for (let i = 0; i < plans.length; i++) {
      const plan = plans[i];
      const normalized = normalizedPlans[i];
      const score = this.calculateImprovedScore(plan, normalized, weights, cargoWeightKg);
      const planKey = plan.plan === PlanType.TRUCK ? 'truck' : 'truck+ship';
      scores[planKey] = score;
    }
    
    return scores;
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
    const comparison = this.comparePlans(plans, weights, metadata.cargoWeightKg);
    
    // Build enhanced rationale with performance metrics
    const rationale: RouteRationale = {};
    
    const truckPlan = plans.find(p => p.plan === PlanType.TRUCK);
    if (truckPlan && metadata.truckDistance) {
      rationale.truck = {
        distanceKm: metadata.truckDistance,
        co2Efficiency: this.calculateCo2Efficiency(truckPlan),
        timeEfficiency: this.calculateTimeEfficiency(truckPlan)
      };
    }
    
    const shipPlan = plans.find(p => p.plan === PlanType.TRUCK_SHIP);
    if (shipPlan && shipPlan.legs) {
      rationale['truck+ship'] = {
        legs: shipPlan.legs,
        co2Efficiency: this.calculateCo2Efficiency(shipPlan),
        timeEfficiency: this.calculateTimeEfficiency(shipPlan),
        multiModalAdvantage: this.calculateMultiModalAdvantage(shipPlan, truckPlan)
      };
    }
    
    // Calculate performance metrics
    const performanceMetrics = this.calculatePerformanceMetrics(plans, comparison.recommendation);
    
    return {
      candidates: plans,
      recommendation: comparison.recommendation,
      rationale,
      metadata: {
        calculationTimeMs: metadata.calculationTimeMs || 0,
        dataVersion: '2.0.0',
        cargoWeightKg: metadata.cargoWeightKg,
        performanceMetrics: {
          ...performanceMetrics,
          recommendationConfidence: this.calculateRecommendationConfidence(comparison.scores)
        }
      }
    };
  }

  /**
   * Calculate performance metrics for comparison
   */
  private calculatePerformanceMetrics(plans: TransportPlan[], recommendation: PlanType): any {
    const truckPlan = plans.find(p => p.plan === PlanType.TRUCK);
    const shipPlan = plans.find(p => p.plan === PlanType.TRUCK_SHIP);
    
    if (!truckPlan || !shipPlan) {
      return {};
    }

    const recommendedPlan = plans.find(p => p.plan === recommendation);
    const alternativePlan = plans.find(p => p.plan !== recommendation);
    
    if (!recommendedPlan || !alternativePlan) {
      return {};
    }

    return {
      co2ReductionPercent: this.calculatePercentageDifference(recommendedPlan.co2Kg, alternativePlan.co2Kg),
      timeDifferencePercent: this.calculatePercentageDifference(recommendedPlan.timeH, alternativePlan.timeH),
      costDifferencePercent: this.calculatePercentageDifference(recommendedPlan.costJpy, alternativePlan.costJpy)
    };
  }

  /**
   * Calculate percentage difference between two values
   */
  private calculatePercentageDifference(value1: number, value2: number): number {
    if (value2 === 0) return 0;
    return Math.round(((value1 - value2) / value2) * 100);
  }

  /**
   * Calculate CO2 efficiency score
   */
  private calculateCo2Efficiency(plan: TransportPlan): number {
    const totalDistance = plan.legs?.reduce((sum, leg) => sum + leg.distanceKm, 0) || 1;
    const totalWeight = 1000; // Assume 1 ton for efficiency calculation
    return Math.round((1 / (plan.co2Kg / (totalDistance * totalWeight))) * 100);
  }

  /**
   * Calculate time efficiency score
   */
  private calculateTimeEfficiency(plan: TransportPlan): number {
    const totalDistance = plan.legs?.reduce((sum, leg) => sum + leg.distanceKm, 0) || 1;
    return Math.round(totalDistance / Math.max(plan.timeH, 0.1));
  }

  /**
   * Calculate multimodal advantage score
   */
  private calculateMultiModalAdvantage(shipPlan: TransportPlan, truckPlan?: TransportPlan): number {
    if (!truckPlan) return 0;
    
    const co2Advantage = truckPlan.co2Kg > shipPlan.co2Kg ? 
      Math.round(((truckPlan.co2Kg - shipPlan.co2Kg) / truckPlan.co2Kg) * 100) : 0;
    
    const costAdvantage = truckPlan.costJpy > shipPlan.costJpy ? 
      Math.round(((truckPlan.costJpy - shipPlan.costJpy) / truckPlan.costJpy) * 100) : 0;
    
    return Math.round((co2Advantage + costAdvantage) / 2);
  }

  /**
   * Calculate recommendation confidence based on score differences
   */
  private calculateRecommendationConfidence(scores: Record<string, number>): number {
    const scoreValues = Object.values(scores);
    if (scoreValues.length < 2) return 50;
    
    const minScore = Math.min(...scoreValues);
    const maxScore = Math.max(...scoreValues);
    const difference = maxScore - minScore;
    
    return Math.min(Math.round((difference / maxScore) * 100), 95);
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
   * Analyze sensitivity of recommendations to weight changes
   * Returns weight thresholds where recommendation changes
   */
  analyzeSensitivity(plans: TransportPlan[]): SensitivityAnalysis {
    if (plans.length < 2) {
      return {
        timeThreshold: null,
        costThreshold: null,
        co2Threshold: null
      };
    }

    const thresholds: SensitivityAnalysis = {
      timeThreshold: null,
      costThreshold: null,
      co2Threshold: null
    };

    // Binary search for time threshold
    thresholds.timeThreshold = this.findWeightThreshold(
      plans,
      (weights, newTimeWeight) => ({ ...weights, time: newTimeWeight }),
      'time'
    );

    // Binary search for cost threshold
    thresholds.costThreshold = this.findWeightThreshold(
      plans,
      (weights, newCostWeight) => ({ ...weights, cost: newCostWeight }),
      'cost'
    );

    // Binary search for CO2 threshold
    thresholds.co2Threshold = this.findWeightThreshold(
      plans,
      (weights, newCo2Weight) => ({ ...weights, co2: newCo2Weight }),
      'co2'
    );

    return thresholds;
  }

  /**
   * Find weight threshold where recommendation changes using binary search
   */
  private findWeightThreshold(
    plans: TransportPlan[],
    weightUpdater: (weights: WeightFactors, newWeight: number) => WeightFactors,
    factor: 'time' | 'cost' | 'co2'
  ): number | null {
    const baseWeights: WeightFactors = { time: 0.33, cost: 0.33, co2: 0.34 };
    const baseResult = this.comparePlans(plans, baseWeights);
    
    let low = 0;
    let high = 1;
    let threshold: number | null = null;
    
    // Binary search with precision
    for (let i = 0; i < 20; i++) {
      const mid = (low + high) / 2;
      
      // Create weights with the factor set to mid, others balanced
      const testWeights = weightUpdater(baseWeights, mid);
      const normalizedWeights = this.normalizeWeights(testWeights);
      
      const testResult = this.comparePlans(plans, normalizedWeights);
      
      if (testResult.recommendation === baseResult.recommendation) {
        low = mid;
      } else {
        high = mid;
        threshold = mid;
      }
      
      if (high - low < 0.001) break;
    }
    
    return threshold;
  }

  /**
   * Identify dominant factors for each plan
   * Fixed version that properly handles weights parameter
   */
  identifyDominantFactors(plans: TransportPlan[], weights?: WeightFactors): DominantFactors {
    // Use default weights if not provided
    const defaultWeights: WeightFactors = { time: 0.33, cost: 0.33, co2: 0.34 };
    const analysisWeights = weights || defaultWeights;
    
    const factors: DominantFactors = {};
    const breakdown = this.getScoreBreakdown(plans, analysisWeights);
    
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
   * Batch compare with simplified interface for test compatibility
   */
  async batchCompare(plans: TransportPlan[], weightSets: WeightFactors[]): Promise<BatchComparisonResult[]> {
    const results: BatchComparisonResult[] = [];
    
    for (const weights of weightSets) {
      const comparison = this.comparePlans(plans, weights);
      results.push({
        recommendation: comparison.recommendation,
        scores: comparison.scores
      });
    }
    
    return results;
  }
}