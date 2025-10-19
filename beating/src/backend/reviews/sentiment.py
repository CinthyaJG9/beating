from transformers import pipeline
import torch

class SentimentAnalyzer:
    def __init__(self):
        self.analyzer = None
        self.init_analyzer()
    
    def init_analyzer(self):
        if self.analyzer is None:
            try:
                device_id = 0 if torch.cuda.is_available() else -1
                self.analyzer = pipeline(
                    "text-classification",
                    model="finiteautomata/beto-sentiment-analysis",
                    device=device_id,
                    truncation=True
                )
                print("✅ Analizador de sentimientos inicializado correctamente")
            except Exception as e:
                print(f"❌ Error inicializando analizador: {e}")
                raise RuntimeError("No se pudo inicializar el analizador de sentimientos")
    
    def analyze_text(self, texto):
        try:
            self.init_analyzer()
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
            return 'neutral', 0.5

# Instancia global del analizador
sentiment_analyzer = SentimentAnalyzer()