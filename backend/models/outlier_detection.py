"""
Module A: Dynamic Outlier Detection System
ISRO Burn-In Anomaly Detection

Uses multiple statistical methods:
1. Z-Score based detection
2. IQR (Interquartile Range) based detection
3. Isolation Forest for multivariate anomaly detection
4. Dynamic lot-relative thresholding
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from typing import Dict, List, Tuple, Optional
import json


class DynamicOutlierDetector:
    """
    Detects anomalous components using lot-relative statistical analysis.
    
    Instead of relying solely on absolute datasheet limits, this system
    compares each component against its lot's statistical distribution
    to find subtle anomalies.
    """

    def __init__(self, z_threshold: float = 1.5, iqr_multiplier: float = 1.5,
                 contamination: float = 0.05):
        self.z_threshold = z_threshold
        self.iqr_multiplier = iqr_multiplier
        self.contamination = contamination
        self.scaler = StandardScaler()
        self.isolation_forest = None
        self.lot_statistics = {}
        self.absolute_limits = {}

    def fit_lot_statistics(self, data: pd.DataFrame, parametric_columns: List[str],
                           lot_column: str = 'lot_id') -> Dict:
        """
        Compute lot-level statistics for dynamic thresholding.
        
        For each lot, calculates mean and std for each parameter.
        A component is flagged if it deviates significantly from its lot mean.
        """
        lot_stats = {}

        for lot_id in data[lot_column].unique():
            lot_data = data[data[lot_column] == lot_id]
            stats = {}
            for col in parametric_columns:
                if col in lot_data.columns:
                    values = lot_data[col].dropna()
                    stats[col] = {
                        'mean': float(values.mean()),
                        'std': float(values.std()) if len(values) > 1 else 0,
                        'median': float(values.median()),
                        'q25': float(values.quantile(0.25)),
                        'q75': float(values.quantile(0.75)),
                        'min': float(values.min()),
                        'max': float(values.max()),
                        'count': len(values)
                    }
            lot_stats[lot_id] = stats

        self.lot_statistics = lot_stats
        return lot_stats

    def set_absolute_limits(self, limits: Dict[str, float]):
        """Set datasheet absolute limits for each parameter."""
        self.absolute_limits = limits

    def _z_score_detection(self, value: float, lot_mean: float, lot_std: float) -> Dict:
        """Calculate z-score and flag if exceeds threshold."""
        if lot_std == 0:
            z_score = 0
        else:
            z_score = (value - lot_mean) / lot_std

        is_anomaly = abs(z_score) > self.z_threshold
        confidence = min(abs(z_score) / self.z_threshold, 1.0) if is_anomaly else 0

        return {
            'method': 'z_score',
            'z_score': round(z_score, 4),
            'threshold': self.z_threshold,
            'is_anomaly': is_anomaly,
            'confidence': round(confidence, 4),
            'detail': f"Value deviates {abs(z_score):.2f} std from lot mean"
        }

    def _iqr_detection(self, value: float, q25: float, q75: float) -> Dict:
        """Detect outliers using Interquartile Range method."""
        iqr = q75 - q25
        lower_bound = q25 - self.iqr_multiplier * iqr
        upper_bound = q75 + self.iqr_multiplier * iqr

        is_anomaly = value < lower_bound or value > upper_bound
        if iqr > 0:
            distance_from_bounds = min(
                abs(value - lower_bound), abs(value - upper_bound)
            ) / iqr
        else:
            distance_from_bounds = 0

        confidence = min(distance_from_bounds, 1.0) if is_anomaly else 0

        return {
            'method': 'iqr',
            'lower_bound': round(lower_bound, 4),
            'upper_bound': round(upper_bound, 4),
            'iqr': round(iqr, 4),
            'is_anomaly': is_anomaly,
            'confidence': round(confidence, 4),
            'detail': f"Bounds: [{lower_bound:.2f}, {upper_bound:.2f}]"
        }

    def _absolute_limit_check(self, value: float, param: str) -> Dict:
        """Check against absolute datasheet limits."""
        if param not in self.absolute_limits:
            return {
                'method': 'absolute_limit',
                'is_anomaly': False,
                'confidence': 0,
                'detail': 'No absolute limit defined'
            }

        limit = self.absolute_limits[param]
        is_anomaly = value > limit
        utilization = (value / limit * 100) if limit > 0 else 0
        confidence = min(utilization / 100, 1.0) if is_anomaly else 0

        return {
            'method': 'absolute_limit',
            'limit': limit,
            'utilization_pct': round(utilization, 2),
            'is_anomaly': is_anomaly,
            'confidence': round(confidence, 4),
            'detail': f"At {utilization:.1f}% of absolute limit ({limit})"
        }

    def _isolation_forest_detection(self, data: np.ndarray) -> np.ndarray:
        """Use Isolation Forest for multivariate anomaly detection."""
        if len(data) < 10:
            return np.zeros(len(data), dtype=int)

        self.isolation_forest = IsolationForest(
            contamination=self.contamination,
            random_state=42,
            n_estimators=100
        )
        predictions = self.isolation_forest.fit_predict(data)
        return predictions

    def analyze_component(self, component_data: Dict, lot_id: str,
                          parametric_columns: List[str]) -> Dict:
        """
        Analyze a single component against its lot distribution.
        
        Returns detailed analysis with per-parameter anomaly scores
        and an overall risk score.
        """
        if lot_id not in self.lot_statistics:
            return {
                'status': 'error',
                'message': f'Lot {lot_id} statistics not computed. Call fit_lot_statistics first.'
            }

        lot_stats = self.lot_statistics[lot_id]
        parameter_results = []
        overall_risk = 0
        anomaly_count = 0

        for param in parametric_columns:
            if param not in component_data or param not in lot_stats:
                continue

            value = component_data[param]
            stats = lot_stats[param]

            # Run all detection methods
            z_result = self._z_score_detection(
                value, stats['mean'], stats['std']
            )
            iqr_result = self._iqr_detection(
                value, stats['q25'], stats['q75']
            )
            abs_result = self._absolute_limit_check(value, param)

            # Consensus scoring: weight each method
            methods = [z_result, iqr_result, abs_result]
            votes = sum(1 for m in methods if m.get('is_anomaly', False))
            avg_confidence = np.mean([m.get('confidence', 0) for m in methods])

            # Composite risk score for this parameter
            param_risk = avg_confidence * (1 + 0.2 * votes)
            param_risk = min(param_risk, 1.0)

            is_anomaly = votes >= 2  # Majority vote
            if is_anomaly:
                anomaly_count += 1

            parameter_results.append({
                'parameter': param,
                'value': value,
                'lot_mean': round(stats['mean'], 4),
                'lot_std': round(stats['std'], 4),
                'methods': {
                    'z_score': z_result,
                    'iqr': iqr_result,
                    'absolute_limit': abs_result
                },
                'consensus_votes': votes,
                'is_anomaly': is_anomaly,
                'risk_score': round(param_risk, 4)
            })

            overall_risk += param_risk

        # Normalize overall risk
        if parameter_results:
            overall_risk /= len(parameter_results)

        # Determine overall classification
        if overall_risk > 0.7 or anomaly_count > len(parameter_results) * 0.5:
            classification = 'REJECT'
            risk_level = 'HIGH'
        elif overall_risk > 0.4 or anomaly_count > 0:
            classification = 'REVIEW'
            risk_level = 'MEDIUM'
        else:
            classification = 'PASS'
            risk_level = 'LOW'

        return {
            'status': 'success',
            'classification': classification,
            'risk_level': risk_level,
            'overall_risk_score': round(overall_risk, 4),
            'anomaly_parameters': anomaly_count,
            'total_parameters': len(parameter_results),
            'parameters': parameter_results,
            'explainability': self._generate_explanation(
                parameter_results, classification, overall_risk
            )
        }

    def analyze_batch(self, data: pd.DataFrame, parametric_columns: List[str],
                      lot_column: str = 'lot_id',
                      component_column: str = 'component_id') -> List[Dict]:
        """Analyze an entire batch of components."""
        results = []

        for _, row in data.iterrows():
            component_data = {col: row[col] for col in parametric_columns if col in row.index}
            lot_id = row[lot_column] if lot_column in row.index else 'default'
            component_id = row[component_column] if component_column in row.index else 'unknown'

            analysis = self.analyze_component(component_data, lot_id, parametric_columns)
            analysis['component_id'] = component_id
            analysis['lot_id'] = lot_id
            results.append(analysis)

        return results

    def _generate_explanation(self, parameters: List[Dict], classification: str,
                              risk_score: float) -> Dict:
        """
        Generate human-readable explanation for QA inspectors.
        This is the EXPLAINABILITY component of the evaluation metrics.
        """
        reasons = []
        recommendations = []

        for param in parameters:
            if param['is_anomaly']:
                reasons.append(
                    f"Parameter '{param['parameter']}' = {param['value']} "
                    f"(lot mean: {param['lot_mean']}, "
                    f"std: {param['lot_std']}) - "
                    f"flagged by {param['consensus_votes']}/3 detection methods"
                )

                # Specific recommendations per parameter type
                if 'current' in param['parameter'].lower() or 'leakage' in param['parameter'].lower():
                    recommendations.append(
                        f"Investigate oxide integrity for '{param['parameter']}'. "
                        f"Elevated leakage may indicate gate oxide degradation."
                    )
                elif 'delay' in param['parameter'].lower():
                    recommendations.append(
                        f"Check timing margins for '{param['parameter']}'. "
                        f"Drift may indicate metal migration or hot carrier effects."
                    )
                else:
                    recommendations.append(
                        f"Review manufacturing process for '{param['parameter']}' "
                        f"deviation. Consider lot-level investigation."
                    )

        if classification == 'PASS':
            summary = (
                f"Component PASSES screening. Overall risk score: {risk_score:.2f}/1.00. "
                f"No statistically significant anomalies detected relative to lot distribution."
            )
        elif classification == 'REVIEW':
            summary = (
                f"Component flagged for MANUAL REVIEW. Overall risk score: {risk_score:.2f}/1.00. "
                f"{len(reasons)} parameter(s) show moderate deviation from lot norms."
            )
        else:
            summary = (
                f"Component RECOMMENDED FOR REJECTION. Overall risk score: {risk_score:.2f}/1.00. "
                f"Significant anomalies detected that suggest latent defect risk. "
                f"Multiple detection methods confirm the anomaly."
            )

        return {
            'summary': summary,
            'reasons': reasons,
            'recommendations': recommendations,
            'detection_methods_used': ['Z-Score', 'IQR', 'Absolute Limits'],
            'confidence_explanation': (
                'Risk score is computed as a weighted consensus of three detection methods. '
                'A component is flagged only when majority (2/3) methods agree, '
                'reducing false positives while maintaining sensitivity to true anomalies.'
            )
        }


def compute_detection_score(results: List[Dict], data: pd.DataFrame,
                            fn_penalty_weight: float = 10.0,
                            fp_penalty_weight: float = 1.0,
                            component_column: str = 'component_id',
                            label_column: str = 'is_defective') -> Dict:
    """
    Confusion-matrix based Anomaly Detection Score against ground truth.

    Implements the evaluation requirement that a False Negative (a defective
    part that escapes screening) is catastrophic and must be heavily penalized.

    A component is considered 'flagged' when Module A classifies it as
    either REJECT or REVIEW (both remove it from the normal pass stream).

    Score (0..1) = max(0, (TP + TN - w_fn*FN - w_fp*FP) / N)
    """
    if label_column not in data.columns:
        return {
            'available': False,
            'message': 'No ground truth labels (is_defective) available in data'
        }

    component_ids = data[component_column].astype(str).tolist() \
        if component_column in data.columns else []
    label_map = dict(zip(component_ids, data[label_column].astype(bool).tolist())) \
        if component_column in data.columns else {}

    TP = FP = TN = FN = 0
    escaped_components = []

    for r in results:
        cid = r.get(component_column)
        if str(cid) in label_map:
            true_defective = bool(label_map[str(cid)])
        else:
            continue

        flagged = r.get('classification') in ('REJECT', 'REVIEW')

        if true_defective and flagged:
            TP += 1
        elif not true_defective and flagged:
            FP += 1
        elif true_defective and not flagged:
            FN += 1
            escaped_components.append(str(cid))
        else:
            TN += 1

    total = TP + FP + TN + FN

    recall = TP / (TP + FN) if (TP + FN) > 0 else 0.0
    precision = TP / (TP + FP) if (TP + FP) > 0 else 0.0
    specificity = TN / (TN + FP) if (TN + FP) > 0 else 0.0
    accuracy = (TP + TN) / total if total > 0 else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0

    # Catastrophic false-negative penalty dominates the score
    penalized = (TP + TN - fn_penalty_weight * FN - fp_penalty_weight * FP) / total if total > 0 else 0.0
    score = max(0.0, min(1.0, penalized))

    return {
        'available': True,
        'tp': TP,
        'fp': FP,
        'tn': TN,
        'fn': FN,
        'total_evaluated': total,
        'precision': round(precision, 4),
        'recall_aka_sensitivity': round(recall, 4),
        'specificity': round(specificity, 4),
        'accuracy': round(accuracy, 4),
        'f1_score': round(f1, 4),
        'escaped_components': escaped_components,
        'anomaly_detection_score': round(score, 4),
        'anomaly_detection_score_pct': round(score * 100, 2),
        'fn_penalty_weight': fn_penalty_weight,
        'fp_penalty_weight': fp_penalty_weight,
        'scoring_formula': (
            f'Score = max(0, (TP+TN - {fn_penalty_weight}*FN'
            f' - {fp_penalty_weight}*FP) / N)'
        ),
        'interpretation': (
            'Defective parts flagged as REJECT or REVIEW are True Positives. '
            'Defective parts classified PASS are False Negatives and are '
            f'penalized at {fn_penalty_weight}x the weight of false alarms.'
        )
    }
