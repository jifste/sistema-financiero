import streamlit as st
import pandas as pd
import plotly.express as px
from utils import DataProcessor

# Global Theme Configuration
st.set_page_config(
    page_title="FinanceAI",
    page_icon="💸",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize Data Processor
@st.cache_resource
def get_processor():
    processor = DataProcessor()
    processor.load_data()
    return processor

processor = get_processor()

# Sidebar
with st.sidebar:
    st.title("💸 FinanceAI")
    st.markdown("---")
    st.image("https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff&rounded=true", width=50)
    st.write("Bienvenido, **Usuario**")
    
    st.markdown("### 📥 Upload Center")
    uploaded_file = st.file_uploader("Sube tu cartola (Excel/CSV)", type=['csv', 'xlsx', 'xls'])
    
    if uploaded_file:
        try:
            # Read the file - try different header rows
            if uploaded_file.name.endswith('.csv'):
                df = pd.read_csv(uploaded_file)
            else:
                # Try to find the header row by looking for 'Fecha' column
                df_test = pd.read_excel(uploaded_file, header=None)
                header_row = 0
                for i, row in df_test.iterrows():
                    if 'Fecha' in row.values or 'fecha' in str(row.values).lower():
                        header_row = i
                        break
                
                # Re-read with correct header
                uploaded_file.seek(0)  # Reset file pointer
                df = pd.read_excel(uploaded_file, header=header_row)
            
            # Clean up column names
            df.columns = [str(col).strip() for col in df.columns]
            
            # Debug: show original columns
            original_cols = df.columns.tolist()
            
            # Map bank columns to app format
            column_mapping = {
                'Fecha': 'fecha',
                'Movimientos': 'destinatario',
                'Cargos': 'monto',
                'Abonos': 'abonos',
                'Saldo': 'saldo',
                'Documentos': 'documentos'
            }
            
            # Rename columns that exist
            for old_name, new_name in column_mapping.items():
                if old_name in df.columns:
                    df = df.rename(columns={old_name: new_name})
            
            # Remove rows where 'fecha' is NaN or is text header
            if 'fecha' in df.columns:
                df = df[df['fecha'].notna()]
                df = df[~df['fecha'].astype(str).str.contains('Fecha', case=False, na=False)]
            
            # Convert monto to numeric
            if 'monto' in df.columns:
                df['monto'] = pd.to_numeric(df['monto'], errors='coerce').fillna(0)
            
            # Set default values for manual categorization
            df['categoria'] = 'Sin categorizar'
            df['tipo_regla'] = 'Sin asignar'
            
            st.success(f"✅ Archivo cargado: {len(df)} filas")
            st.caption(f"Columnas originales: {', '.join(original_cols)}")
            
            # Store in session state for processing
            st.session_state['uploaded_data'] = df
            st.session_state['file_name'] = uploaded_file.name
            
            # IMPORTANT: Initialize edited_data with a copy of uploaded_data
            st.session_state['edited_data'] = df.copy()
            
            # Show preview with mapped columns
            with st.expander("👀 Vista previa"):
                preview_cols = ['fecha', 'destinatario', 'categoria', 'monto', 'tipo_regla']
                available = [c for c in preview_cols if c in df.columns]
                st.dataframe(df[available].head(10) if available else df.head(10), use_container_width=True)
                
        except Exception as e:
            st.error(f"Error al leer archivo: {e}")
            import traceback
            st.code(traceback.format_exc())
        
    st.markdown("---")
    st.info("FinanceAI v0.4 (Auto-Categorize)")

# Main Layout
st.title("Dashboard Financiero")

# KPIs
kpis = processor.get_kpis()
col1, col2, col3 = st.columns(3)

with col1:
    st.metric(label="Ingresos (Est.)", value=f"${kpis['ingresos']:,.0f}")
with col2:
    st.metric(label="Gastos Mensuales", value=f"${kpis['gastos']:,.0f}", delta="-15%", delta_color="inverse")
with col3:
    st.metric(label="Deuda Total Activa (Pasivo)", value=f"${kpis['deuda_total']:,.0f}", delta="Alert", delta_color="inverse")

# Tabs
tab1, tab2, tab3 = st.tabs(["📊 Visión General", "💳 Debt Tracker", "📝 Movimientos"])

with tab1:
    st.markdown("### Distribución 50/30/20")
    
    # Check if user has edited data (from uploaded file)
    if 'edited_data' in st.session_state and st.session_state['edited_data'] is not None:
        chart_df = st.session_state['edited_data']
        
        # DEBUG: Show what's in the dataframe
        with st.expander("🔍 Debug: Ver datos actuales", expanded=False):
            if 'tipo_regla' in chart_df.columns:
                st.write("Distribución tipo_regla en session_state:")
                st.write(chart_df['tipo_regla'].value_counts().to_dict())
                st.write("Primeras 5 filas:")
                st.dataframe(chart_df[['destinatario', 'monto', 'tipo_regla']].head())
        
        # Check if we have the necessary columns
        if 'tipo_regla' in chart_df.columns and 'monto' in chart_df.columns:
            # Group by tipo_regla
            rule_dist = chart_df.groupby('tipo_regla')['monto'].sum().reset_index()
            
            # Calculate percentages
            total_monto = rule_dist['monto'].sum()
            rule_dist['porcentaje'] = (rule_dist['monto'] / total_monto * 100).round(1)
            
            st.success(f"📊 Datos de tu cartola cargada ({len(chart_df)} movimientos)")
            
            if not rule_dist.empty and total_monto > 0:
                fig = px.pie(
                    rule_dist, 
                    values='monto', 
                    names='tipo_regla', 
                    color='tipo_regla',
                    color_discrete_map={
                        'Necesidad 50%': '#3B82F6',  # Blue
                        'Deseo 30%': '#EAB308',      # Yellow
                        'Ahorro 20%': '#22C55E',     # Green
                        'Sin asignar': '#6B7280'     # Gray
                    },
                    hole=0.5
                )
                fig.update_traces(textposition='inside', textinfo='percent+label')
                st.plotly_chart(fig, use_container_width=True)
                
                # Show breakdown below chart
                st.markdown("#### 📋 Detalle de Distribución")
                col1, col2, col3, col4 = st.columns(4)
                
                for i, row in rule_dist.iterrows():
                    col = [col1, col2, col3, col4][i % 4]
                    with col:
                        st.metric(
                            label=row['tipo_regla'],
                            value=f"${row['monto']:,.0f}",
                            delta=f"{row['porcentaje']}%"
                        )
            else:
                st.warning("No hay montos asignados aún. Ve a 'Movimientos' y asigna el tipo de regla a cada gasto.")
        else:
            st.warning("El archivo cargado no tiene las columnas necesarias (tipo_regla, monto).")
    else:
        # Use mock data from processor
        st.info("💡 Sube tu cartola en el sidebar para ver tu distribución real.")
        
        rule_dist = processor.get_rule_distribution()
        
        if not rule_dist.empty:
            fig = px.pie(
                rule_dist, 
                values='monto', 
                names='tipo_regla', 
                color='tipo_regla',
                color_discrete_map={
                    'Necesidad 50%': '#3B82F6',
                    'Deseo 30%': '#EAB308',
                    'Ahorro 20%': '#22C55E'
                },
                hole=0.5
            )
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.warning("No hay datos para mostrar.")

with tab2:
    st.markdown("### Seguimiento de Deudas")
    debts = processor.get_debts()
    
    if not debts.empty:
        for index, row in debts.iterrows():
            with st.container():
                c1, c2 = st.columns([3, 1])
                with c1:
                    st.subheader(f"{row['descripcion_compra']}")
                    st.caption(f"Cuota {row['cuota_actual']} de {row['cuotas_totales']}")
                    
                    # Custom progress bar color based on progress
                    prog_val = float(row['progreso'])
                    st.progress(prog_val)
                    
                    if row['cuotas_totales'] - row['cuota_actual'] <= 3:
                        st.warning("⚠️ ¡Deuda por terminar! Quedan menos de 3 cuotas.")
                        
                with c2:
                    st.metric("Saldo Pendiente", f"${row['saldo_pendiente']:,.0f}")
                    st.write(f"Cuota: ${row['valor_cuota_mensual']:,.0f}/mes")
                
                st.divider()
    else:
        st.write("No hay deudas registradas.")

with tab3:
    st.markdown("### Detalles de Movimientos")
    
    # Define options for dropdowns
    CATEGORIA_OPTIONS = ['Sin categorizar', 'Personal', 'Alimentacion', 'Salud', 'Deuda', 'Entretencion', 'Profesional', 'Movilizacion', 'Hogar']
    REGLA_OPTIONS = ['Sin asignar', 'Necesidad 50%', 'Deseo 30%', 'Ahorro 20%']
    
    # Check if user uploaded data
    if 'uploaded_data' in st.session_state and st.session_state['uploaded_data'] is not None:
        
        # Initialize edited_data if not exists
        if 'edited_data' not in st.session_state:
            st.session_state['edited_data'] = st.session_state['uploaded_data'].copy()
        
        df = st.session_state['edited_data']
        
        st.success(f"📂 Mostrando datos de: **{st.session_state.get('file_name', 'archivo')}** ({len(df)} movimientos)")
        st.info("💡 Cambia el 'Tipo Regla' de cada movimiento. Los cambios se guardan automáticamente.")
        
        # Show the data with editable selectboxes
        # Create header row
        header_cols = st.columns([2, 3, 2, 1.5, 2])
        header_cols[0].markdown("**Fecha**")
        header_cols[1].markdown("**Destinatario**")
        header_cols[2].markdown("**Categoria**")
        header_cols[3].markdown("**Monto**")
        header_cols[4].markdown("**Tipo Regla**")
        
        st.markdown("---")
        
        # Limit to first 20 rows for performance (with pagination option)
        page_size = 15
        if 'current_page' not in st.session_state:
            st.session_state['current_page'] = 0
        
        total_pages = (len(df) - 1) // page_size + 1
        start_idx = st.session_state['current_page'] * page_size
        end_idx = min(start_idx + page_size, len(df))
        
        # Pagination controls
        pag_cols = st.columns([1, 2, 1])
        with pag_cols[0]:
            if st.button("⬅️ Anterior", disabled=st.session_state['current_page'] == 0):
                st.session_state['current_page'] -= 1
                st.rerun()
        with pag_cols[1]:
            st.write(f"Página {st.session_state['current_page'] + 1} de {total_pages} (mostrando {start_idx + 1}-{end_idx} de {len(df)})")
        with pag_cols[2]:
            if st.button("Siguiente ➡️", disabled=st.session_state['current_page'] >= total_pages - 1):
                st.session_state['current_page'] += 1
                st.rerun()
        
        st.markdown("---")
        
        # Callback function to update tipo_regla
        def update_tipo_regla(idx):
            key = f"tipo_regla_select_{idx}"
            if key in st.session_state:
                new_value = st.session_state[key]
                st.session_state['edited_data'].at[idx, 'tipo_regla'] = new_value
        
        # Display rows with selectboxes
        for idx in range(start_idx, end_idx):
            row = df.iloc[idx]
            cols = st.columns([2, 3, 2, 1.5, 2])
            
            # Show read-only fields
            fecha_str = str(row.get('fecha', ''))[:10] if pd.notna(row.get('fecha')) else ''
            cols[0].text(fecha_str)
            cols[1].text(str(row.get('destinatario', ''))[:30])
            cols[2].text(str(row.get('categoria', 'Sin categorizar')))
            cols[3].text(f"${row.get('monto', 0):,.0f}")
            
            # Editable tipo_regla selectbox
            current_value = str(row.get('tipo_regla', 'Sin asignar'))
            if current_value not in REGLA_OPTIONS:
                current_value = 'Sin asignar'
            
            current_index = REGLA_OPTIONS.index(current_value) if current_value in REGLA_OPTIONS else 0
            
            cols[4].selectbox(
                f"regla_{idx}",
                options=REGLA_OPTIONS,
                index=current_index,
                key=f"tipo_regla_select_{idx}",
                label_visibility="collapsed",
                on_change=update_tipo_regla,
                args=(idx,)
            )
        
        # Show summary stats
        st.markdown("---")
        
        # Count assignments
        asignados = len(df[df['tipo_regla'] != 'Sin asignar']) if 'tipo_regla' in df.columns else 0
        total = len(df)
        
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Total Registros", total)
        with col2:
            if 'monto' in df.columns:
                total_gastos = df['monto'].sum()
                st.metric("Total Gastos", f"${total_gastos:,.0f}")
        with col3:
            st.metric("Reglas Asignadas", f"{asignados}/{total}")
                
    else:
        # Use mock data from processor
        st.info("💡 Sube tu cartola en el sidebar para ver tus datos reales.")
        
        transactions = processor.transactions.copy()
        
        # Ensure valid values
        transactions['categoria'] = transactions['categoria'].apply(
            lambda x: x if x in CATEGORIA_OPTIONS else 'Sin categorizar'
        )
        transactions['tipo_regla'] = transactions['tipo_regla'].apply(
            lambda x: x if x in REGLA_OPTIONS else 'Necesidad 50%'
        )
        
        recipients = ["Todos"] + list(transactions['destinatario'].unique())
        selected_recipient = st.selectbox("Filtrar por Destinatario", recipients)
        
        if selected_recipient != "Todos":
            transactions = transactions[transactions['destinatario'] == selected_recipient]
            total_recipient = transactions['monto'].sum()
            st.metric(f"Total gastado en {selected_recipient}", f"${total_recipient:,.0f}")
        
        # Configure column types for data_editor
        column_config = {
            "fecha": st.column_config.DateColumn("Fecha"),
            "destinatario": st.column_config.TextColumn("Destinatario", disabled=True),
            "categoria": st.column_config.SelectboxColumn(
                "Categoria",
                options=CATEGORIA_OPTIONS,
                required=True
            ),
            "monto": st.column_config.NumberColumn("Monto", format="$%d"),
            "tipo_regla": st.column_config.SelectboxColumn(
                "Tipo Regla",
                options=REGLA_OPTIONS,
                required=True
            )
        }
            
        st.data_editor(
            transactions[['fecha', 'destinatario', 'categoria', 'monto', 'tipo_regla']],
            column_config=column_config,
            use_container_width=True,
            hide_index=True,
            num_rows="fixed"
        )

