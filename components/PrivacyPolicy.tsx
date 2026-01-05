import React from 'react';
import { Shield, Lock, Eye, FileText, ChevronLeft, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PrivacyPolicy: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors">
                        <ChevronLeft size={20} />
                        <span className="font-medium">Volver a la App</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <Shield className="text-indigo-600" size={24} />
                        <h1 className="text-xl font-bold text-slate-900">FinanceAI Pro</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-12">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12">

                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">Política de Privacidad</h2>
                        <p className="text-slate-500">
                            Última actualización: {new Date().toLocaleDateString('es-CL')}
                        </p>
                    </div>

                    <div className="prose prose-slate max-w-none space-y-8">
                        <section>
                            <h3 className="flex items-center gap-2 text-xl font-bold text-slate-800 mb-4">
                                <Shield className="text-indigo-500" size={24} />
                                1. Responsable del Tratamiento
                            </h3>
                            <p className="text-slate-600 leading-relaxed">
                                En cumplimiento de la <strong>Ley N° 21.719 sobre Protección de Datos Personales</strong>, te informamos que los datos personales que facilites a través de <strong>FinanceAI Pro</strong> serán tratados bajo la responsabilidad del equipo de desarrollo de FinanceAI Pro.
                            </p>
                        </section>

                        <section>
                            <h3 className="flex items-center gap-2 text-xl font-bold text-slate-800 mb-4">
                                <FileText className="text-indigo-500" size={24} />
                                2. Datos que Recopilamos
                            </h3>
                            <p className="text-slate-600 mb-2">Para el funcionamiento de la aplicación, tratamos las siguientes categorías de datos:</p>
                            <ul className="list-disc pl-5 space-y-2 text-slate-600">
                                <li><strong>Datos de Identificación:</strong> Nombre, correo electrónico, RUT/DNI, teléfono, dirección, fecha de nacimiento y profesión (proporcionados voluntariamente en "Mis Datos").</li>
                                <li><strong>Datos Financieros:</strong> Transacciones, montos, categorías, operaciones de crédito y proyecciones de ahorro.</li>
                                <li><strong>Datos de Uso:</strong> Preferencias de configuración y ajustes de la aplicación.</li>
                            </ul>
                        </section>

                        <section>
                            <h3 className="flex items-center gap-2 text-xl font-bold text-slate-800 mb-4">
                                <Eye className="text-indigo-500" size={24} />
                                3. Finalidad del Tratamiento
                            </h3>
                            <p className="text-slate-600">Tus datos se utilizan exclusivamente para:</p>
                            <ul className="list-disc pl-5 space-y-2 text-slate-600 mt-2">
                                <li>Proporcionarte visualizaciones y análisis de tus finanzas personales.</li>
                                <li>Permitir el respaldo y sincronización de tu información en la nube.</li>
                                <li>Mejorar tu experiencia de usuario mediante configuraciones personalizadas.</li>
                            </ul>
                            <div className="bg-indigo-50 p-4 rounded-xl mt-4 border border-indigo-100">
                                <p className="text-indigo-800 text-sm font-medium">
                                    <strong>Importante:</strong> No vendemos, arrendamos ni compartimos tus datos con terceros para fines publicitarios.
                                </p>
                            </div>
                        </section>

                        <section>
                            <h3 className="flex items-center gap-2 text-xl font-bold text-slate-800 mb-4">
                                <Lock className="text-indigo-500" size={24} />
                                4. Tus Derechos (Ley 21.719)
                            </h3>
                            <p className="text-slate-600">Como titular de tus datos, tienes derecho a:</p>
                            <ul className="list-disc pl-5 space-y-2 text-slate-600 mt-2">
                                <li><strong>Acceso:</strong> Saber qué datos tenemos de ti (disponible en la app).</li>
                                <li><strong>Rectificación:</strong> Corregir datos inexactos.</li>
                                <li><strong>Supresión (Olvido):</strong> Eliminar tu cuenta y todos tus datos (disponible en Configuración → Zona de Peligro).</li>
                                <li><strong>Portabilidad:</strong> Descargar una copia de todos tus datos (disponible en Configuración → Privacidad).</li>
                            </ul>
                        </section>

                        <section className="pt-8 border-t border-slate-100">
                            <h3 className="flex items-center gap-2 text-xl font-bold text-slate-800 mb-4">
                                <Mail className="text-indigo-500" size={24} />
                                5. Contacto
                            </h3>
                            <p className="text-slate-600">
                                Si tienes dudas sobre esta política o el tratamiento de tus datos, contáctanos a través del formulario de Sugerencias en la aplicación.
                            </p>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
};
