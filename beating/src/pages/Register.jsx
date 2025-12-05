// src/pages/Register.jsx
import { Button } from "./../components/ui/button";
import { Input } from "../components/ui/input";
import { X, Music, Heart, Shield, BookOpen, Eye, EyeOff, CheckCircle } from "lucide-react";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../pages/AuthContext";

export default function Register({ onClose, onSwitchToLogin }) {
  const [form, setForm] = useState({
    nombre_usuario: "",
    correo: "",
    contrasena: "",
    confirmarContrasena: "",
    aceptaTerminos: false,
  });

  const [mensaje, setMensaje] = useState("");
  const [mostrarTerminos, setMostrarTerminos] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const { login } = useAuth();

  // Validar fortaleza de contraseña
  const checkPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  // Validaciones en tiempo real
  useEffect(() => {
    const newErrors = {};
    
    // Validar nombre de usuario
    if (form.nombre_usuario && !/^[a-zA-Z0-9_]{3,20}$/.test(form.nombre_usuario)) {
      newErrors.nombre_usuario = "Solo letras, números y guiones bajos (3-20 caracteres)";
    }
    
    // Validar email
    if (form.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) {
      newErrors.correo = "Formato de email inválido";
    }
    
    // Validar contraseña
    if (form.contrasena) {
      const strength = checkPasswordStrength(form.contrasena);
      setPasswordStrength(strength);
      
      if (form.contrasena.length < 8) {
        newErrors.contrasena = "Mínimo 8 caracteres";
      } else if (strength < 3) {
        newErrors.contrasena = "Contraseña demasiado débil";
      }
    }
    
    // Validar confirmación
    if (form.confirmarContrasena && form.contrasena !== form.confirmarContrasena) {
      newErrors.confirmarContrasena = "Las contraseñas no coinciden";
    }
    
    setErrors(newErrors);
  }, [form]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  // Validación antes de enviar
  const validateForm = () => {
    const newErrors = {};
    
    if (!form.nombre_usuario.trim()) {
      newErrors.nombre_usuario = "Nombre de usuario requerido";
    } else if (!/^[a-zA-Z0-9_]{3,20}$/.test(form.nombre_usuario)) {
      newErrors.nombre_usuario = "Formato inválido (3-20 caracteres, solo letras, números y _)";
    }
    
    if (!form.correo.trim()) {
      newErrors.correo = "Email requerido";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) {
      newErrors.correo = "Email inválido";
    }
    
    if (!form.contrasena) {
      newErrors.contrasena = "Contraseña requerida";
    } else if (form.contrasena.length < 8) {
      newErrors.contrasena = "Mínimo 8 caracteres";
    } else if (checkPasswordStrength(form.contrasena) < 3) {
      newErrors.contrasena = "Contraseña demasiado débil";
    }
    
    if (!form.confirmarContrasena) {
      newErrors.confirmarContrasena = "Confirma tu contraseña";
    } else if (form.contrasena !== form.confirmarContrasena) {
      newErrors.confirmarContrasena = "Las contraseñas no coinciden";
    }
    
    if (!form.aceptaTerminos) {
      newErrors.aceptaTerminos = "Debes aceptar los términos y condiciones";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);

    try {
      // Sanitizar datos antes de enviar
      const sanitizedData = {
        nombre_usuario: form.nombre_usuario.trim(),
        correo: form.correo.trim().toLowerCase(),
        contrasena: form.contrasena
      };

      const res = await axios.post("http://localhost:5000/register", sanitizedData);

      // ✅ OBTENER TOKEN Y USER QUE REGRESA EL BACKEND
      const { token, user } = res.data;

      // ✅ INICIAR SESIÓN AUTOMÁTICAMENTE
      login(token, {
        id: user.id,
        username: user.nombre_usuario || user.username,
        email: user.correo || user.email
      });

      setMensaje("✅ Registro exitoso! Redirigiendo...");

      setTimeout(() => {
        onClose();
        window.location.href = "/resenas"; // O navigate('/resenas')
      }, 1200);

    } catch (err) {
      if (err.response) {
        setMensaje("❌ Error: " + err.response.data.error);
      } else {
        setMensaje("❌ Error en el servidor.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Indicador de fortaleza de contraseña
  const PasswordStrengthIndicator = () => {
    const strengthLabels = ["Muy débil", "Débil", "Media", "Fuerte", "Muy fuerte"];
    const strengthColors = [
      "bg-red-500",
      "bg-orange-500",
      "bg-yellow-500",
      "bg-lime-500",
      "bg-green-500"
    ];
    
    return (
      <div className="mt-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">Fortaleza:</span>
          <span className={`font-medium ${
            passwordStrength >= 4 ? "text-green-400" :
            passwordStrength >= 3 ? "text-yellow-400" :
            "text-red-400"
          }`}>
            {strengthLabels[passwordStrength] || "Muy débil"}
          </span>
        </div>
        <div className="h-1 w-full bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${strengthColors[passwordStrength] || "bg-red-500"}`}
            style={{ width: `${(passwordStrength / 5) * 100}%` }}
          />
        </div>
        <ul className="text-xs text-gray-400 mt-2 space-y-1">
          <li className={`flex items-center gap-1 ${form.contrasena.length >= 8 ? "text-green-400" : ""}`}>
            <CheckCircle className="h-3 w-3" />
            Mínimo 8 caracteres
          </li>
          <li className={`flex items-center gap-1 ${/[A-Z]/.test(form.contrasena) ? "text-green-400" : ""}`}>
            <CheckCircle className="h-3 w-3" />
            Una letra mayúscula
          </li>
          <li className={`flex items-center gap-1 ${/[0-9]/.test(form.contrasena) ? "text-green-400" : ""}`}>
            <CheckCircle className="h-3 w-3" />
            Un número
          </li>
        </ul>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

      <div className="relative bg-[#1e1626]/95 border border-purple-500/30 rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl shadow-purple-500/10">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Music className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl text-white font-bold">Únete a Beating</h2>
            <p className="text-gray-400 text-sm mt-2">Descubre la música a través de tus emociones</p>
          </div>

          {mensaje && (
            <div
              className={`text-sm text-center py-2 px-3 rounded-lg ${
                mensaje.includes("✅")
                  ? "text-green-400 bg-green-400/10 border border-green-400/20"
                  : "text-red-400 bg-red-400/10 border border-red-400/20"
              }`}
            >
              {mensaje}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-white block text-sm font-medium">Nombre de Usuario</label>
              <Input
                type="text"
                name="nombre_usuario"
                value={form.nombre_usuario}
                onChange={handleChange}
                className={`bg-gray-800/50 border-gray-600 text-white h-12 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 ${
                  errors.nombre_usuario ? "border-red-500 focus:ring-red-500" : ""
                }`}
                placeholder="Tu nombre de usuario"
                required
                disabled={isSubmitting}
              />
              {errors.nombre_usuario && (
                <p className="text-red-400 text-xs mt-1">{errors.nombre_usuario}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-white block text-sm font-medium">Correo Electrónico</label>
              <Input
                type="email"
                name="correo"
                value={form.correo}
                onChange={handleChange}
                className={`bg-gray-800/50 border-gray-600 text-white h-12 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 ${
                  errors.correo ? "border-red-500 focus:ring-red-500" : ""
                }`}
                placeholder="tu@email.com"
                required
                disabled={isSubmitting}
              />
              {errors.correo && (
                <p className="text-red-400 text-xs mt-1">{errors.correo}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-white block text-sm font-medium">Contraseña</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  name="contrasena"
                  value={form.contrasena}
                  onChange={handleChange}
                  className={`bg-gray-800/50 border-gray-600 text-white h-12 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 pr-10 ${
                    errors.contrasena ? "border-red-500 focus:ring-red-500" : ""
                  }`}
                  placeholder="••••••••"
                  required
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.contrasena ? (
                <p className="text-red-400 text-xs mt-1">{errors.contrasena}</p>
              ) : (
                form.contrasena && <PasswordStrengthIndicator />
              )}
            </div>

            <div className="space-y-2">
              <label className="text-white block text-sm font-medium">Confirmar Contraseña</label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmarContrasena"
                  value={form.confirmarContrasena}
                  onChange={handleChange}
                  className={`bg-gray-800/50 border-gray-600 text-white h-12 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 pr-10 ${
                    errors.confirmarContrasena ? "border-red-500 focus:ring-red-500" : ""
                  }`}
                  placeholder="••••••••"
                  required
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmarContrasena && (
                <p className="text-red-400 text-xs mt-1">{errors.confirmarContrasena}</p>
              )}
              {form.confirmarContrasena && form.contrasena === form.confirmarContrasena && !errors.confirmarContrasena && (
                <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Las contraseñas coinciden
                </p>
              )}
            </div>

            {/* Checkbox de términos */}
            <div className={`flex items-start gap-3 p-3 rounded-lg border ${
              errors.aceptaTerminos 
                ? "bg-red-500/10 border-red-500/30" 
                : "bg-purple-500/10 border-purple-500/20"
            }`}>
              <input
                type="checkbox"
                name="aceptaTerminos"
                checked={form.aceptaTerminos}
                onChange={handleChange}
                className="mt-0.5 h-4 w-4 rounded border-gray-600 bg-gray-800 focus:ring-purple-500 text-purple-500 disabled:opacity-50"
                disabled={isSubmitting}
              />
              <div>
                <p className="text-gray-300 text-sm">
                  Acepto los{" "}
                  <button
                    type="button"
                    className="text-purple-400 hover:text-purple-300 font-medium underline transition-colors"
                    onClick={() => setMostrarTerminos(true)}
                    disabled={isSubmitting}
                  >
                    Términos y Condiciones
                  </button>
                </p>
                {errors.aceptaTerminos && (
                  <p className="text-red-400 text-xs mt-1">{errors.aceptaTerminos}</p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-12 font-semibold text-lg transition-all shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || Object.keys(errors).length > 0}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creando cuenta...
                </>
              ) : (
                "Crear Cuenta"
              )}
            </Button>
          </form>

          <div className="text-center pt-4 border-t border-gray-700/50">
            <span className="text-gray-400 text-sm">
              ¿Ya tienes cuenta?{" "}
              <button
                onClick={onSwitchToLogin}
                className="text-purple-400 hover:text-purple-300 font-medium underline transition-colors disabled:opacity-50"
                disabled={isSubmitting}
              >
                Inicia sesión aquí
              </button>
            </span>
          </div>
        </div>
      </div>

      {/* Modal de Términos Mejorado */}
      {mostrarTerminos && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMostrarTerminos(false)}
          />

          <div className="relative bg-[#1e1626] border border-purple-500/30 rounded-2xl p-6 w-full max-w-4xl mx-4 shadow-2xl shadow-purple-500/10 overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setMostrarTerminos(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors z-10"
            >
              <X className="h-6 w-6" />
            </button>

            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Términos y Condiciones
              </h2>
              <p className="text-gray-400 mt-2">Última actualización: {new Date().toLocaleDateString()}</p>
            </div>

            <div className="grid gap-6 text-gray-300">
              {/* Sección 1 */}
              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <div className="flex items-center gap-3 mb-4">
                  <Music className="h-5 w-5 text-purple-400" />
                  <h3 className="text-xl font-semibold text-white">1. Sobre Beating</h3>
                </div>
                <div className="space-y-3 text-sm leading-relaxed">
                  <p>Beating es una aplicación académica desarrollada con fines educativos cuyo objetivo es analizar canciones, reseñas y emociones para generar visualizaciones personalizadas y experiencias interactivas relacionadas con la música.</p>
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                    <p className="text-yellow-300 text-sm"><strong>Importante:</strong> Beating no es un servicio médico, psicológico ni terapéutico. Las interpretaciones generadas son aproximaciones basadas en modelos de IA y no sustituyen la opinión profesional de un especialista.</p>
                  </div>
                </div>
              </div>

              {/* Sección 2 */}
              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="h-5 w-5 text-purple-400" />
                  <h3 className="text-xl font-semibold text-white">2. Uso de la Plataforma</h3>
                </div>
                <div className="space-y-3 text-sm leading-relaxed">
                  <p>Al registrarte o usar Beating aceptas:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Proporcionar información verdadera para tu cuenta</li>
                    <li>No utilizar la plataforma para actividades ilegales o dañinas</li>
                    <li>No intentar manipular el sistema, sus modelos o su infraestructura</li>
                    <li>Que este es un proyecto en desarrollo, por lo que pueden existir errores, cambios frecuentes y funciones experimentales</li>
                  </ul>
                </div>
              </div>

              {/* Sección 3 */}
              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-semibold text-white mb-4">3. Contenido Generado por el Usuario</h3>
                <div className="space-y-3 text-sm leading-relaxed">
                  <p>Toda reseña que escribas dentro de la plataforma:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Es procesada por modelos de Inteligencia Artificial para análisis de sentimiento</li>
                    <li>Puede influir en el algoritmo que genera playlists personalizadas o recomendaciones</li>
                    <li>Es únicamente para fines de análisis dentro de Beating</li>
                    <li>No se comparte con terceros</li>
                  </ul>
                  <p className="text-purple-300 font-medium">Al escribir una reseña, declaras que tienes derecho a ese texto y que no infringe derechos de terceros.</p>
                </div>
              </div>

              {/* Sección 4 */}
              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <div className="flex items-center gap-3 mb-4">
                  <Heart className="h-5 w-5 text-purple-400" />
                  <h3 className="text-xl font-semibold text-white">4. Análisis de Sentimiento y Datos Sensibles</h3>
                </div>
                <div className="space-y-3 text-sm leading-relaxed">
                  <p>El análisis automático de emociones puede implicar procesar información personal o sensible contenida en tus textos.</p>
                  <p>Al usar Beating, aceptas que:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Tus textos serán procesados por modelos de IA exclusivamente con fines académicos</li>
                    <li>La aplicación no almacena etiquetas emocionales con tu identidad más allá de lo necesario para mostrar resultados dentro de tu cuenta</li>
                    <li>Puedes solicitar la eliminación de tus reseñas desde la misma plataforma</li>
                  </ul>
                </div>
              </div>

              {/* Sección 5 */}
              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-semibold text-white mb-4">5. Integración con Spotify</h3>
                <div className="space-y-3 text-sm leading-relaxed">
                  <p>Beating utiliza la Spotify Web API, lo cual permite:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Visualizar canciones, artistas o álbumes</li>
                    <li>Reproducir canciones o álbumes dentro de Spotify</li>
                    <li>Generar enlaces que abren directamente contenido en Spotify</li>
                  </ul>
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                    <p className="text-blue-300 text-sm"><strong>Importante:</strong> Beating no almacena tu contraseña de Spotify ni obtiene acceso completo a tu cuenta. Solo se usan los permisos estrictamente necesarios para búsqueda, reproducción y obtención de metadatos.</p>
                  </div>
                </div>
              </div>

              {/* Sección 6 */}
              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-semibold text-white mb-4">6. Privacidad y Manejo de Datos</h3>
                <div className="space-y-3 text-sm leading-relaxed">
                  <p>Beating recopila y usa:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Nombre de usuario y correo</li>
                    <li>Reseñas escritas dentro de la plataforma</li>
                    <li>Preferencias musicales derivadas de tus interacciones</li>
                    <li>Información mínima técnica (como logs del servidor)</li>
                  </ul>
                  <p className="text-green-300 font-medium">Beating no vende, comparte ni comercializa datos. Toda la información se usa únicamente para funcionamiento interno y desarrollo académico.</p>
                </div>
              </div>

              {/* Sección 7-9 */}
              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-semibold text-white mb-4">7-9. Responsabilidad y Aceptación</h3>
                <div className="space-y-4 text-sm leading-relaxed">
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <p className="text-red-300 text-sm"><strong>Limitación de responsabilidad:</strong> Beating no se responsabiliza por decisiones tomadas a partir de análisis emocionales o problemas derivados de servicios externos como Spotify.</p>
                  </div>
                  <p><strong>Estado académico:</strong> Beating es un proyecto en desarrollo con fines educativos. Las funciones, modelos, interfaz y análisis pueden cambiar sin previo aviso.</p>
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                    <p className="text-purple-300 font-semibold">Al registrarte confirmas que leíste estos Términos y Condiciones, aceptas el análisis automatizado de tus textos y das tu consentimiento informado para el análisis emocional.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center mt-8 pt-6 border-t border-gray-700/50">
              <Button
                onClick={() => {
                  setMostrarTerminos(false);
                  setForm({ ...form, aceptaTerminos: true });
                }}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-purple-500/25"
              >
                Aceptar y Continuar
              </Button>
              <p className="text-gray-400 text-sm mt-3">
                Al hacer clic en "Aceptar y Continuar", confirmas que has leído y aceptas nuestros términos.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}