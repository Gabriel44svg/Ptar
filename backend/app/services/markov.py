# backend/app/services/markov.py
import numpy as np

def clasificar_estado(valor: float, umbral_min: float = None, umbral_max: float = None) -> int:
    """
    Clasifica un valor numérico en un estado del sistema:
    0 = Bajo (Fuera de norma)
    1 = Óptimo (Dentro de norma)
    2 = Alto (Fuera de norma)
    """
    if umbral_min is not None and valor < float(umbral_min):
        return 0
    elif umbral_max is not None and valor > float(umbral_max):
        return 2
    else:
        return 1

def calcular_matriz_transicion(secuencia_estados: list) -> list:
    """
    Calcula la matriz de probabilidades de transición a partir de una secuencia histórica de estados.
    """
    if not secuencia_estados or len(secuencia_estados) < 2:
        return []

    # Nuestro espacio de estados siempre es 3 (0, 1, 2)
    num_estados = 3
    matriz_conteo = np.zeros((num_estados, num_estados))

    # Contar las transiciones n_ij
    for i in range(len(secuencia_estados) - 1):
        estado_actual = secuencia_estados[i]
        estado_siguiente = secuencia_estados[i + 1]
        matriz_conteo[estado_actual][estado_siguiente] += 1

    # Calcular p_ij dividiendo entre la suma de la fila
    matriz_probabilidades = []
    for i in range(num_estados):
        total_transiciones = np.sum(matriz_conteo[i])
        if total_transiciones > 0:
            probabilidades = matriz_conteo[i] / total_transiciones
        else:
            # Estado absorbente o sin datos de salida: probabilidad de quedarse es 1
            probabilidades = np.zeros(num_estados)
            probabilidades[i] = 1.0
            
        # Redondear a 4 decimales para mandar a la API
        matriz_probabilidades.append([round(float(p), 4) for p in probabilidades])

    return matriz_probabilidades