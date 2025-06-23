import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import LoadingSpinner from './LoadingSpinner'; 
import ErrorMessage from './ErrorMessage';
import { formatCurrency, formatDDMMYYYY } from '../../utils/helpers';

const MonthlyIncomeChart = ({ data, loading, error }) => {

    if (loading) {
        return (
            <div className="h-96 flex items-center justify-center bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <LoadingSpinner />
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-96 flex items-center justify-center bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <ErrorMessage message={error} />
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="h-96 flex items-center justify-center bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <p className="text-gray-500 italic">Diagramma uchun ma'lumotlar yo'q.</p>
            </div>
        );
    }

    const chartData = data.map(item => ({
        ...item,
        formattedDate: formatDDMMYYYY(item.date),
        amount: parseFloat(item.amount) 
    }));


    return (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-gray-200 animate-fadeIn">
            <h2 className="text-xl font-semibold text-gray-700 mb-6">
                Oxirgi 30 Kunlik Tushumlar Diagrammasi
            </h2>
            <div style={{ width: '100%', height: 400 }}> 
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        margin={{
                            top: 5,
                            right: 20, 
                            left: 50,  
                            bottom: 50, 
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis
                            dataKey="formattedDate"
                            angle={-45} 
                            textAnchor="end" 
                            height={70} 
                            interval={Math.floor(data.length / 10)}
                            tick={{ fontSize: 10, fill: '#6b7280' }}
                        />
                        <YAxis
                            tickFormatter={(value) => formatCurrency(value, '')} 
                            tick={{ fontSize: 10, fill: '#6b7280' }}
                            label={{ value: 'Summa (UZS)', angle: -90, position: 'insideLeft', offset: -40, fill: '#6b7280', fontSize: 12 }}
                        />
                        <Tooltip
                            formatter={(value, name, props) => [formatCurrency(props.payload.amount), "Summa"]}
                            labelFormatter={(label) => `Sana: ${label}`} 
                            contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                borderRadius: '8px',
                                borderColor: '#cbd5e1',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                            }}
                            itemStyle={{ color: '#1e40af' }}
                            labelStyle={{ color: '#334155', fontWeight: 'bold' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} formatter={(value) => <span style={{color: '#334155'}}>{value}</span>} />
                        <Bar dataKey="amount" name="Kunlik Tushum" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default MonthlyIncomeChart;
