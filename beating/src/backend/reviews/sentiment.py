import sys

try:
    from transformers import pipeline
    import torch
    TRANSFORMERS_AVAILABLE = True
    ANALYZER_FAILURE = False
except ImportError as e:
    # Si la importación falla (debido a la incompatibilidad de Python 3.13),
    # capturamos el error y deshabilitamos el analizador.
    print(f"❌ Error crítico: {str(e)}")
    print("⚠️ Analizador de sentimientos deshabilitado.")
    TRANSFORMERS_AVAILABLE = False
    ANALYZER_FAILURE = True

class SentimentAnalyzer:
    def __init__(self):
        self.analyzer = None
        if TRANSFORMERS_AVAILABLE:
            self.init_analyzer()
    
    def init_analyzer(self):
        global ANALYZER_FAILURE
        if not TRANSFORMERS_AVAILABLE:
            return
        if self.analyzer is None:
            try:
                device_id = 0 if torch.cuda.is_available() else -1
                print(f"Device set to use {'cuda' if device_id == 0 else 'cpu'}")
                self.analyzer = pipeline(
                    "text-classification",
                    model="finiteautomata/beto-sentiment-analysis",
                    device=device_id,
                    truncation=True
                )
                print("✅ Analizador de sentimientos inicializado correctamente")
            except Exception as e:
                print(f"❌ Error inicializando analizador: {e}")
                ANALYZER_FAILURE = True
                #raise RuntimeError("No se pudo inicializar el analizador de sentimientos")
                self.analyzer = None

    def analyze_text(self, texto):
        if ANALYZER_FAILURE or not TRANSFORMERS_AVAILABLE:
            # Devuelve un resultado neutral si el analizador falló
            return 'neutral', 0.5

        try:
            # Asegura la inicialización perezosa si no se hizo en __init__
            self.init_analyzer() 
            
            # Si self.analyzer sigue siendo None, devuelve neutral para evitar crasheo
            if self.analyzer is None:
                 return 'neutral', 0.5
                 
            resultado = self.analyzer(texto)[0]
            etiqueta_raw = resultado['label'].lower()
            score = float(resultado['score'])
            
            if etiqueta_raw in ['pos', 'positive']:
                # Normalización (ejemplo)
                normalized_score = 0.5 + (score * 0.5)
                return 'positivo', round(normalized_score, 2)
            elif etiqueta_raw in ['neg', 'negative']:
                # Normalización (ejemplo)
                normalized_score = score * 0.5
                return 'negativo', round(normalized_score, 2)
            else:
                return 'neutral', 0.5
        except Exception as e:
            print(f"Error en análisis con transformers: {str(e)}")
            return 'neutral', 0.5       
        
        '''try:
            resultado = self.analyzer(texto)[0]
            etiqueta_raw = resultado['label'].lower()
            score = float(resultado['score'])
            
            if etiqueta_raw in ['pos', 'positive']:
                normalized_score = 0.5 + (score * 0.5)
                return 'positivo', round(normalized_score, 2)
            elif etiqueta_raw in ['neg', 'negative']:
                normalized_score = score * 0.5
                return 'negativo', round(normalized_score, 2)
            else:
                return 'neutral', 0.5
        except Exception as e:
            print(f"Error en análisis con transformers: {str(e)}")
            return 'neutral', 0.5'''

if TRANSFORMERS_AVAILABLE:
    sentiment_analyzer = SentimentAnalyzer()
else:
    # Placeholder si la importación falló, para evitar el error 'NameError'
    sentiment_analyzer = SentimentAnalyzer() 