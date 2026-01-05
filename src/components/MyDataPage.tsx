import React, { useState, useEffect } from 'react';
import { User, Save, Shield, MapPin, Phone, Mail, Briefcase, Calendar, CreditCard, Loader2 } from 'lucide-react';
import { UserData, UserProfile, saveUserData } from '../services/supabaseData';

interface MyDataPageProps {
    userData: UserData;
    setUserData: React.Dispatch<React.SetStateAction<UserData>>;
    userId: string | undefined;
}

export const MyDataPage: React.FC<MyDataPageProps> = ({ userData, setUserData, userId }) => {
    const [profile, setProfile] = useState<UserProfile>({
        rut: '',
        fullName: '',
        email: '',
        phone: '',
        address: '',
        profession: '',
        birthDate: ''
    });

    const [isSavings, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    // Load profile from userData on mount
    useEffect(() => {
        if (userData.profile) {
            setProfile(userData.profile);
        } else {
            // If no profile object but userName exists, prepopulate name
            setProfile(prev => ({ ...prev, fullName: userData.userName || '' }));
        }
    }, [userData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (!userId) return;

        setIsSaving(true);
        setSaveMessage(null);

        try {
            // Update local state first
            const updatedUserData = { ...userData, profile, userName: profile.fullName };
            setUserData(updatedUserData);

            // Save to cloud/local
            const success = await saveUserData(userId, updatedUserData);

            if (success) {
                setSaveMessage('✅ Datos guardados correctamente en la nube');
            } else {
                setSaveMessage('⚠️ Guardado localmente (sin conexión a nube)');
            }
        } catch (error) {
            console.error('Error saving profile:', error);
            setSaveMessage('❌ Error al guardar');
        } finally {
            setIsSaving(false);
            setTimeout(() => setSaveMessage(null), 3000);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-24">

            {/* Header Banner */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <User size={120} />
                </div>
                <div className="relative z-10">
                    <h2 className="text-3xl font-bold mb-2">Mis Datos Personales</h2>
                    <p className="text-indigo-100 max-w-xl">
                        Mantén tu información actualizada para una mejor experiencia. Tus datos están protegidos bajo la Ley de Privacidad 21.719.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Card: Identificación */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 col-span-1 md:col-span-2">
                    <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                        <User className="text-indigo-500" size={24} />
                        <h3 className="text-lg font-bold text-slate-800">Identificación</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Nombre Completo</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    name="fullName"
                                    value={profile.fullName}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                                    placeholder="Tu nombre real"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">RUT / DNI</label>
                            <div className="relative">
                                <CreditCard className="absolute left-3 top-3 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    name="rut"
                                    value={profile.rut}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                                    placeholder="12.345.678-9"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Fecha de Nacimiento</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-3 text-slate-400" size={18} />
                                <input
                                    type="date"
                                    name="birthDate"
                                    value={profile.birthDate}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Profesión / Ocupación</label>
                            <div className="relative">
                                <Briefcase className="absolute left-3 top-3 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    name="profession"
                                    value={profile.profession}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                                    placeholder="Ej: Arquitecto"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Card: Contacto */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                        <Phone className="text-green-500" size={24} />
                        <h3 className="text-lg font-bold text-slate-800">Contacto</h3>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                                <input
                                    type="email"
                                    name="email"
                                    value={profile.email}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                                    placeholder="nombre@ejemplo.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Teléfono</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3 text-slate-400" size={18} />
                                <input
                                    type="tel"
                                    name="phone"
                                    value={profile.phone}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                                    placeholder="+56 9 1234 5678"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Dirección</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    name="address"
                                    value={profile.address}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                                    placeholder="Calle, Número, Comuna"
                                />
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Save Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 flex items-center justify-between z-40 md:static md:bg-transparent md:border-0 md:p-0 md:flex-row-reverse">
                <button
                    onClick={handleSave}
                    disabled={isSavings}
                    className="w-full md:w-auto px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isSavings ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                    {isSavings ? 'Guardando...' : 'Guardar Cambios'}
                </button>

                <div className="hidden md:flex items-center gap-2 text-slate-500 text-sm">
                    <Shield size={16} />
                    <span>Información encriptada y segura</span>
                </div>
            </div>

            {/* Save Message Toast */}
            {saveMessage && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 bg-slate-800 text-white rounded-full shadow-2xl flex items-center gap-2 animate-bounce z-50">
                    <span>{saveMessage}</span>
                </div>
            )}

        </div>
    );
};
