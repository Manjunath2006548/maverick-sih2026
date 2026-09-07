"""
Module B: Time-Series Drift Predictor
ISRO Burn-In Anomaly Detection

Predicts future parametric values (Value_168h) from early measurements
(Value_0h, Value_24h) to enable early rejection of degrading components.

Uses:
1. Linear regression for drift rate estimation
2. Random Forest for non-linear drift prediction
3. Safety slope calculation for threshold determination
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import cross_val_score
from typing import Dict, List, Optional, Tuple
import warnings
warnings.filterwarnings('ignore')


class TimeSeriesDriftPredictor:
    """
    Predicts Value_168h from Value_0h and Value_24h measurements.
    
    If the predicted 168h value exceeds a safety slope threshold,
    the component is flagged for early rejection.
    """

    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.safety_slopes = {}
        self.feature_importances = {}
        self.training_metrics = {}

    def compute_drift_features(self, value_0h: float, value_24h: float,
                                value_96h: Optional[float] = None) -> Dict:
        """Extract drift-related features from available measurements."""
        features = {
            'value_0h': value_0h,
            'value_24h': value_24h,
            'drift_0h_24h': value_24h - value_0h,
            'drift_rate_0h_24h': (value_24h - value_0h) / 24.0 if value_0h != 0 else 0,
            'pct_change_0h_24h': ((value_24h - value_0h) / abs(value_0h) * 100) if value_0h != 0 else 0,
        }

        if value_96h is not None:
            features['value_96h'] = value_96h
            features['drift_24h_96h'] = value_96h - value_24h
            features['drift_rate_24h_96h'] = (value_96h - value_24h) / 72.0 if value_24h != 0 else 0
            features['acceleration'] = (
                (features['drift_rate_24h_96h'] - features['drift_rate_0h_24h'])
                if features['drift_rate_0h_24h'] != 0 else 0
            )

        return features

    def compute_safety_slope(self, parametric_data: pd.DataFrame,
                              param: str, confidence_level: float = 0.95) -> float:
        """
        Compute safety slope threshold for a parameter.
        
        The safety slope represents the maximum acceptable drift rate
        derived from the historical distribution of drift rates.
        Components exceeding this slope are flagged.
        """
        if 'drift_rate_0h_24h' not in parametric_data.columns:
            # Calculate drift rates from raw data
            data = parametric_data.copy()
            if f'{param}_0h' in data.columns and f'{param}_24h' in data.columns:
                drift_rates = (data[f'{param}_24h'] - data[f'{param}_0h']) / 24.0
            else:
                return 0.0
        else:
            drift_rates = parametric_data['drift_rate_0h_24h']

        drift_rates = drift_rates.dropna()

        if len(drift_rates) < 5:
            return float(drift_rates.abs().mean() * 2) if len(drift_rates) > 0 else 0

        # Safety slope = mean + z * std of drift rates
        from scipy import stats
        z_score = stats.norm.ppf((1 + confidence_level) / 2)
        safety_slope = abs(drift_rates.mean()) + z_score * drift_rates.std()

        return float(safety_slope)

    def train(self, training_data: pd.DataFrame, parametric_columns: List[str],
              time_columns: Dict[str, str] = None):
        """
        Train drift prediction models for each parameter.
        
        Expected training data format:
        - Columns like '{param}_0h', '{param}_24h', '{param}_96h', '{param}_168h'
        """
        if time_columns is None:
            time_columns = {
                '0h': '_0h',
                '24h': '_24h',
                '96h': '_96h',
                '168h': '_168h'
            }

        for param in parametric_columns:
            suffix_0h = time_columns.get('0h', '_0h')
            suffix_24h = time_columns.get('24h', '_24h')
            suffix_96h = time_columns.get('96h', '_96h')
            suffix_168h = time_columns.get('168h', '_168h')

            col_0h = f'{param}{suffix_0h}'
            col_24h = f'{param}{suffix_24h}'
            col_168h = f'{param}{suffix_168h}'
            col_96h = f'{param}{suffix_96h}'

            required_cols = [col_0h, col_24h, col_168h]
            available_cols = [c for c in required_cols if c in training_data.columns]

            if len(available_cols) < 2:
                continue

            # Prepare training data
            df = training_data[available_cols].dropna()

            if len(df) < 10:
                continue

            has_96h = col_96h in df.columns
            X_cols = [col_0h, col_24h]
            if has_96h:
                X_cols.append(col_96h)

            X = df[X_cols].values
            y = df[col_168h].values

            # Engineer features
            X_features = np.column_stack([
                X[:, 0],  # value_0h
                X[:, 1],  # value_24h
                X[:, 1] - X[:, 0],  # drift_0h_24h
                (X[:, 1] - X[:, 0]) / 24.0,  # drift_rate
                np.where(X[:, 0] != 0, (X[:, 1] - X[:, 0]) / np.abs(X[:, 0]) * 100, 0),  # pct_change
            ])

            if has_96h:
                X_features = np.column_stack([
                    X_features,
                    X[:, 2],  # value_96h
                    X[:, 2] - X[:, 1],  # drift_24h_96h
                    (X[:, 2] - X[:, 1]) / 72.0,  # drift_rate_24h_96h
                ])

            # Scale features
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X_features)

            # Train multiple models and select best
            models_to_try = {
                'ridge': Ridge(alpha=1.0),
                'random_forest': RandomForestRegressor(
                    n_estimators=100, max_depth=10, random_state=42
                ),
                'gradient_boosting': GradientBoostingRegressor(
                    n_estimators=100, max_depth=5, random_state=42
                ),
            }

            best_score = -np.inf
            best_model_name = None
            best_model = None

            for name, model in models_to_try.items():
                try:
                    if len(X_scaled) >= 5:
                        cv_folds = min(5, len(X_scaled) // 2)
                        scores = cross_val_score(
                            model, X_scaled, y,
                            cv=cv_folds, scoring='neg_mean_absolute_error'
                        )
                        avg_score = scores.mean()
                    else:
                        avg_score = 0

                    model.fit(X_scaled, y)
                    train_mae = np.mean(np.abs(model.predict(X_scaled) - y))

                    if avg_score > best_score:
                        best_score = avg_score
                        best_model_name = name
                        best_model = model

                except Exception as e:
                    continue

            if best_model is None:
                continue

            # Store model and metadata
            self.models[param] = best_model
            self.scalers[param] = scaler

            # Feature importance
            if hasattr(best_model, 'feature_importances_'):
                feature_names = ['value_0h', 'value_24h', 'drift_0h_24h',
                                 'drift_rate', 'pct_change']
                if has_96h:
                    feature_names.extend(['value_96h', 'drift_24h_96h', 'drift_rate_24h_96h'])
                self.feature_importances[param] = dict(zip(
                    feature_names[:len(best_model.feature_importances_)],
                    best_model.feature_importances_.tolist()
                ))
            elif hasattr(best_model, 'coef_'):
                feature_names = ['value_0h', 'value_24h', 'drift_0h_24h',
                                 'drift_rate', 'pct_change']
                if has_96h:
                    feature_names.extend(['value_96h', 'drift_24h_96h', 'drift_rate_24h_96h'])
                self.feature_importances[param] = dict(zip(
                    feature_names[:len(best_model.coef_)],
                    [abs(float(c)) for c in best_model.coef_]
                ))

            # Compute safety slope
            self.safety_slopes[param] = self.compute_safety_slope(
                training_data, param
            )

            # Training metrics
            predictions = best_model.predict(X_scaled)
            mae = float(np.mean(np.abs(predictions - y)))
            rmse = float(np.sqrt(np.mean((predictions - y) ** 2)))
            r2 = float(best_model.score(X_scaled, y))

            self.training_metrics[param] = {
                'model_type': best_model_name,
                'mae': round(mae, 6),
                'rmse': round(rmse, 6),
                'r2_score': round(r2, 6),
                'cv_score': round(-best_score, 6) if best_score > -np.inf else None,
                'training_samples': len(df),
                'safety_slope': round(self.safety_slopes.get(param, 0), 6)
            }

    def predict(self, param: str, value_0h: float, value_24h: float,
                value_96h: Optional[float] = None) -> Dict:
        """
        Predict Value_168h for a single component parameter.
        
        Returns prediction, drift analysis, and rejection recommendation.
        """
        if param not in self.models:
            return {
                'status': 'error',
                'message': f'No trained model for parameter {param}'
            }

        # Compute features
        features = self.compute_drift_features(value_0h, value_24h, value_96h)

        # Determine expected feature count from the scaler
        expected_features = self.scalers[param].n_features_in_

        # Base 5 features
        base_features = [
            features['value_0h'],
            features['value_24h'],
            features['drift_0h_24h'],
            features['drift_rate_0h_24h'],
            features['pct_change_0h_24h'],
        ]

        # Add 96h features if the model was trained with them
        if expected_features > 5:
            base_features.extend([
                features.get('value_96h', 0) if value_96h is not None else 0,
                features.get('drift_24h_96h', 0) if value_96h is not None else 0,
                features.get('drift_rate_24h_96h', 0) if value_96h is not None else 0,
            ])

        X = np.array([base_features])

        # Scale and predict
        X_scaled = self.scalers[param].transform(X)
        predicted_168h = float(self.models[param].predict(X_scaled)[0])

        # Drift analysis
        predicted_drift_rate = (predicted_168h - value_0h) / 168.0
        safety_slope = self.safety_slopes.get(param, 0)
        exceeds_safety = abs(predicted_drift_rate) > safety_slope if safety_slope > 0 else False

        # Early rejection decision
        if exceeds_safety:
            recommendation = 'REJECT'
            confidence = min(abs(predicted_drift_rate) / safety_slope, 1.0) if safety_slope > 0 else 1.0
        else:
            confidence = 1.0 - (abs(predicted_drift_rate) / safety_slope) if safety_slope > 0 else 0.9
            recommendation = 'PASS'

        return {
            'status': 'success',
            'parameter': param,
            'input': {
                'value_0h': value_0h,
                'value_24h': value_24h,
                'value_96h': value_96h
            },
            'prediction': {
                'predicted_168h': round(predicted_168h, 6),
                'predicted_drift_rate': round(predicted_drift_rate, 6),
                'safety_slope': round(safety_slope, 6),
                'exceeds_safety_slope': exceeds_safety
            },
            'recommendation': recommendation,
            'confidence': round(confidence, 4),
            'features': features,
            'model_info': self.training_metrics.get(param, {}),
            'explainability': self._generate_drift_explanation(
                param, features, predicted_168h, predicted_drift_rate,
                safety_slope, exceeds_safety, recommendation
            )
        }

    def predict_batch(self, data: pd.DataFrame, param: str,
                      col_0h: str, col_24h: str,
                      col_96h: Optional[str] = None,
                      col_168h: Optional[str] = None) -> List[Dict]:
        """Predict drift for a batch of components."""
        results = []

        for idx, row in data.iterrows():
            value_0h = row.get(col_0h)
            value_24h = row.get(col_24h)
            value_96h = row.get(col_96h) if col_96h else None
            actual_168h = row.get(col_168h) if col_168h else None

            if pd.isna(value_0h) or pd.isna(value_24h):
                continue

            prediction = self.predict(param, float(value_0h), float(value_24h),
                                       float(value_96h) if value_96h and not pd.isna(value_96h) else None)

            if actual_168h and not pd.isna(actual_168h):
                prediction['actual_168h'] = float(actual_168h)
                prediction['prediction_error'] = abs(
                    prediction['prediction']['predicted_168h'] - float(actual_168h)
                )

            prediction['component_index'] = idx
            results.append(prediction)

        return results

    def get_overall_accuracy(self, results: List[Dict]) -> Dict:
        """Calculate overall prediction accuracy metrics."""
        errors = [r['prediction_error'] for r in results if 'prediction_error' in r]
        actuals = [r['actual_168h'] for r in results if 'actual_168h' in r]
        predicted = [r['prediction']['predicted_168h'] for r in results
                     if 'actual_168h' in r]

        if not errors:
            return {'message': 'No ground truth available for accuracy calculation'}

        errors = np.array(errors)
        actuals = np.array(actuals)
        predicted = np.array(predicted)

        mae = float(np.mean(errors))
        rmse = float(np.sqrt(np.mean(errors ** 2)))
        mape = float(np.mean(np.abs(errors / np.where(actuals != 0, actuals, 1)) * 100))

        # R2 score
        ss_res = np.sum((actuals - predicted) ** 2)
        ss_tot = np.sum((actuals - np.mean(actuals)) ** 2)
        r2 = float(1 - (ss_res / ss_tot)) if ss_tot > 0 else 0

        return {
            'mean_absolute_error': round(mae, 6),
            'root_mean_squared_error': round(rmse, 6),
            'mean_absolute_percentage_error': round(mape, 2),
            'r2_score': round(r2, 6),
            'n_samples': len(errors),
            'max_error': round(float(np.max(errors)), 6),
            'min_error': round(float(np.min(errors)), 6),
            'median_error': round(float(np.median(errors)), 6)
        }

    def _generate_drift_explanation(self, param: str, features: Dict,
                                     predicted_168h: float, drift_rate: float,
                                     safety_slope: float, exceeds: bool,
                                     recommendation: str) -> Dict:
        """
        Generate explainable reasoning for drift predictions.
        Critical for QA inspector trust and system transparency.
        """
        # Get feature importance for this parameter
        importance = self.feature_importances.get(param, {})
        top_features = sorted(importance.items(), key=lambda x: x[1], reverse=True)[:3]

        reasoning_steps = [
            f"Step 1: Initial measurement at 0h = {features['value_0h']:.4f}",
            f"Step 2: 24h measurement = {features['value_24h']:.4f}, "
            f"drift = {features['drift_0h_24h']:.4f}",
            f"Step 3: Estimated drift rate = {features['drift_rate_0h_24h']:.6f}/hour",
            f"Step 4: Projected 168h value = {predicted_168h:.4f}",
            f"Step 5: Safety slope threshold = {safety_slope:.6f}/hour",
        ]

        if exceeds:
            reasoning_steps.append(
                f"Step 6: EXCEEDS safety slope by "
                f"{abs(drift_rate) - safety_slope:.6f}/hour -> FLAGGED"
            )
        else:
            reasoning_steps.append(
                f"Step 6: Within safety slope -> CLEARED"
            )

        # Feature contribution analysis
        feature_contributions = []
        for fname, fimportance in top_features:
            if fname in features:
                feature_contributions.append({
                    'feature': fname,
                    'value': round(features[fname], 6),
                    'importance': round(fimportance, 4),
                    'explanation': f"{fname} = {features[fname]:.4f} (model importance: {fimportance:.2%})"
                })

        return {
            'recommendation': recommendation,
            'reasoning': reasoning_steps,
            'feature_contributions': feature_contributions,
            'summary': (
                f"The model predicts that '{param}' will reach {predicted_168h:.4f} "
                f"at 168 hours based on the observed drift from 0h ({features['value_0h']:.4f}) "
                f"to 24h ({features['value_24h']:.4f}). "
                f"The {'projected' if exceeds else 'observed'} drift rate "
                f"{'exceeds' if exceeds else 'is within'} the safety threshold "
                f"({safety_slope:.6f}/hour), leading to a "
                f"{'REJECTION' if recommendation == 'REJECT' else 'PASS'} recommendation."
            ),
            'safety_analysis': {
                'current_drift_rate': round(drift_rate, 6),
                'safety_threshold': round(safety_slope, 6),
                'margin': round(safety_slope - abs(drift_rate), 6),
                'exceeds': exceeds
            }
        }
