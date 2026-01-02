import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Sparkles, LogIn, AlertCircle, Loader2 } from 'lucide-react';

const LoginPage: React.FC = () => {
    const { signIn, loading } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [isSigningIn, setIsSigningIn] = useState(false);

    const handleGoogleSignIn = async () => {
        setError(null);
        setIsSigningIn(true);
        try {
            await signIn();
        } catch (err: any) {
            setError(err.message || 'Error al iniciar sesión');
            setIsSigningIn(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
                    <p className="text-white/70">Cargando...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center p-4">
            {/* Animated background effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-md">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
                    {/* Logo and Title */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-6 shadow-lg shadow-indigo-500/30">
                            <Sparkles className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">
                            FinanceAI Pro
                        </h1>
                        <p className="text-white/60">
                            Tu asistente financiero personal con IA
                        </p>
                    </div>

                    {/* Features List */}
                    <div className="space-y-3 mb-8">
                        {[
                            'Importa tus cartolas bancarias',
                            'Analiza tus gastos con IA',
                            'Planifica tu presupuesto 50/30/20',
                            'Proyecta tus ahorros'
                        ].map((feature, index) => (
                            <div key={index} className="flex items-center gap-3 text-white/80">
                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                                <span className="text-sm">{feature}</span>
                            </div>
                        ))}
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                            <p className="text-red-200 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Google Sign In Button */}
                    <button
                        onClick={handleGoogleSignIn}
                        disabled={isSigningIn}
                        className="w-full py-4 px-6 bg-white hover:bg-gray-100 disabled:bg-gray-200 rounded-xl font-medium text-gray-800 flex items-center justify-center gap-3 transition-all duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
                    >
                        {isSigningIn ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Conectando...</span>
                            </>
                        ) : (
                            <>
                                {/* Google Icon SVG */}
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path
                                        fill="#4285F4"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="#34A853"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="#FBBC05"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    />
                                    <path
                                        fill="#EA4335"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    />
                                </svg>
                                <span>Continuar con Google</span>
                            </>
                        )}
                    </button>

                    {/* Footer */}
                    <p className="text-center text-white/40 text-xs mt-6">
                        Al continuar, aceptas nuestros términos de servicio
                    </p>
                </div>

                {/* Bottom text */}
                <p className="text-center text-white/30 text-sm mt-6">
                    © 2024 FinanceAI Pro. Todos los derechos reservados.
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
