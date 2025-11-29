import sys
import re

try:
    from transformers import pipeline
    import torch
    TRANSFORMERS_AVAILABLE = True
    ANALYZER_FAILURE = False
except ImportError as e:
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
                
                # CAMBIO: Usar modelo multilingüe que soporta inglés y español
                self.analyzer = pipeline(
                    "text-classification",
                    model="nlptown/bert-base-multilingual-uncased-sentiment",  # MODELO MULTILINGÜE
                    device=device_id,
                    truncation=True
                )
                print("✅ Analizador de sentimientos MULTILINGÜE inicializado correctamente")
            except Exception as e:
                print(f"❌ Error inicializando analizador: {e}")
                ANALYZER_FAILURE = True
                self.analyzer = None

    def process_emojis(self, text):
        """Convierte emojis comunes a texto descriptivo para mejor análisis"""
        emoji_map = {
            '😊': 'feliz contento positivo sonriente',
            '😂': 'divertido risa gracioso positivo',
            '❤️': 'amor corazón positivo',
            '😍': 'encantado amor positivo enamorado',
            '🤩': 'impresionado asombroso positivo',
            '😎': 'genial cool positivo',
            '😔': 'triste desanimado negativo',
            '😢': 'triste llorar negativo',
            '😭': 'llorar tristeza negativo',
            '😠': 'enojado furioso negativo',
            '😡': 'furioso enojado negativo',
            '👍': 'bueno aprobar positivo',
            '👎': 'malo desaprobar negativo',
            '🎵': 'música canción melodia',
            '🎶': 'música melodía notas',
            '🎧': 'escuchar música audio',
            '🎤': 'cantar voz vocal',
            '🔥': 'excelente fuego caliente positivo',
            '💯': 'perfecto cien excelente positivo',
            '⭐': 'estrella favorito positivo',
            '🌟': 'brillante estrella positivo',
            '🙌': 'celebrar aprobar positivo',
            '👏': 'aplaudir felicitar positivo',
            '💔': 'corazón roto triste negativo',
            '😴': 'aburrido dormir negativo',
            '🤢': 'asqueado desagradable negativo',
            '🎉': 'celebrar fiesta positivo',
            '🤔': 'pensar cuestionar',
            '✨': 'magia brillante positivo',
            '💖': 'amor corazón positivo',
            '💕': 'amor cariño positivo',
            '🎶': 'música notas positivo',
            '🏆': 'ganador excelente positivo',
            '💫': 'magia asombroso positivo',
            '🤘': 'rock genial positivo',
            '🙏': 'rezar esperar',
            '🥰': 'amor feliz positivo',
            '😘': 'beso amor positivo',
            '🥺': 'suplicar tierno',
            '🤗': 'abrazo amor positivo',
            '🤭': 'tímido gracioso',
            '🤫': 'secreto callar',
            '🤥': 'mentira falso negativo',
            '😇': 'angel bueno positivo',
            '🥳': 'fiesta celebrar positivo',
            '😏': 'sarcástico confiado',
            '😌': 'aliviado tranquilo positivo',
            '😪': 'soñoliento cansado',
            '🤤': 'deseo antojo',
            '😷': 'enfermo médico',
            '🤒': 'enfermo fiebre negativo',
            '🤕': 'herido dolor negativo',
            '🤮': 'vomitar asqueado negativo',
            '🤯': 'sorprendido asombroso',
            '🥶': 'frío congelado',
            '🥵': 'calor sudor',
            '😳': 'avergonzado tímido',
            '🥴': 'mareado confundido',
            '😵': 'mareado aturdido',
            '😱': 'asustado terror negativo',
            '🤬': 'maldecir enojado negativo',
            '👻': 'fantasma divertido',
            '💀': 'muerte oscuro negativo',
            '👽': 'alien extraño',
            '🤖': 'robot tecnología'
        }
        
        for emoji, description in emoji_map.items():
            text = text.replace(emoji, f' {description} ')
        
        return text

    def detect_language(self, text):
        """Detección simple de idioma basada en caracteres"""
        # Contar caracteres en inglés vs español
        english_chars = len(re.findall(r'[a-zA-Z]', text))
        spanish_chars = len(re.findall(r'[áéíóúñÁÉÍÓÚÑ]', text))
        
        # Palabras comunes en inglés
        english_words = len(re.findall(r'\b(the|and|you|that|was|for|are|with|his|they|this|have|from|one|would|there|their|what|about|which|when|make|like|time|just|know|take|people|into|year|your|good|some|could|them|see|other|than|then|now|look|only|come|its|over|think|also|back|after|use|two|how|our|work|first|well|way|even|new|want|because|any|these|give|day|most|us)\b', text.lower()))
        
        # Palabras comunes en español
        spanish_words = len(re.findall(r'\b(el|la|de|que|y|en|un|ser|se|no|haber|por|con|su|para|como|estar|tener|le|lo|lo|todo|pero|más|hacer|o|poder|decir|este|ir|otro|ese|la|si|me|ya|ver|porque|dar|cuando|él|muy|sin|vez|mucho|saber|qué|sobre|mi|alguno|mismo|yo|también|hasta|año|dos|querer|entre|así|primero|desde|grande|eso|ni|nos|venir|pasado|llamar|quien|estar|nunca|siempre|trabajar|encontrar|casa|parte|tiempo|ella|ser|después|ir|cosa|hombre|parecer|nuestro|tan|donde|ahora|algo|entonces|mano|otros|aunque|esa|mujer|dar|vida|mil|parecer|forma|cosa|hacer|saber|agua|correr|parecer|tipo|ciudad|hecho|ojo|tierra|aquel|pensar|cabeza|querer|historia|pedir|esperar|año|claro|color|cara|dejar|hecho|lado|mundo|mientras|dejar|cada|trabajo|menos|noche|siempre|punto|empezar|aún|tal|cual|menos|tal|menos|seguir|hijo|mes|dinero|problema|acabar|luz|cambiar|sentir|dejar|llegar|importante|acabar|nacional|servir|gustar|jugar|estudio|trabajar|necesitar|vivir|sentir|tratar|recordar|terminar|permitir|considerar|esperar|aparecer|pertenecer|intentar|lograr|mantener|recibir|presentar|continuar|ocurrir|significar|mostrar|explicar|entender|conseguir|comenzar|seguir|dejar|encontrar|llamar|pensar|llevar|dejar|encontrar|poner|quedar|parecer|hablar|saber|dar|ver|hacer|ir|ser|tener|estar)\b', text.lower()))
        
        if english_chars > 0 and (spanish_chars == 0 or english_words > spanish_words):
            return 'en'
        return 'es'

    def analyze_text(self, texto):
        if ANALYZER_FAILURE or not TRANSFORMERS_AVAILABLE:
            return 'neutral', 0.5

        try:
            self.init_analyzer() 
            
            if self.analyzer is None:
                 return 'neutral', 0.5
            
            # PROCESAR EMOJIS ANTES DEL ANÁLISIS
            texto_procesado = self.process_emojis(texto)
            
            # DETECTAR IDIOMA (para logging)
            idioma = self.detect_language(texto)
            emojis_procesados = texto != texto_procesado
            
            print(f"🌐 Texto analizado - Idioma: {idioma}, Longitud: {len(texto)} chars, Emojis procesados: {emojis_procesados}")
            
            if emojis_procesados:
                print(f"📝 Texto original: {texto[:100]}...")
                print(f"🔤 Texto procesado: {texto_procesado[:100]}...")
            
            resultado = self.analyzer(texto_procesado)[0]
            etiqueta_raw = resultado['label'].lower()
            score = float(resultado['score'])
            
            print(f"🎭 Resultado crudo del modelo: {etiqueta_raw}, Score: {score}")
            
            # El modelo multilingüe usa ratings 1-5 estrellas
            if '5' in etiqueta_raw or '4' in etiqueta_raw:
                normalized_score = 0.5 + (score * 0.5)
                sentimiento = 'positivo'
            elif '1' in etiqueta_raw or '2' in etiqueta_raw:
                normalized_score = score * 0.5
                sentimiento = 'negativo'
            else:  # 3 estrellas
                normalized_score = 0.5
                sentimiento = 'neutral'
            
            print(f"✅ Sentimiento final: {sentimiento}, Puntuación normalizada: {normalized_score}")
            return sentimiento, round(normalized_score, 2)
                
        except Exception as e:
            print(f"❌ Error en análisis con transformers: {str(e)}")
            return 'neutral', 0.5

if TRANSFORMERS_AVAILABLE:
    sentiment_analyzer = SentimentAnalyzer()
else:
    sentiment_analyzer = SentimentAnalyzer()