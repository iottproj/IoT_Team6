import React, { useState, useEffect } from 'react';
import './App.css';
import { fetchAuthSession } from 'aws-amplify/auth';
import { signInWithRedirect } from 'aws-amplify/auth';
import { signOut } from 'aws-amplify/auth';
import { Amplify } from 'aws-amplify'
import { post, get } from 'aws-amplify/api';
import amplifyconfig from './amplifyconfiguration.json';
import awsExports from './aws-exports';

Amplify.configure(awsExports); // Amplify 초기화
Amplify.configure(amplifyconfig);

function App() {
    const [umbrellaNumber, setUmbrellaNumber] = useState(null);
    const [weather, setWeather] = useState(null);
    const [city, setCity] = useState('');
    const [userInfo, setUserInfo] = useState(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false)
     

    async function handleLogout() {
        try {
            await signOut();
            console.log('Logged out successfully');
        } catch (error) {
            console.error('Error during logout:', error);
        }
    }
    /*
    async function getinfo() {
        try {
          const restOperation = get({
            apiName: 'UserInfoAPI',
            path: '/getuserinfo',
        });
        const { body } = await restOperation.response;
        const response = await body.json();
        setUserInfo(prevUserInfo => {
            const userInfoData = response["UserInfo"];
            return {
                ...prevUserInfo,
                Bcnt: userInfoData.Bcnt ? parseInt(userInfoData.Bcnt.N) : 0,
                Bcurrent: userInfoData.Bcurrent ? userInfoData.Bcurrent.BOOL : false,
                userId: userInfoData.userId ? userInfoData.userId.S : '',
                TTL: userInfoData.TTL ? parseInt(userInfoData.TTL.S) : 0
            };
        });

        console.log('GET call succeeded');
        console.log(response);
        } catch (e) {
            console.log('GET call failed: ', e.response ? e.response.body : e);
        }
    }
    */
    async function getinfowtempl() {
        try {
          const restOperation = get({
            apiName: 'UserInfoAPI',
            path: '/userinfo/' + userInfo.sub,
        });
        const { body } = await restOperation.response;
        const response = await body.json();
        setUserInfo(prevUserInfo => {
            const userInfoData = response["UserInfo"];
            return {
                ...prevUserInfo,
                Bcnt: userInfoData.Bcnt ? parseInt(userInfoData.Bcnt.N) : 0,
                Bcurrent: userInfoData.Bcurrent ? userInfoData.Bcurrent.BOOL : false,
                userId: userInfoData.userId ? userInfoData.userId.S : '',
                TTL: userInfoData.TTL ? parseInt(userInfoData.TTL.S) : 0
            };
        });

        console.log('GET call succeeded');
        console.log(response);
        } catch (e) {
            console.log('GET call failed: ', e.response ? e.response.body : e);
        }
    }

    async function postinfo() {
        try {
          const restOperation = post({
            apiName: 'UserInfoAPI',
            path: '/getuserinfo',
            options: {
              body: {
                sub: userInfo.sub,
                email: userInfo.email
              }
            }
        });

        const { body } = await restOperation.response;
        const response = await body.json();
        setUserInfo(prevUserInfo => {
            const userInfoData = response["UserInfo"];
            return {
                ...prevUserInfo,
                Bcnt: userInfoData.Bcnt ? parseInt(userInfoData.Bcnt.N) : 0,
                Bcurrent: userInfoData.Bcurrent ? userInfoData.Bcurrent.BOOL : false,
                userId: userInfoData.userId ? userInfoData.userId.S : '',
                TTL: userInfoData.TTL ? parseInt(userInfoData.TTL.S) : 0
            };
        });

        console.log('POST call succeeded');
        console.log(response);
        } catch (e) {
            console.log('POST call failed: ', e.response ? e.response.body : e);
        }
    }

    /* 우산 번호 클릭시 */
    const handleButtonClick = (number) => {
        setUmbrellaNumber(number);
    };

    /* 대여하기 버튼 클릭시 */
    const handleBorrowClick = () => {
        if (umbrellaNumber) {
            alert(`${umbrellaNumber}번 우산 대여 성공!`);
        } else {
            alert('우산 번호를 선택해주세요.');
        }
    };

    /* 반납하기 버튼 클릭시 */
    const handleReturnClick = () => {
        if (umbrellaNumber) {
            alert(`${umbrellaNumber}번 우산 반납 성공!`);
        } else {
            alert('우산 번호를 선택해주세요.');
        }
    };

    /* 대여 연장하기 버튼 클릭시 */
    const handleExtendBorrowClick = () => {
        if (umbrellaNumber) {
            alert(`${umbrellaNumber}번 우산 대여가 1일 연장되었습니다.`);
        } else {
            alert('우산 번호를 선택해주세요.');
        }
    };

    /* 사용방법 버튼 클릭시 새로운 윈도우 생성 */
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
                    <p>1. 우산 번호를 선택하세요.</p>
                    <p>2. "대여하기" 버튼을 클릭하여 우산을 대여하세요. 우산 대여 기간은 3일입니다.</p>
                    <p>3.. 우산을 반납하려면 "반납하기" 버튼을 클릭하여 우산을 반납하세요. 반드시 올바른 번호에 우산을 넣어주세요!</p>
                    <p># 만약 우산 대여 기간을 연장하고 싶다면 우산 번호를 누르고 "대여 연장하기" 버튼을 눌러주세요!</p>
                    <p> → 대여 연장기간은 "1일" 입니다. </p>
                    <button onclick="window.close()">닫기</button>
                </body>
            </html>
        `);
    };

    /* 날씨 정보 실시간 반영 */
    useEffect(() => {
        async function handleLogin() {
            try {
              await signInWithRedirect(); // Hosted UI로 리디렉션
            } catch (error) {
              console.error('Error during login:', error);
            }
        }
        const fetchUser = async () => {
            try {
              const {accessToken, idToken} = (await fetchAuthSession()).tokens ?? {};
              if (idToken) {
                   const email = idToken?.payload?.email.toString(); // 이메일 추출
                   const sub = idToken?.payload?.sub.toString();
                   //console.log('sub :', sub);

                    await setUserInfo({
                       email,
                       sub
                    });
            }
            await postinfo();
              console.log('대여횟수:', userInfo.Bcnt)
              //console.log('access_token:', accessToken)
              //console.log('id_token:', idToken)
            } catch (err) {
              console.log('Error fetching user:', err);
            }
        }
        
        const fetchWeather = async () => {
            const apiKey = process.env.REACT_APP_WEATHER_API_KEY;
            const city = 'Gyeonggi-do';
            const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=kr`;

            try {
                const response = await fetch(url);
                const data = await response.json();
                console.log("Weather data:", data);

                if (data.main && data.weather) {
                    setWeather(data);
                    handleCityName(data.name);
                } else {
                    console.error("날씨 데이터를 찾을 수 없습니다:", data);
                }
            } catch (error) {
                console.error('날씨 정보를 불러오는 중 오류가 발생했습니다:', error);
            }
        };
        
        handleLogin();
        fetchUser();
        fetchWeather();
        
        
    }, []);

    /* 도시 이름 한글 출력 */
    const handleCityName = (cityName) => {
        if (cityName === 'Gyeonggi-do') {
            setCity('경기도');
        } else if (cityName === 'Seoul') {
            setCity('서울');
        } else {
            setCity(cityName);
        }
    };

    const toggleProfile = () => {
            setIsProfileOpen((prevState) => !prevState);
    };

    return (
        <div className="App">
            {/* 프로필 버튼 */}
            <button className="profile-button" onClick={toggleProfile}></button>

            <h1 className="title">무인 우산 대여 서비스</h1>
            <p className="description">우산이 필요하신가요? 편하게 우산을 빌려보세요.</p>

            {/* 실시간 날씨 정보 출력 */}
            {weather && weather.main && weather.weather && (
                <div className="weather-info">
                    <h2>위치: {city}</h2>
                    <div className="weather-details">
                        <p>현재 온도: {weather.main.temp}°C</p>
                        <p>현재 날씨: {weather.weather[0].description}</p>
                        <p>습도: {weather.main.humidity}%</p>
                        <p>압력: {weather.main.pressure} hPa</p>
                        {weather.rain && weather.rain['1h'] && (
                          <p>최근 1시간 강수량: {weather.rain['1h']} mm</p>
                        )}
                    </div>
                </div>
            )}
            {/* 우산 번호 버튼 */}
            <div className="umbrella-buttons">
                {Array.from({ length: 20 }, (_, index) => (
                    <button
                        key={index + 1}
                        className={`umbrella-button ${umbrellaNumber === index + 1 ? 'selected' : ''}`}
                        onClick={() => handleButtonClick(index + 1)}
                    >
                        {index + 1}
                    </button>
                ))}
            </div>

            <div className="button-grid">
                <button onClick={handleBorrowClick}>대여하기</button>
                <button onClick={handleReturnClick}>반납하기</button>
                <button onClick={handleOpenInstructions}>사용 방법</button>
                <button onClick={handleExtendBorrowClick}>대여 연장하기</button>
            </div>
            <div className={`profile-slide ${isProfileOpen ? 'open' : ''}`}>
                <h2>프로필 정보</h2>
                <h2> 이메일 : {userInfo.email ? userInfo.email : '이메일을 불러오는 중...'}</h2>
                <p>총 대여 횟수: {userInfo.Bcnt ? `${userInfo.Bcnt}회` : '대여 횟수 불러오는 중...'}</p>
                 <div className="profile-buttons">
                       <button onClick={toggleProfile}>닫기</button>
                        <button onClick={() => {
                          const confirmLogout = window.confirm('로그아웃 하시겠습니까?');
                          if (confirmLogout) {
                               alert('로그아웃 되었습니다!');
                               handleLogout();
                               //toggleProfile(); // 로그아웃 후 슬라이드 닫기
                          }
                      }}>
                           로그아웃
                     </button>
                </div>
            </div>
        </div>
    );
}

export default App;