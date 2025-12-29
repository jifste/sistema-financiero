import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface FinancialContext {
    totalIncome: number;
    totalExpenses: number;
    transactions: Array<{
        description: string;
        amount: number;
        date: string;
        isIncome: boolean;
        expenseCategory?: string;
    }>;
    creditOperations: Array<{
        description: string;
        totalAmount: number;
        monthlyInstallment: number;
        pendingBalance: number;
        remainingInstallments: number;
    }>;
    subscriptions: Array<{
        description: string;
        monthlyAmount: number;
    }>;
    calendarTasks: Array<{
        date: string;
        description: string;
        type: string;
        completed: boolean;
    }>;
}

interface AIChatProps {
    financialContext: FinancialContext;
}

export const AIChat: React.FC<AIChatProps> = ({ financialContext }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: '¡Hola! 👋 Soy tu asistente financiero IA. Puedo ayudarte con:\n\n• Analizar tus gastos\n• Ver tus próximos pagos\n• Darte consejos de ahorro\n• Responder dudas sobre tus finanzas\n\n¿En qué puedo ayudarte hoy?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const buildSystemPrompt = () => {
        const pendingTasks = financialContext.calendarTasks.filter(t => !t.completed);
        const upcomingPayments = pendingTasks.filter(t => t.type === 'pago');

        return `Eres un asistente financiero amigable y profesional llamado "FinanceAI". Tu rol es ayudar al usuario con sus finanzas personales.

DATOS FINANCIEROS DEL USUARIO (actuales):
- Ingresos totales del mes: $${financialContext.totalIncome.toLocaleString('es-CL')}
- Gastos totales del mes: $${financialContext.totalExpenses.toLocaleString('es-CL')}
- Balance: $${(financialContext.totalIncome - financialContext.totalExpenses).toLocaleString('es-CL')}

TRANSACCIONES RECIENTES (últimas 10):
${financialContext.transactions.slice(0, 10).map(t =>
            `- ${t.description}: $${t.amount.toLocaleString('es-CL')} (${t.isIncome ? 'Ingreso' : 'Gasto'}${t.expenseCategory ? ', categoría: ' + t.expenseCategory : ''})`
        ).join('\n') || 'No hay transacciones'}

OPERACIONES A CRÉDITO ACTIVAS:
${financialContext.creditOperations.map(c =>
            `- ${c.description}: Cuota mensual $${c.monthlyInstallment.toLocaleString('es-CL')}, Saldo pendiente $${c.pendingBalance.toLocaleString('es-CL')}, Cuotas restantes: ${c.remainingInstallments}`
        ).join('\n') || 'No hay operaciones a crédito'}

SUSCRIPCIONES MENSUALES:
${financialContext.subscriptions.map(s =>
            `- ${s.description}: $${s.monthlyAmount.toLocaleString('es-CL')}/mes`
        ).join('\n') || 'No hay suscripciones'}

PAGOS PRÓXIMOS (calendario):
${upcomingPayments.map(t =>
            `- ${t.date}: ${t.description} (${t.completed ? 'Completado' : 'Pendiente'})`
        ).join('\n') || 'No hay pagos programados'}

INSTRUCCIONES:
1. Responde siempre en español chileno
2. Usa los datos del usuario para dar respuestas personalizadas
3. Si no tienes datos suficientes, sugiere al usuario que agregue información
4. Da consejos prácticos y accionables
5. Usa emojis ocasionalmente para hacer la conversación más amigable
6. Si te preguntan sobre algo que no puedes saber (como el futuro), sé honesto
7. Mantén las respuestas concisas pero informativas`;
    };

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) {
                throw new Error('API key no configurada');
            }

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

            // Build the full prompt with context and conversation history
            const systemPrompt = buildSystemPrompt();

            // Get only user messages for context (excluding welcome message)
            const conversationHistory = messages
                .filter((_, index) => index > 0) // Skip welcome message
                .map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`)
                .join('\n');

            const fullPrompt = `${systemPrompt}

${conversationHistory ? `CONVERSACIÓN PREVIA:\n${conversationHistory}\n` : ''}
Usuario: ${userMessage}

Responde como el asistente financiero:`;

            const result = await model.generateContent(fullPrompt);
            const response = result.response.text();

            setMessages(prev => [...prev, { role: 'assistant', content: response }]);
        } catch (error) {
            console.error('Error al enviar mensaje:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '❌ Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all z-50 ${isOpen ? 'bg-slate-700 rotate-90' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:scale-110'
                    }`}
            >
                {isOpen ? (
                    <X size={24} className="text-white" />
                ) : (
                    <Bot size={24} className="text-white" />
                )}
            </button>

            {/* Chat Panel */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-40 overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            <Bot size={24} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white">FinanceAI Assistant</h3>
                            <p className="text-xs text-white/70">Tu asistente financiero personal</p>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={`flex gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.role === 'user' ? 'bg-indigo-600' : 'bg-gradient-to-r from-indigo-600 to-purple-600'
                                    }`}>
                                    {message.role === 'user' ? (
                                        <User size={16} className="text-white" />
                                    ) : (
                                        <Bot size={16} className="text-white" />
                                    )}
                                </div>
                                <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${message.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-tr-none'
                                    : 'bg-white text-slate-700 rounded-tl-none shadow-sm border border-slate-100'
                                    }`}>
                                    <p className="whitespace-pre-wrap">{message.content}</p>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                                    <Bot size={16} className="text-white" />
                                </div>
                                <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-slate-100">
                                    <Loader2 size={20} className="text-indigo-600 animate-spin" />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 bg-white border-t border-slate-100">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Escribe tu pregunta..."
                                className="flex-1 px-4 py-2 bg-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                disabled={isLoading}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={isLoading || !input.trim()}
                                className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
