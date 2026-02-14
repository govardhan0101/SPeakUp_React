import { WeatherData } from '../types';

// WMO Weather interpretation codes mapping to simplified conditions for icons
const WMO_CODES: { [key: number]: string } = {
    0: 'Clear',
    1: 'Clear',
    2: 'Clouds',
    3: 'Clouds',
    45: 'Fog',
    48: 'Fog',
    51: 'Rain', 53: 'Rain', 55: 'Rain',
    56: 'Rain', 57: 'Rain',
    61: 'Rain', 63: 'Rain', 65: 'Rain',
    66: 'Rain', 67: 'Rain',
    71: 'Snow', 73: 'Snow', 75: 'Snow',
    77: 'Snow',
    80: 'Rain', 81: 'Rain', 82: 'Rain',
    85: 'Snow', 86: 'Snow',
    95: 'Rain', 96: 'Rain', 99: 'Rain',
};

// Function to convert API AQI value to a 1-5 level used by the UI
const getAqiLevel = (aqi: number): number => {
    if (aqi <= 50) return 1; // Good
    if (aqi > 50 && aqi <= 100) return 2; // Fair
    if (aqi > 100 && aqi <= 150) return 3; // Moderate
    if (aqi > 150 && aqi <= 200) return 4; // Poor
    if (aqi > 200) return 5; // Very Poor
    return 3; // Default
};

export const getWeatherData = async (lat: number, lon: number): Promise<WeatherData> => {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
    const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`;
    const locationUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;

    try {
        const [weatherRes, aqiRes, locationRes] = await Promise.all([
            fetch(weatherUrl),
            fetch(aqiUrl),
            fetch(locationUrl),
        ]);

        if (!weatherRes.ok || !aqiRes.ok || !locationRes.ok) {
            console.error('Weather API fetch failed:', { 
                weather: weatherRes.status, 
                aqi: aqiRes.status,
                location: locationRes.status,
            });
            throw new Error('Failed to fetch environmental data from one or more sources.');
        }

        const weatherData = await weatherRes.json();
        const aqiData = await aqiRes.json();
        const locationData = await locationRes.json();
        
        const locationName = `${locationData.address.suburb || locationData.address.city_district || locationData.address.city || 'Unknown'}, ${locationData.address.state}`;
        
        return {
            location: locationName.toUpperCase(),
            temp: Math.round(weatherData.current_weather.temperature),
            condition: WMO_CODES[weatherData.current_weather.weathercode as keyof typeof WMO_CODES] || 'Clear',
            aqi: getAqiLevel(aqiData.current.us_aqi),
        };
    } catch (error) {
        console.error("Error in getWeatherData:", error);
        throw error; // Re-throw the error to be caught by the component
    }
};
