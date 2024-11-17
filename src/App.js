import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
    const [umbrellaNumber, setUmbrellaNumber] = useState('');
    const [weather, setWeather] = useState(null);

    /* 우산 번호 입력 */
    const handleInputChange = (e) => {
        setUmbrellaNumber(e.target.value);
    };

    /* 대여하기 버튼 클릭시 */
    const handleBorrowClick = () => {
        alert(`${umbrellaNumber}번 우산 대여 성공!`);
    };

    /* 반납하기 버튼 클릭시 */
    const handleReturnClick = () => {
        alert(`${umbrellaNumber}번 우산 반납 성공!`);
    };

    /* 사용방법 버튼 클릭시 */
    const handleOpenInstructions = () => {
        const instructionsWindow = window.open('', '사용 방법', 'width=600,height=400');
        instructionsWindow.document.write(`
            <html>
                <head>
                    <title>사용 방법</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            text-align: center;
                            padding: 20px;
                            background-color: rgb(234, 238, 236);
                        }
                        button {
                            padding: 10px 20px;
                            font-size: 1rem;
                            background-color: rgb(108, 167, 174);
                            color: white;
                            border: none;
                            border-radius: 5px;
                            cursor: pointer;
                            margin-top: 20px;
                        }
                        button:hover {
                            background-color: rgb(72, 105, 138);
                        }
                    </style>
                </head>
                <body>
                    <h1>사용 방법</h1>
                    <p>1. 우산 번호를 입력하세요.</p>
                    <p>2. "대여하기" 버튼을 클릭하여 우산을 대여하세요.</p>
                    <p>3. "반납하기" 버튼을 클릭하여 우산을 반납하세요.</p>
                    <button onclick="window.close()">닫기</button>
                </body>
            </html>
        `);
    };
    /* 날씨 정보 실시간 반영 */
    useEffect(() => {
        const fetchWeather = async () => {
            const apiKey = ''; /* a98b26edd468647adf7c0ebc00f85e11 */
            const city = 'Gyeonggi-do';
            const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=kr`;

            try {
                const response = await fetch(url);
                const data = await response.json();
                console.log("Weather data:", data);

                if (data.main && data.weather) {
                    setWeather(data);
                } else {
                    console.error("날씨 데이터를 찾을 수 없습니다:", data);
                }
            } catch (error) {
                console.error('날씨 정보를 불러오는 중 오류가 발생했습니다:', error);
            }
        };

        fetchWeather();
    }, []);

    return (
        <div className="App">
            <button className="instruction-button" onClick={handleOpenInstructions}>사용 방법</button>

            <h1 className="title">무인 우산 대여 시스템</h1>
            <p className="description">우산이 필요하신가요? 편하게 우산을 빌려보세요.</p>

            {/* 실시간 날씨 정보 출력 */}
            {weather && weather.main && weather.weather && (
                <div className="weather-info">
                    <h2>현재 날씨: {weather.name}</h2>
                    <p>온도: {weather.main.temp}°C</p>
                    <p>날씨: {weather.weather[0].description}</p>
                </div>
            )}

            <div className="borrow-section">
                <input
                    type="text"
                    className="umbrella-input"
                    placeholder="우산 번호를 입력하세요"
                    value={umbrellaNumber}
                    onChange={handleInputChange}
                />
                <div className="button-group">
                    <button className="borrow-button" onClick={handleBorrowClick}>대여하기</button>
                    <button className="return-button" onClick={handleReturnClick}>반납하기</button>
                </div>
            </div>
        </div>
    );
}

export default App;