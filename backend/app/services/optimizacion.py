# backend/app/services/optimizacion.py
from scipy.optimize import linprog

def calcular_optimo_riego(volumen_disponible: float, zonas: list) -> list:
    """
    Resuelve el problema de asignación de agua utilizando Programación Lineal.
    """
    if not zonas or volumen_disponible <= 0:
        return []

    n = len(zonas)
    # c_i: Costos de distribución
    costos = [z.costo_distribucion for z in zonas]
    # d_i: Demandas máximas de cada zona
    demandas = [z.demanda_agua for z in zonas]

    # El volumen a distribuir será el mínimo entre lo que tenemos y lo que piden todas las zonas juntas
    # Esto asegura que el solver no colapse si no hay suficiente agua para todos.
    volumen_a_distribuir = min(volumen_disponible, sum(demandas))

    # Matriz de restricciones de igualdad (A_eq * x = b_eq)
    # Suma de todas las x_i = volumen_a_distribuir
    A_eq = [[1] * n]
    b_eq = [volumen_a_distribuir]

    # Límites (bounds) para cada variable: 0 <= x_i <= d_i
    limites = [(0, float(demanda)) for demanda in demandas]

    # Resolver utilizando el método 'highs' (el más moderno y eficiente en scipy para LP)
    resultado = linprog(c=costos, A_eq=A_eq, b_eq=b_eq, bounds=limites, method='highs')

    distribucion_optima = []
    if resultado.success:
        for i, zona in enumerate(zonas):
            asignado = round(resultado.x[i], 2)
            if asignado > 0:
                distribucion_optima.append({
                    "id_zona": zona.id_zona,
                    "nombre_zona": zona.nombre_zona,
                    "volumen_asignado": asignado,
                    "porcentaje_cubierto": round((asignado / float(zona.demanda_agua)) * 100, 2) if zona.demanda_agua > 0 else 0
                })
                
    # Ordenamos el resultado de mayor a menor volumen asignado
    return sorted(distribucion_optima, key=lambda x: x["volumen_asignado"], reverse=True)