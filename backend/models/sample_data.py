"""
Sample data generator for ISRO Burn-In Anomaly Detection System.
Generates realistic parametric data for testing.
"""

import numpy as np
import pandas as pd
from typing import List


def generate_sample_data(n_components: int = 200, n_lots: int = 5,
                         defect_rate: float = 0.08) -> pd.DataFrame:
    """
    Generate realistic burn-in parametric data.
    
    Parameters include:
    - Standby current (Iddq) in µA
    - Leakage current in µA
    - Propagation delay in ns
    - Supply current in mA
    
    Simulates measurements at 0h, 24h, 96h, 168h intervals.
    """
    np.random.seed(42)
    
    records = []
    component_id = 1000
    
    for lot_idx in range(n_lots):
        lot_id = f"LOT-{chr(65 + lot_idx)}{lot_idx + 1:03d}"
        
        # Lot-specific baseline parameters
        lot_iddq_base = np.random.uniform(8, 12)  # µA
        lot_leakage_base = np.random.uniform(3, 7)  # µA
        lot_delay_base = np.random.uniform(2.1, 2.5)  # ns
        lot_supply_base = np.random.uniform(45, 55)  # mA
        
        lot_drift_factor = np.random.uniform(0.001, 0.005)
        
        n_in_lot = n_components // n_lots
        
        for i in range(n_in_lot):
            is_defective = np.random.random() < defect_rate
            
            component_id += 1
            comp_id = f"COMP-{component_id:05d}"
            
            # Normal component parameters with lot-relative variation
            iddq_noise = np.random.normal(0, 0.3)
            leakage_noise = np.random.normal(0, 0.2)
            delay_noise = np.random.normal(0, 0.02)
            supply_noise = np.random.normal(0, 0.5)
            
            for hour_idx, hours in enumerate([0, 24, 96, 168]):
                # Time-dependent drift
                time_drift = lot_drift_factor * hours
                
                if is_defective:
                    # Defective components have higher drift
                    defect_multiplier = np.random.uniform(3, 8)
                    time_drift *= defect_multiplier
                    # Add non-linear acceleration
                    time_drift += 0.0001 * hours ** 1.5
                
                iddq = lot_iddq_base + iddq_noise + time_drift + np.random.normal(0, 0.1)
                leakage = lot_leakage_base + leakage_noise + time_drift * 0.5 + np.random.normal(0, 0.05)
                delay = lot_delay_base + delay_noise + time_drift * 0.1 + np.random.normal(0, 0.005)
                supply = lot_supply_base + supply_noise + time_drift * 2 + np.random.normal(0, 0.2)
                
                record = {
                    'component_id': comp_id,
                    'lot_id': lot_id,
                    'test_hour': hours,
                    'is_defective': is_defective,
                    f'iddq_{hours}h': round(max(iddq, 0.1), 4),
                    f'leakage_{hours}h': round(max(leakage, 0.01), 4),
                    f'delay_{hours}h': round(max(delay, 0.5), 4),
                    f'supply_current_{hours}h': round(max(supply, 1), 4),
                }
                records.append(record)
    
    return pd.DataFrame(records)


def generate_flat_data(n_components: int = 200, n_lots: int = 5,
                       defect_rate: float = 0.08, seed: int = 42) -> pd.DataFrame:
    """
    Generate flat (wide) format data with one row per component.
    Each column contains measurements at different time points.
    """
    np.random.seed(seed)
    
    records = []
    component_id = 1000
    
    for lot_idx in range(n_lots):
        lot_id = f"LOT-{chr(65 + lot_idx)}{lot_idx + 1:03d}"
        
        lot_iddq_base = np.random.uniform(8, 12)
        lot_leakage_base = np.random.uniform(3, 7)
        lot_delay_base = np.random.uniform(2.1, 2.5)
        lot_supply_base = np.random.uniform(45, 55)
        
        lot_drift_factor = np.random.uniform(0.001, 0.005)
        n_in_lot = n_components // n_lots
        
        for i in range(n_in_lot):
            is_defective = np.random.random() < defect_rate
            component_id += 1
            
            iddq_noise = np.random.normal(0, 0.3)
            leakage_noise = np.random.normal(0, 0.2)
            delay_noise = np.random.normal(0, 0.02)
            supply_noise = np.random.normal(0, 0.5)
            
            record = {
                'component_id': f"COMP-{component_id:05d}",
                'lot_id': lot_id,
                'is_defective': is_defective
            }
            
            for hours in [0, 24, 96, 168]:
                time_drift = lot_drift_factor * hours
                if is_defective:
                    defect_mult = np.random.uniform(3, 8)
                    time_drift *= defect_mult
                    time_drift += 0.0001 * hours ** 1.5
                
                record[f'iddq_{hours}h'] = round(max(
                    lot_iddq_base + iddq_noise + time_drift + np.random.normal(0, 0.1), 0.1
                ), 4)
                record[f'leakage_{hours}h'] = round(max(
                    lot_leakage_base + leakage_noise + time_drift * 0.5 + np.random.normal(0, 0.05), 0.01
                ), 4)
                record[f'delay_{hours}h'] = round(max(
                    lot_delay_base + delay_noise + time_drift * 0.1 + np.random.normal(0, 0.005), 0.5
                ), 4)
                record[f'supply_current_{hours}h'] = round(max(
                    lot_supply_base + supply_noise + time_drift * 2 + np.random.normal(0, 0.2), 1
                ), 4)
            
            records.append(record)
    
    return pd.DataFrame(records)


if __name__ == '__main__':
    df = generate_flat_data()
    df.to_csv('sample_burn_in_data.csv', index=False)
    print(f"Generated {len(df)} component records across {df['lot_id'].nunique()} lots")
    print(f"Defective components: {df['is_defective'].sum()} ({df['is_defective'].mean()*100:.1f}%)")
    print(df.head())
