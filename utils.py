import pandas as pd
import numpy as np
import datetime
from typing import List, Dict, Any

# Enums simulation
CATEGORIES = ['Personal', 'Profesional', 'Salud', 'Entretencion', 'Movilizacion', 'Alimentacion', 'Hogar']
RULES = ['Necesidad 50%', 'Deseo 30%', 'Ahorro 20%']

class DataProcessor:
    def __init__(self):
        self.transactions = pd.DataFrame()
        self.debts = pd.DataFrame()

    def generate_mock_data(self):
        """Generates mock data for transactions and debts since CSV is missing."""
        
        # 1. Mock Transactions
        current_year = datetime.datetime.now().year
        current_month = datetime.datetime.now().month
        
        data_transactions = []
        recipients = ["Uber", "Jumbo", "Netflix", "Farmacia Cruz Verde", "Copec", "Starbucks", "Zara", "Spotify"]
        
        for _ in range(50):
            day = np.random.randint(1, 28)
            date = datetime.date(current_year, current_month, day)
            recipient = np.random.choice(recipients)
            category = np.random.choice(CATEGORIES)
            
            # Simple rule logic for mock data
            if category in ['Alimentacion', 'Hogar', 'Salud', 'Movilizacion']:
                rule = 'Necesidad 50%'
            elif category == 'Ahorro': # Not in list but good for logic
                rule = 'Ahorro 20%'
            else:
                rule = 'Deseo 30%'
            
            amount = np.random.randint(5000, 150000)
            
            data_transactions.append({
                "id": str(np.random.randint(1000, 9999)),
                "fecha": date,
                "destinatario": recipient,
                "categoria": category,
                "tipo_regla": rule,
                "monto": amount
            })
            
        self.transactions = pd.DataFrame(data_transactions)
        
        # 2. Mock Debts (Purchases with installments)
        data_debts = [
            {
                "id": "d1",
                "descripcion_compra": "Iphone 15 Pro",
                "monto_total_original": 1200000,
                "cuotas_totales": 24,
                "cuota_actual": 8,
                "valor_cuota_mensual": 50000,
                "fecha_inicio": datetime.date(2023, 10, 15)
            },
            {
                "id": "d2",
                "descripcion_compra": "Sillón Sectional",
                "monto_total_original": 400000,
                "cuotas_totales": 6,
                "cuota_actual": 5,
                "valor_cuota_mensual": 66666,
                "fecha_inicio": datetime.date(2024, 1, 10)
            },
            {
                "id": "d3",
                "descripcion_compra": "Viaje Cancún",
                "monto_total_original": 1500000,
                "cuotas_totales": 12,
                "cuota_actual": 2,
                "valor_cuota_mensual": 125000,
                "fecha_inicio": datetime.date(2024, 3, 5)
            }
        ]
        
        # Calculate pending balance
        for debt in data_debts:
            debt["saldo_pendiente"] = (debt["cuotas_totales"] - debt["cuota_actual"]) * debt["valor_cuota_mensual"]
            debt["progreso"] = (debt["cuota_actual"] / debt["cuotas_totales"]) # 0 to 1
            
        self.debts = pd.DataFrame(data_debts)

    def load_data(self):
        """Placeholder for real data loading logic."""
        # Check if CSV exists, else generate mock
        if self.transactions.empty:
            self.generate_mock_data()
            
    def get_kpis(self):
        """Returns key metrics."""
        total_expense = self.transactions['monto'].sum() if not self.transactions.empty else 0
        total_debt = self.debts['saldo_pendiente'].sum() if not self.debts.empty else 0
        
        # Mock Income (Assumed to be higher than expenses for demo)
        income = int(total_expense * 1.5) 
        
        return {
            "ingresos": income,
            "gastos": total_expense,
            "deuda_total": total_debt
        }

    def get_rule_distribution(self):
        """Returns distribution for 50/30/20 chart."""
        if self.transactions.empty:
            return pd.DataFrame()
        return self.transactions.groupby('tipo_regla')['monto'].sum().reset_index()

    def get_debts(self):
        return self.debts
