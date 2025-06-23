import React, { useState, useEffect, useCallback } from 'react';
import { Users, Group, BookUser, TrendingUp, AlertCircle, LineChart as LineChartIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios'; 

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000'; 

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

const apiRequest = async (url, method = 'GET', payload = null, token = null) => {
  console.log(`Real API Request: ${method} ${API_BASE_URL}${url}`, { payload, token });
  try {
    const config = {
      method,
      url, 
    };

    if (token) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`,
      };
    }

    if (payload) {
      if (method.toUpperCase() === 'GET') {
        config.params = payload; 
      } else {
        config.data = payload; 
      }
    }

    const response = await apiClient(config);
    return response.data; 
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || "API so'rovida noma'lum xatolik yuz berdi.";
    const statusCode = error.response?.status;
    console.error('API Request Error:', { 
        message: errorMessage, 
        statusCode, 
        originalError: error.response || error.message
    });
    throw { message: errorMessage, originalError: error, statusCode };
  }
};


const LoadingSpinner = ({ text = "Yuklanmoqda..." }) => (
    <div className="flex flex-col items-center justify-center space-y-2 my-4 p-4">
        <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce"></div>
        </div>
        <span className="text-gray-600 text-sm">{text}</span>
    </div>
);

const ErrorMessage = ({ message, onRetry }) => (
    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 my-4 rounded-md" role="alert">
        <div className="flex">
            <div className="py-1"><AlertCircle className="h-6 w-6 text-red-500 mr-3" /></div>
            <div>
                <p className="font-bold">Xatolik</p>
                <p className="text-sm">{message || "Noma'lum xatolik yuz berdi."}</p>
                {onRetry && (
                    <button 
                        onClick={onRetry}
                        className="mt-2 px-3 py-1 bg-red-500 text-white text-xs font-semibold rounded hover:bg-red-600 transition-colors"
                    >
                        Qayta urinish
                    </button>
                )}
            </div>
        </div>
    </div>
);

const formatCurrency = (amount, currency = 'UZS') => {
    if (amount === null || amount === undefined || isNaN(parseFloat(String(amount)))) return '-';
    return new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: currency, minimumFractionDigits: 0, maximumFractionDigits:0 }).format(parseFloat(String(amount)));
};

const StatCard = ({ title, value, previousValue, icon: Icon, color = 'blue', loading, error, unit = '' }) => {
    const colorSchemes = {
        blue: { lightBg: 'bg-blue-50', darkBg: 'bg-blue-100', text: 'text-blue-700', iconColor: 'text-blue-600', gradientFrom: 'from-blue-500', gradientTo: 'to-blue-600' },
        indigo: { lightBg: 'bg-indigo-50', darkBg: 'bg-indigo-100', text: 'text-indigo-700', iconColor: 'text-indigo-600', gradientFrom: 'from-indigo-500', gradientTo: 'to-indigo-600' },
        purple: { lightBg: 'bg-purple-50', darkBg: 'bg-purple-100', text: 'text-purple-700', iconColor: 'text-purple-600', gradientFrom: 'from-purple-500', gradientTo: 'to-purple-600' },
        green: { lightBg: 'bg-green-50', darkBg: 'bg-green-100', text: 'text-green-700', iconColor: 'text-green-600', gradientFrom: 'from-green-500', gradientTo: 'to-green-600' },
    };
    const scheme = colorSchemes[color] || colorSchemes['blue'];

    let trendIcon = null;
    let trendColor = 'text-gray-500';
    let percentageChange = 0;

    const numericValue = parseFloat(String(value));
    const numericPreviousValue = parseFloat(String(previousValue));

    if (typeof numericValue === 'number' && typeof numericPreviousValue === 'number' && !isNaN(numericValue) && !isNaN(numericPreviousValue) && numericPreviousValue !== 0) {
        percentageChange = ((numericValue - numericPreviousValue) / numericPreviousValue) * 100;
        if (percentageChange > 0) {
            trendIcon = <ArrowUpRight size={16} className="ml-1" />;
            trendColor = 'text-green-500';
        } else if (percentageChange < 0) {
            trendIcon = <ArrowDownRight size={16} className="ml-1" />;
            trendColor = 'text-red-500';
        }
    }
    
    const displayValue = typeof numericValue === 'number' && !isNaN(numericValue) ? (unit === 'UZS' ? formatCurrency(numericValue) : numericValue) : (value ?? '-');

    return (
        <div className={`relative rounded-xl shadow-lg p-5 transition-all duration-300 ease-in-out transform hover:scale-[1.03] hover:shadow-xl bg-white border border-gray-200`}>
            <div className="flex items-center justify-between mb-3">
                <p className={`text-sm font-semibold ${scheme.text} uppercase tracking-wider`}>{title}</p>
                {Icon && (
                    <div className={`p-2.5 rounded-lg ${scheme.lightBg}`}>
                        <Icon size={22} className={`${scheme.iconColor}`} />
                    </div>
                )}
            </div>
            
            {loading && <div className="h-10 w-3/4 bg-gray-200 animate-pulse rounded mt-2 mb-2"></div>}
            {error && !loading && (
                <div className="flex items-center mt-2 text-red-600 bg-red-50 px-3 py-1.5 rounded-lg" title={typeof error === 'string' ? error : error.message}>
                    <AlertCircle size={18} className="mr-2 flex-shrink-0"/>
                    <span className="text-xs font-semibold">Ma'lumot xatosi</span>
                </div>
            )}
            {!loading && !error && (
                <>
                    <p className="text-3xl font-bold text-gray-800 mb-1">{displayValue}</p>
                    {previousValue !== undefined && typeof numericValue === 'number' && !isNaN(numericValue) && (
                        <div className={`flex items-center text-xs font-medium ${trendColor}`}>
                            {trendIcon}
                            <span>{percentageChange !== 0 ? `${Math.abs(percentageChange).toFixed(1)}%` : "O'zgarish yo'q"}</span>
                            <span className="text-gray-500 ml-1">oldingi davrga nisbatan</span>
                        </div>
                    )}
                </>
            )}
            <div className={`absolute bottom-0 left-0 h-1.5 w-full rounded-b-xl bg-gradient-to-r ${scheme.gradientFrom} ${scheme.gradientTo} opacity-75`}></div>
        </div>
    );
};

const StudentTrendChart = ({ data, loading, error, onRetry }) => {
    if (loading) {
        return <div className="h-80 flex items-center justify-center"><LoadingSpinner text="Diagramma yuklanmoqda..." /></div>;
    }
    if (error) { 
        return <div className="h-80 flex items-center justify-center"><ErrorMessage message={typeof error === 'string' ? error : error.message} onRetry={onRetry} /></div>;
    }
    if (!data || data.length === 0) {
        return (
            <div className="h-80 flex flex-col items-center justify-center text-center text-gray-500">
                <Users size={48} className="mb-3 opacity-50" /> 
                <p className="font-semibold">Diagramma uchun ma'lumotlar topilmadi.</p>
                <p className="text-sm">Hisobot davri uchun talabalar soni o'zgarishi mavjud emas.</p>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={342}>
            <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} /> 
                <Tooltip
                    formatter={(value) => [value, "Talabalar"]} 
                    labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                    itemStyle={{ color: '#3b82f6' }} 
                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '0.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '1px solid #e5e7eb' }}
                />
                <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }} />
                <Line 
                    type="monotone" 
                    dataKey="count" 
                    name="Talabalar Soni" 
                    stroke="#3b82f6" 
                    strokeWidth={2.5} 
                    dot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 1 }} 
                    activeDot={{ r: 7, stroke: '#fff', strokeWidth: 2, fill: '#2563eb' }} 
                />
            </LineChart>
        </ResponsiveContainer>
    );
};

const Dashboard = ({ token: initialToken }) => {
    const [token, setToken] = useState(initialToken || localStorage.getItem('authToken'));
    
    const [stats, setStats] = useState({
        studentCount: { current: null, previous: null },
        groupCount: { current: null, previous: null },
        teacherCount: { current: null, previous: null },
        totalPaymentsMonth: { current: null, previous: null },
    });
    const [studentTrendData, setStudentTrendData] = useState([]); 
    
    const [loading, setLoading] = useState({
        counts: true,
        paymentsSum: true,
        studentTrendChart: true, 
    });
    const [error, setError] = useState({
        counts: null,
        paymentsSum: null,
        studentTrendChart: null, 
    });

    const fetchCounts = useCallback(async (currentToken) => {
        setLoading(prev => ({ ...prev, counts: true }));
        setError(prev => ({ ...prev, counts: null }));
        try {
            const result = await apiRequest('/stats/counts', 'GET', null, currentToken);
            setStats(prev => ({
                ...prev,
                studentCount: result?.studentCount ?? prev.studentCount,
                groupCount: result?.groupCount ?? prev.groupCount,
                teacherCount: result?.teacherCount ?? prev.teacherCount,
            }));
        } catch (err) {
            console.error("Error fetching counts:", err);
            setError(prev => ({ ...prev, counts: err.message || "Statistikani yuklashda xatolik." }));
        } finally {
            setLoading(prev => ({ ...prev, counts: false }));
        }
    }, []);

    const fetchRecentPaymentsSum = useCallback(async (currentToken) => {
        setLoading(prev => ({ ...prev, paymentsSum: true }));
        setError(prev => ({ ...prev, paymentsSum: null }));
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const dateFrom = thirtyDaysAgo.toISOString();

            const result = await apiRequest('/stats/payments-sum', 'GET', { dateFrom }, currentToken);
            setStats(prev => ({
                ...prev,
                totalPaymentsMonth: result?.totalSum ?? prev.totalPaymentsMonth,
            }));
        } catch (err) {
            console.error("Error fetching recent payments sum:", err);
            setError(prev => ({ ...prev, paymentsSum: err.message || "Oxirgi tushumni yuklashda xatolik." }));
        } finally {
            setLoading(prev => ({ ...prev, paymentsSum: false }));
        }
    }, []);

    const fetchStudentTrend = useCallback(async (currentToken) => { 
        setLoading(prev => ({ ...prev, studentTrendChart: true }));
        setError(prev => ({ ...prev, studentTrendChart: null }));
        try {
            const result = await apiRequest('/stats/student-trend', 'GET', null, currentToken); 
            if (result && Array.isArray(result.data)) {
                setStudentTrendData(result.data);
            } else {
                setStudentTrendData([]);
                console.warn("Talabalar soni dinamikasi uchun yaroqsiz formatdagi ma'lumot keldi", result);
            }
        } catch (err) {
            console.error("Error fetching student trend:", err);
            setError(prev => ({ ...prev, studentTrendChart: err.message || "Talabalar soni grafigini yuklashda xatolik." }));
            setStudentTrendData([]);
        } finally {
            setLoading(prev => ({ ...prev, studentTrendChart: false }));
        }
    }, []);

    useEffect(() => {
        if (token) {
            fetchCounts(token);
            fetchRecentPaymentsSum(token);
            fetchStudentTrend(token); 
        } else {
            console.warn("API so'rovlari uchun token mavjud emas. Iltimos, tizimga kiring.");
            const authErrorMsg = "Avtorizatsiya uchun token topilmadi.";
            setError({ counts: authErrorMsg, paymentsSum: authErrorMsg, studentTrendChart: authErrorMsg });
            setLoading({ counts: false, paymentsSum: false, studentTrendChart: false });
        }
    }, [token, fetchCounts, fetchRecentPaymentsSum, fetchStudentTrend]); 

    return (
        <div className="p-4 sm:p-6 md:p-8 bg-gray-100"> 
            <header className="mb-8">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Boshqaruv Paneli</h1>
                <p className="text-gray-600 mt-1 text-sm sm:text-base">Markazingiz faoliyati haqida umumiy ma'lumot.</p>
            </header>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <StatCard
                    title="Jami Talabalar"
                    value={stats.studentCount?.current}
                    previousValue={stats.studentCount?.previous}
                    icon={Users}
                    color="blue"
                    loading={loading.counts}
                    error={error.counts}
                />
                <StatCard
                    title="Jami Guruhlar"
                    value={stats.groupCount?.current}
                    previousValue={stats.groupCount?.previous}
                    icon={Group}
                    color="indigo"
                    loading={loading.counts}
                    error={error.counts}
                />
                <StatCard
                    title="Jami O'qituvchilar"
                    value={stats.teacherCount?.current}
                    previousValue={stats.teacherCount?.previous}
                    icon={BookUser}
                    color="purple"
                    loading={loading.counts}
                    error={error.counts}
                />
                <StatCard
                    title="Joriy Davr Tushumi" // Sarlavha o'zgartirildi
                    value={stats.totalPaymentsMonth?.current}
                    previousValue={stats.totalPaymentsMonth?.previous}
                    icon={TrendingUp}
                    color="green"
                    loading={loading.paymentsSum}
                    error={error.paymentsSum}
                    unit="UZS"
                />
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-xl border border-gray-200 mb-10">
                <div className="flex items-center mb-6">
                    <LineChartIcon size={26} className="mr-3 text-blue-600"/> 
                    <h2 className="text-xl sm:text-2xl font-semibold text-gray-700">Talabalar Soni Dinamikasi</h2> 
                </div>
                <StudentTrendChart 
                    data={studentTrendData} 
                    loading={loading.studentTrendChart} 
                    error={error.studentTrendChart}
                    onRetry={() => token ? fetchStudentTrend(token) : console.warn("Qayta urinish uchun token yo'q")}
                />
            </div>
        </div>
    );
};

export default Dashboard;