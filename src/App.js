import React, { useState, useEffect } from 'react';
import './App.css';
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { fetchAuthSession } from 'aws-amplify/auth';
import { signInWithRedirect } from 'aws-amplify/auth';
import { signOut } from 'aws-amplify/auth';
import { Amplify } from 'aws-amplify'
import { post, get } from 'aws-amplify/api';
import amplifyconfig from './amplifyconfiguration.json';
import awsExports from './aws-exports';

Amplify.configure(awsExports); // Amplify 초기화
Amplify.configure(amplifyconfig);

const locationIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/854/854878.png", // 위치 아이콘
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

const markers = [
  { id: 1, name: "한국항공대학교", position: [37.6009, 126.8642], umbrellas: 5, }, // umbrellas - 대여 가능 우산 개수
  { id: 2, name: "광화문", position: [37.5759, 126.9769], umbrellas: 3, },
  { id: 3, name: "여의도", position: [37.5240, 126.9269], umbrellas: 4, },
  { id: 4, name: "홍대입구역", position: [37.5561, 126.9236], umbrellas: 2, },
];

function App() {
    const [currentPage, setCurrentPage] = useState("map");
    const [weather, setWeather] = useState(null);
    const [city, setCity] = useState('');
    const [userInfo, setUserInfo] = useState(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const [location, setLocation] = useState({ lat: null, lon: null });
    const [error, setError] = useState(null);
    const [selectedLocation, setSelectedLocation] = useState(null);

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
            path: `/userinfo/object/${userInfo.sub}`,
        });
        const { body } = await restOperation.response;
        const response = await body.json();

        // 응답이 비어있거나 예상치 못한 형식일 경우를 대비한 예외 처리
        if (!response || typeof response !== 'object') {
            throw new Error('Invalid response format');
        }

        // 기본값을 설정하여 속성이 없는 경우에도 안전하게 처리
        const Bcnt = response.Bcnt ?? 0;
        const Bcurrent = response.Bcurrent ?? false;
        const TTL = response.TTL ?? 0;
        
        setUserInfo(prevUserInfo => ({
            ...prevUserInfo,
            Bcnt: typeof Bcnt === 'number' ? Bcnt : 0,
            Bcurrent: typeof Bcurrent === 'boolean' ? Bcurrent : false,
            TTL: typeof TTL === 'number' ? TTL : 0,
            isLoaded: true  //로딩 완료여부 플래그
        }));
        
        console.log('GET call succeeded');
        console.log(response);
        } catch (e) {
            console.log('GET call failed: ', e.response ? JSON.parse(e.response.body) : e);
        }
    }
    /* 대여하기 버튼 클릭시 */
    const handleBorrowClick = () => {
          // 1차적으로 대여 확인 창 띄우기
          const isConfirmed = window.confirm(`${selectedLocation.name} 위치에서 우산을 대여하시겠습니까?`);
          if (!isConfirmed) {
              return; // 취소시 창 종료
          }
          // 첫 번째 잠금 해제 진행 코드 작성 부분
          // 2차적으로 결제 요청 창 띄우기
          const isPaymentConfirmed = window.confirm("결제를 진행해주세요!");
          if (!isPaymentConfirmed) {
              return; // 취소시 창 종료
          }
          // 두 번째 잠금 해제 진행 코드 작성 부분
          // 최종적으로 대여 완료 메시지 띄우기
          alert("우산이 3일간 대여되었습니다!");
          // 초기 상태로 돌아가기
          setSelectedLocation(null);
          setCurrentPage("map");
      };

    /* 반납하기 버튼 클릭시 */
      const handleReturnClick = () => {
        const isClickedReturn = window.confirm(`${selectedLocation.name} 위치에서 우산을 반납하시겠습니까?`);
        if(!isClickedReturn) return
        alert("잠금이 해제되었습니다. 우산을 올바른 위치에 반납해주세요.");
      };

    /* 대여 연장하기 버튼 클릭시 */
      const handleExtendBorrowClick = () => {
         const isClicked = window.confirm(`대여기간을 연장하시겠습니까?`);
               if (!isClicked) return;
         // 대여 기간 연장 코드 작성 부분
         alert("우산 대여 기간이 1일 연장되었습니다.");
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

    /* 선택된 위치 저장 후 상세 페이지 이동 */
    const handleLocationSelect = (marker) => {
      setSelectedLocation(marker);
      setCurrentPage("details");
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

                    setUserInfo({
                       email,
                       sub
                    });
                    /*console.log('origin_sub:', sub);
                    console.log('origin_email:', email);
                    console.log('sub:', userInfo.sub);
                    console.log('email:', userInfo.email);*/
                }
              //console.log('access_token:', accessToken)
              //console.log('id_token:', idToken)
            } catch (err) {
              console.log('Error fetching user:', err);
            }
        }
        
        const fetchWeather = async () => {
            const apiKey = process.env.REACT_APP_WEATHER_API_KEY;
            const city = 'Seoul';
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
        
        handleLogin();
        fetchUser();
        fetchWeather();
    }, []);

    const toggleProfile = () => {
            setIsProfileOpen((prevState) => !prevState);
    };

    /* 지도 화면 렌더링 */
        const renderMapPage = () => (
          <div>
            <h1 style={{ color: "#527394", fontSize: "1.8rem", marginBottom: "10px" }}>
              무인 우산 대여 서비스
            </h1>
            <h2 style={{ color: "#6ca7ae", fontSize: "1rem", marginBottom: "10px" }}>
              우산이 필요하신가요? 편하게 우산을 빌려보세요
            </h2>
            <h3 style={{ color: "#6ca7ae", fontSize: "1.2rem", marginBottom: "20px" }}>
              대여하실 우산함 위치를 클릭해주세요
            </h3>
            <MapContainer
              center={[37.5665, 126.9780]} // 서울 중심 좌표
              zoom={12}
              style={{ height: "500px", width: "100%" }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {markers.map((marker) => (
                <Marker
                  key={marker.id}
                  position={marker.position}
                  icon={locationIcon}
                >
                  <Popup>
                    <p>대여 가능한 위치: {marker.name}</p>
                    <p>대여 가능 우산 개수: {marker.umbrellas}</p>
                    <button
                       onClick={() => handleLocationSelect(marker)} // 선택된 위치 저장
                       style={{
                       padding: "5px 10px",
                       backgroundColor: "#6ca7ae",
                       color: "white",
                       border: "none",
                       borderRadius: "5px",
                       cursor: "pointer",
                      }}
                    >
                      대여하기
                    </button>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        );

      const renderDetailsPage = () => (
          <div className="App">
            {/* 프로필 버튼 */}
            <button className="profile-button" onClick={toggleProfile}></button>

            <h1 className="title">무인 우산 대여 서비스</h1>
            <p className="description">우산이 필요하신가요? 편하게 우산을 빌려보세요.</p>

            {/* 실시간 날씨 정보 출력 */}
            {weather && weather.main && weather.weather && (
              <div className="weather-info">
                <h2>{selectedLocation
                          ? `선택된 위치: ${selectedLocation.name}`
                          : "위치를 선택하세요."}</h2>
                <div className="weather-details">
                  <p>현재 온도: {weather.main.temp}°C</p>
                  <p>현재 날씨: {weather.weather[0].description}</p>
                  <p>습도: {weather.main.humidity}%</p>
                  <p>압력: {weather.main.pressure} hPa</p>
                  {weather.rain && weather.rain["1h"] && (
                    <p>최근 1시간 강수량: {weather.rain["1h"]} mm</p>
                  )}
                </div>
              </div>
            )}
            <div className="button-grid">
              <button onClick={handleBorrowClick}>대여하기</button>
              <button onClick={handleReturnClick}>반납하기</button>
              <button onClick={handleOpenInstructions}>사용 방법</button>
              <button onClick={handleExtendBorrowClick}>대여 연장하기</button>
            </div>
            <div className={`profile-slide ${isProfileOpen ? "open" : ""}`}>
              <h2>프로필 정보</h2>
              <h2> 이메일 : {userInfo?.email ? userInfo.email : '이메일을 불러오는 중...'}</h2>
              <p>총 대여 횟수: {userInfo?.Bcnt !== undefined ? `${userInfo.Bcnt}회` : '대여 횟수 불러오는 중...'}</p>
              <p>남은 대여 기간: 3일</p>
              <div className="profile-buttons">
                <button onClick={toggleProfile}>닫기</button>
                <button onClick={() => {
                    const confirmLogout = window.confirm("로그아웃 하시겠습니까?");
                    if (confirmLogout) {
                      alert("로그아웃 되었습니다!");
                      handleLogout();
                    }
                  }}
                >
                  로그아웃
                </button>
                <button
                    onClick={() => {
                    setCurrentPage("map");
                    setIsProfileOpen(false); // 프로필 슬라이드 닫기
                    }}
                    style={{
                       marginTop: "10px",
                       padding: "10px",
                       backgroundColor: "#527394",
                       color: "white",
                       border: "none",
                       borderRadius: "5px",
                       cursor: "pointer",
                     }}
                    >
                      다른 우산함 선택
                 </button>
              </div>
            </div>
          </div>
            );
    
    useEffect(() => {
        /*
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
        }*/

        if (userInfo?.sub && !userInfo?.isLoaded) {
          console.log('sub:', userInfo.sub);
          console.log('email:', userInfo.email);
          getinfowtempl();
        }
      }, [userInfo?.sub, userInfo?.isLoaded]);
      console.log('Bcnt debug: ', userInfo?.Bcnt);
      console.log('Bcurrent debug: ', userInfo?.Bcurrent);
      console.log('TTL debug: ', userInfo?.TTL);
      console.log('Flag debug: ', userInfo?.isLoaded);

    return (
              <div className="App">
                {currentPage === "map" && renderMapPage()}
                {currentPage === "details" && renderDetailsPage()}
              </div>
          );
        }
export default App;