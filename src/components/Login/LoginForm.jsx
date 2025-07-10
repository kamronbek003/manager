import React, { useState, useCallback } from 'react';
import { apiRequest } from '../../utils/api'; 
import ErrorMessage from '../Essential/ErrorMessage'; 

const LoginForm = ({ onLoginSuccess }) => {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const platformName = "LIFE EDUCATION"; 

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const data = await apiRequest('/auth/admin', 'POST', { phone, password });
            if (data && data.accessToken) {
                if (onLoginSuccess && typeof onLoginSuccess === 'function') {
                    onLoginSuccess(data.accessToken);
                } else {
                    console.warn("onLoginSuccess funksiya emas yoki taqdim etilmagan.");
                }
            } else {
                console.warn("Login javob ma'lumotlari:", data);
                throw new Error('Login muvaffaqiyatsiz: Token olinmadi.');
            }
        } catch (err) {
            setError(err.message || 'Login amalga oshmadi.');
            console.error("Login xatolik tafsilotlari:", err.originalError || err);
        } finally {
            setLoading(false);
        }
    }, [phone, password, onLoginSuccess]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200 p-4">
            <div className="bg-white p-8 sm:p-10 rounded-xl shadow-2xl w-full max-w-md">
                {/* Platforma Nomi Ko'rsatish */}
                <div className="text-center mb-6">
                    {/* Platforma logotipi yoki nomi uchun joy */}
                    <h1 className="text-3xl font-semibold text-indigo-600">{platformName}</h1>
                </div>

                <h2 className="text-3xl font-bold mb-8 text-center text-gray-800">Tizimga kirish</h2>
                {error && <ErrorMessage message={error} />}
                <form onSubmit={handleSubmit}>
                    {/* Telefon Raqami Maydoni */}
                    <div className="mb-5">
                        <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="phone">
                            Telefon raqami
                        </label>
                        <input
                            className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none transition duration-150 ease-in-out" 
                            id="phone"
                            type="text"
                            placeholder="Telefon raqamingiz"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                            aria-required="true"
                        />
                    </div>

                    {/* Parol Maydoni */}
                    <div className="mb-8">
                        <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="password">
                            Parol
                        </label>
                        <input
                            className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-3 px-4 text-gray-700 mb-3 leading-tight focus:outline-none transition duration-150 ease-in-out"
                            id="password"
                            type="password"
                            placeholder="Parolingiz"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            aria-required="true"
                        />
                    </div>

                    {/* Yuborish Tugmasi */}
                    <div className="flex items-center justify-between">
                        <button
                            className={`w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-300 ease-in-out transform hover:-translate-y-px ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            type="submit"
                            disabled={loading}
                            aria-busy={loading}
                        >
                            {loading ? 'Kirilmoqda...' : 'Kirish'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginForm;
