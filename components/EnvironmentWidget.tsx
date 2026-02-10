import React from 'react';
import { CloudRain, Wind, Sun, Droplets } from 'lucide-react';

interface Props {
  variant: 'student' | 'counselor';
}

const EnvironmentWidget: React.FC<Props> = ({ variant }) => {
  // Mock Data for Mumbai Context
  const envData = {
    temp: 32,
    condition: 'Humid',
    aqi: 145, // Unhealthy
    location: 'Andheri West, Mumbai'
  };

  const getSmartSuggestion = () => {
    if (envData.aqi > 100) return "AQI is high today. Wear a mask if stepping out.";
    if (envData.temp > 35) return "Heatwave alert. Stay hydrated.";
    return "Great weather for a campus walk.";
  };

  if (variant === 'counselor') {
    return (
      <div className="bg-white border-b border-gray-200 px-8 py-2 flex justify-between items-center text-xs text-slate-500">
        <div className="flex gap-4">
           <span className="flex items-center gap-1"><MapPinIcon /> {envData.location}</span>
           <span className="flex items-center gap-1"><Sun size={12}/> {envData.temp}°C</span>
           <span className={`font-bold ${envData.aqi > 100 ? 'text-orange-500' : 'text-green-600'}`}>AQI: {envData.aqi}</span>
        </div>
        <div>{getSmartSuggestion()}</div>
      </div>
    );
  }

  // Student (Neumorphic)
  return (
    <div className="neu-flat p-4 rounded-2xl mb-6 flex items-center justify-between">
      <div>
        <div className="text-xs text-[#708090]/60 uppercase tracking-wider mb-1">{envData.location}</div>
        <div className="flex items-center gap-2">
           <CloudRain className="text-[#8A9A5B]" size={24} />
           <span className="text-2xl font-bold text-[#708090]">{envData.temp}°</span>
        </div>
        <div className="text-xs text-[#CC5500] font-bold mt-1">AQI {envData.aqi} • Unhealthy</div>
      </div>
      <div className="text-right max-w-[50%]">
        <p className="text-xs text-[#708090] italic">"{getSmartSuggestion()}"</p>
      </div>
    </div>
  );
};

const MapPinIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-9 13-9 13s-9-7-9-13a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3"/></svg>
)

export default EnvironmentWidget;